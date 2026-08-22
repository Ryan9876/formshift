import type { SpatialSnapshot } from '@formshift/domain';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { createDepthProvider } from '../scene/providers/DepthAnythingV2Small.web';
import { createQuickCleanBackground, loadPreparedSource, sampleDepth } from '../prepared/imageOps.web';
import { createObjectDiscoveryProvider } from '../prepared/providers/DetrObjectDiscovery.web';
import { segmentPreparedObject } from '../prepared/providers/MediaPipePreparedSegmenter.web';
import type { ObjectDetectionCandidate, PreparedObjectMobility, PreparedSceneObject, PreparedSupportKind } from '../prepared/types';
import { tokens } from '../theme/tokens';

type Props = {
  photoUrl?: string | null;
  snapshot: SpatialSnapshot;
  projectId?: string;
  spaceId?: string;
};

type Phase = 'idle' | 'loading' | 'discovering' | 'segmenting' | 'cleaning' | 'ready' | 'error';
type DragSession = { objectId: string; pointerId: number; clientX: number; clientY: number; startX: number; startY: number };
type DetectorInfo = { provider: string; model: string; modelVersion: string; processingMs: number } | null;
type DepthInfo = { provider: string; model: string; modelVersion: string; processingMs: number } | null;
type NormalizedPoint = { x: number; y: number };

const MAX_AUTOMATIC_OBJECTS = 14;
const IGNORED_LABELS = new Set(['person', 'cat', 'dog', 'bird', 'horse', 'sheep', 'cow', 'elephant', 'bear', 'zebra', 'giraffe']);
const FIXED_LABELS = new Set(['toilet', 'sink', 'oven']);
const SURFACE_LABELS = new Set(['dining table']);
const FLOOR_LABELS = new Set(['chair', 'couch', 'bed', 'suitcase', 'potted plant', 'refrigerator']);
const WALL_LABELS = new Set(['tv', 'clock']);
const ROOM_SWEEP_SEEDS: NormalizedPoint[] = [
  { x: 0.16, y: 0.22 }, { x: 0.38, y: 0.22 }, { x: 0.62, y: 0.22 }, { x: 0.84, y: 0.22 },
  { x: 0.16, y: 0.48 }, { x: 0.38, y: 0.48 }, { x: 0.62, y: 0.48 }, { x: 0.84, y: 0.48 },
  { x: 0.16, y: 0.74 }, { x: 0.38, y: 0.74 }, { x: 0.62, y: 0.74 }, { x: 0.84, y: 0.74 },
];

export function PreparedSceneEditor({ photoUrl }: Props) {
  const stageRef = useRef<HTMLDivElement | null>(null);
  const sourceCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const maskValuesRef = useRef(new Map<string, Uint8ClampedArray>());
  const dragRef = useRef<DragSession | null>(null);
  const generationRef = useRef(0);

  const [phase, setPhase] = useState<Phase>('idle');
  const [status, setStatus] = useState('Waiting for a room photo.');
  const [progress, setProgress] = useState({ complete: 0, total: 0 });
  const [objects, setObjects] = useState<PreparedSceneObject[]>([]);
  const [cleanBackground, setCleanBackground] = useState<string | null>(null);
  const [sourcePreview, setSourcePreview] = useState<string | null>(photoUrl ?? null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [addMode, setAddMode] = useState(false);
  const [showCleanPlate, setShowCleanPlate] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detectorInfo, setDetectorInfo] = useState<DetectorInfo>(null);
  const [depthInfo, setDepthInfo] = useState<DepthInfo>(null);
  const [ignoredCount, setIgnoredCount] = useState(0);
  const [sweepCount, setSweepCount] = useState(0);

  const selected = useMemo(() => objects.find((object) => object.id === selectedId) ?? null, [objects, selectedId]);

  useEffect(() => {
    const onMove = (event: PointerEvent) => {
      const drag = dragRef.current;
      const stage = stageRef.current;
      if (!drag || event.pointerId !== drag.pointerId || !stage) return;
      if (event.cancelable) event.preventDefault();
      const rect = stage.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      const nextX = clamp(drag.startX + (event.clientX - drag.clientX) / rect.width, 0.01, 0.99);
      const nextY = clamp(drag.startY + (event.clientY - drag.clientY) / rect.height, 0.01, 0.99);
      setObjects((current) => current.map((object) => object.id === drag.objectId ? { ...object, position: { x: nextX, y: nextY } } : object));
    };
    const onEnd = (event: PointerEvent) => {
      if (dragRef.current?.pointerId === event.pointerId) dragRef.current = null;
    };
    const blockScroll = (event: TouchEvent) => {
      if (dragRef.current && event.cancelable) event.preventDefault();
    };
    window.addEventListener('pointermove', onMove, true);
    window.addEventListener('pointerup', onEnd, true);
    window.addEventListener('pointercancel', onEnd, true);
    document.addEventListener('touchmove', blockScroll, { capture: true, passive: false });
    return () => {
      window.removeEventListener('pointermove', onMove, true);
      window.removeEventListener('pointerup', onEnd, true);
      window.removeEventListener('pointercancel', onEnd, true);
      document.removeEventListener('touchmove', blockScroll, true);
    };
  }, []);

  useEffect(() => {
    const generation = generationRef.current + 1;
    generationRef.current = generation;
    maskValuesRef.current.clear();
    dragRef.current = null;
    setObjects([]);
    setSelectedId(null);
    setCleanBackground(null);
    setSourcePreview(photoUrl ?? null);
    setDetectorInfo(null);
    setDepthInfo(null);
    setIgnoredCount(0);
    setSweepCount(0);
    setError(null);
    setAddMode(false);
    setShowCleanPlate(false);

    if (!photoUrl) {
      setPhase('idle');
      setStatus('Capture or load a room photo first.');
      return;
    }

    void prepare(photoUrl, generation);
    return () => { if (generationRef.current === generation) generationRef.current += 1; };
  }, [photoUrl]);

  async function prepare(url: string, generation: number) {
    try {
      setPhase('loading');
      setStatus('Photo ready. Preparing the room locally…');
      const source = await loadPreparedSource(url);
      if (generationRef.current !== generation) return;
      sourceCanvasRef.current = source.canvas;
      setSourcePreview(source.canvas.toDataURL('image/jpeg', 0.92));

      setPhase('discovering');
      setStatus('Finding moveable objects…');
      let chosen: ObjectDetectionCandidate[] = [];
      try {
        const discovery = await createObjectDiscoveryProvider().discover(url);
        if (generationRef.current !== generation) return;
        setDetectorInfo({ provider: discovery.provider, model: discovery.model, modelVersion: discovery.modelVersion, processingMs: discovery.processingMs });
        chosen = chooseCandidates(discovery.candidates, source.originalWidth, source.originalHeight);
        setIgnoredCount(Math.max(0, discovery.candidates.length - chosen.length));
      } catch {
        if (generationRef.current !== generation) return;
        setDetectorInfo(null);
        setIgnoredCount(0);
        setStatus('Object labels are unavailable on this device. Scanning room shapes instead…');
      }
      setProgress({ complete: 0, total: chosen.length + ROOM_SWEEP_SEEDS.length });

      setPhase('segmenting');
      const prepared: PreparedSceneObject[] = [];
      let completed = 0;

      for (let index = 0; index < chosen.length; index += 1) {
        if (generationRef.current !== generation) return;
        const candidate = chosen[index]!;
        setStatus(`Preparing ${candidate.label} · ${index + 1} of ${chosen.length}`);
        const seed = {
          x: clamp(((candidate.box.xmin + candidate.box.xmax) / 2) / Math.max(source.originalWidth, 1), 0, 1),
          y: clamp(((candidate.box.ymin + candidate.box.ymax) / 2) / Math.max(source.originalHeight, 1), 0, 1),
        };
        try {
          const segment = await segmentPreparedObject(source.canvas, seed);
          if (segment && segment.bbox.width * segment.bbox.height <= 0.62 && !overlapsPrepared(segment.bbox, prepared, 0.74)) {
            const id = crypto.randomUUID();
            maskValuesRef.current.set(id, segment.maskValues);
            const semantics = classify(candidate.label);
            prepared.push({
              id,
              label: candidate.label,
              detectionScore: candidate.score,
              mobility: semantics.mobility,
              expectedSupport: semantics.support,
              bbox: segment.bbox,
              maskDataUrl: segment.maskDataUrl,
              cutoutDataUrl: segment.cutoutDataUrl,
              position: { x: segment.centerX, y: segment.centerY },
              scale: 1,
              rotationDeg: 0,
              source: 'automatic',
            });
            setObjects([...prepared]);
          }
        } catch {
          // One weak detector candidate must not stop room preparation.
        }
        completed += 1;
        setProgress({ complete: completed, total: chosen.length + ROOM_SWEEP_SEEDS.length });
      }

      let supplemental = 0;
      for (let index = 0; index < ROOM_SWEEP_SEEDS.length && prepared.length < MAX_AUTOMATIC_OBJECTS; index += 1) {
        if (generationRef.current !== generation) return;
        const seed = ROOM_SWEEP_SEEDS[index]!;
        completed += 1;
        setProgress({ complete: completed, total: chosen.length + ROOM_SWEEP_SEEDS.length });
        if (seedCovered(seed, maskValuesRef.current, source.canvas.width, source.canvas.height)) continue;
        setStatus(`Scanning remaining room areas · ${index + 1} of ${ROOM_SWEEP_SEEDS.length}`);
        try {
          const segment = await segmentPreparedObject(source.canvas, seed);
          const area = segment ? segment.bbox.width * segment.bbox.height : 1;
          if (!segment || area < 0.0015 || area > 0.2 || overlapsPrepared(segment.bbox, prepared, 0.52)) continue;
          const id = crypto.randomUUID();
          maskValuesRef.current.set(id, segment.maskValues);
          prepared.push({
            id,
            label: 'object',
            detectionScore: 0.5,
            mobility: 'movable',
            expectedSupport: 'unknown',
            bbox: segment.bbox,
            maskDataUrl: segment.maskDataUrl,
            cutoutDataUrl: segment.cutoutDataUrl,
            position: { x: segment.centerX, y: segment.centerY },
            scale: 1,
            rotationDeg: 0,
            source: 'automatic',
          });
          supplemental += 1;
          setObjects([...prepared]);
        } catch {
          // The sweep is opportunistic; uncertain regions are left for manual correction.
        }
      }
      setSweepCount(supplemental);

      if (generationRef.current !== generation) return;
      setPhase('cleaning');
      setStatus('Building one shared clean background plate…');
      const clean = createQuickCleanBackground(source.canvas, [...maskValuesRef.current.values()]);
      if (generationRef.current !== generation) return;
      setCleanBackground(clean);
      setPhase('ready');
      setStatus(prepared.length ? `${prepared.length} objects ready. Tap any prepared object and move it.` : 'No reliable automatic objects were found. Use Add missed object to teach this room.');

      void enrichDepth(url, generation);
    } catch (cause) {
      if (generationRef.current !== generation) return;
      setPhase('error');
      setError(cause instanceof Error ? cause.message : 'Prepared Scene could not analyze this room.');
      setStatus('The original Arrange editor is still available when Prepared Scene is disabled.');
    }
  }

  async function enrichDepth(url: string, generation: number) {
    try {
      const estimate = await createDepthProvider().estimate(url);
      if (generationRef.current !== generation) return;
      setObjects((current) => current.map((object) => ({
        ...object,
        approximateDepth: sampleDepth(estimate.normalized, estimate.width, estimate.height, object.position.x, object.position.y),
      })));
      setDepthInfo({ provider: estimate.provider, model: estimate.model, modelVersion: estimate.modelVersion, processingMs: estimate.processingMs });
    } catch {
      // Depth is enrichment. Object manipulation remains available if it cannot run on this device.
    }
  }

  async function addMissedObjectAt(event: React.PointerEvent<HTMLDivElement>) {
    if (!addMode || !sourceCanvasRef.current || phase !== 'ready') return;
    event.preventDefault();
    const rect = event.currentTarget.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const seed = { x: clamp((event.clientX - rect.left) / rect.width, 0, 1), y: clamp((event.clientY - rect.top) / rect.height, 0, 1) };
    setStatus('Adding the object you tapped…');
    setError(null);
    try {
      const segment = await segmentPreparedObject(sourceCanvasRef.current, seed);
      if (!segment || segment.bbox.width * segment.bbox.height > 0.62) throw new Error('That area did not produce a reliable object mask.');
      const id = crypto.randomUUID();
      maskValuesRef.current.set(id, segment.maskValues);
      const object: PreparedSceneObject = {
        id,
        label: 'object',
        detectionScore: 1,
        mobility: 'movable',
        expectedSupport: 'unknown',
        bbox: segment.bbox,
        maskDataUrl: segment.maskDataUrl,
        cutoutDataUrl: segment.cutoutDataUrl,
        position: { x: segment.centerX, y: segment.centerY },
        scale: 1,
        rotationDeg: 0,
        source: 'user_added',
      };
      setObjects((current) => [...current, object]);
      setSelectedId(id);
      setCleanBackground(createQuickCleanBackground(sourceCanvasRef.current, [...maskValuesRef.current.values()]));
      setAddMode(false);
      setStatus('Object added and ready to move.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'That object could not be prepared.');
      setStatus('Tap nearer the center of the object and try again.');
    }
  }

  function beginObjectDrag(event: React.PointerEvent<HTMLDivElement>, object: PreparedSceneObject) {
    event.preventDefault();
    event.stopPropagation();
    setSelectedId(object.id);
    setAddMode(false);
    dragRef.current = {
      objectId: object.id,
      pointerId: event.pointerId,
      clientX: event.clientX,
      clientY: event.clientY,
      startX: object.position.x,
      startY: object.position.y,
    };
    event.currentTarget.setPointerCapture?.(event.pointerId);
  }

  function resetPositions() {
    setObjects((current) => current.map((object) => ({ ...object, position: { x: object.bbox.x + object.bbox.width / 2, y: object.bbox.y + object.bbox.height / 2 }, scale: 1, rotationDeg: 0 })));
    setStatus('Prepared objects returned to their original photo positions.');
  }

  const background = showCleanPlate ? cleanBackground : (cleanBackground ?? sourcePreview ?? photoUrl ?? null);
  const ordered = useMemo(() => [...objects].sort((a, b) => a.position.y - b.position.y), [objects]);

  if (!photoUrl) return <StateCard title="No room photo" body="Load a room photo to create a Prepared Scene." />;

  return (
    <View style={{ gap: 10 }}>
      <View style={{ padding: 12, borderRadius: 16, borderWidth: 1, borderColor: tokens.color.line, backgroundColor: 'rgba(250,249,246,.94)', gap: 8 }}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
          {phase !== 'ready' && phase !== 'error' ? <ActivityIndicator color={tokens.color.blue} /> : null}
          <Text style={{ fontSize: 13, fontWeight: '800', color: tokens.color.text }}>Prepared Scene v1</Text>
          <Text style={{ flex: 1, minWidth: 180, fontSize: 11, lineHeight: 16, color: tokens.color.muted }}>{status}</Text>
        </View>
        {phase === 'segmenting' && progress.total ? <Text style={{ fontSize: 10, color: tokens.color.muted }}>{progress.complete}/{progress.total} preparation probes complete</Text> : null}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 7 }}>
          <Pressable disabled={phase !== 'ready'} onPress={() => { setAddMode((value) => !value); setError(null); }} style={buttonStyle(addMode)}>
            <Text style={buttonTextStyle}>{addMode ? 'Tap object in photo' : 'Add missed object'}</Text>
          </Pressable>
          <Pressable disabled={phase !== 'ready' || !cleanBackground} onPress={() => setShowCleanPlate((value) => !value)} style={buttonStyle(showCleanPlate)}>
            <Text style={buttonTextStyle}>{showCleanPlate ? 'Show layered room' : 'Inspect clean background'}</Text>
          </Pressable>
          <Pressable disabled={!objects.length} onPress={resetPositions} style={buttonStyle(false)}><Text style={buttonTextStyle}>Reset positions</Text></Pressable>
        </View>
        {error ? <Text style={{ fontSize: 10, lineHeight: 15, color: '#A84C4C' }}>{error}</Text> : null}
      </View>

      <div
        ref={stageRef}
        onPointerDown={addMissedObjectAt}
        style={{
          position: 'relative', width: '100%',
          aspectRatio: sourceCanvasRef.current ? `${sourceCanvasRef.current.width} / ${sourceCanvasRef.current.height}` : '4 / 3',
          overflow: 'hidden', borderRadius: 22, background: '#D9D4C9', border: `1px solid ${tokens.color.line}`,
          touchAction: addMode ? 'none' : 'pan-y', cursor: addMode ? 'crosshair' : 'default',
        }}
      >
        {background ? <img src={background} alt="Prepared room background" draggable={false} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'fill', userSelect: 'none', pointerEvents: 'none' }} /> : null}
        {phase === 'ready' && !showCleanPlate ? ordered.map((object, index) => {
          const selectedObject = selectedId === object.id;
          return (
            <div
              key={object.id}
              aria-label={`Move prepared ${object.label}`}
              onPointerDown={(event) => beginObjectDrag(event, object)}
              style={{
                position: 'absolute', left: `${object.position.x * 100}%`, top: `${object.position.y * 100}%`,
                width: `${object.bbox.width * object.scale * 100}%`, height: `${object.bbox.height * object.scale * 100}%`,
                transform: `translate(-50%, -50%) rotate(${object.rotationDeg}deg)`, transformOrigin: 'center',
                zIndex: selectedObject ? 100 : 10 + index, touchAction: 'none', cursor: 'grab',
                outline: selectedObject ? '2px solid rgba(40,199,232,.9)' : '1px solid transparent', borderRadius: 4,
              }}
            >
              <img src={object.cutoutDataUrl} alt="" draggable={false} style={{ width: '100%', height: '100%', objectFit: 'fill', pointerEvents: 'none', userSelect: 'none', filter: selectedObject ? 'drop-shadow(0 6px 8px rgba(0,0,0,.18))' : 'none' }} />
            </div>
          );
        }) : null}
        {phase !== 'ready' && sourcePreview ? <div style={{ position: 'absolute', left: 12, bottom: 12, padding: '7px 10px', borderRadius: 999, background: 'rgba(20,24,24,.72)', color: '#fff', fontSize: 11, fontWeight: 700, pointerEvents: 'none' }}>Preparing room…</div> : null}
      </div>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
        {objects.map((object) => (
          <Pressable key={object.id} onPress={() => { setSelectedId(object.id); setAddMode(false); }} style={{ paddingHorizontal: 9, minHeight: 34, justifyContent: 'center', borderRadius: 999, borderWidth: 1, borderColor: selectedId === object.id ? tokens.color.blue : tokens.color.line, backgroundColor: selectedId === object.id ? 'rgba(40,199,232,.08)' : 'rgba(255,255,255,.72)' }}>
            <Text style={{ fontSize: 10, fontWeight: '700', color: tokens.color.text }}>{object.label}{object.source === 'user_added' ? ' · added' : ''}</Text>
          </Pressable>
        ))}
      </View>

      <View style={{ padding: 10, borderRadius: 14, backgroundColor: 'rgba(250,249,246,.82)', borderWidth: 1, borderColor: tokens.color.line, gap: 3 }}>
        <Text style={{ fontSize: 10, fontWeight: '800', color: tokens.color.text }}>Estimated prepared scene · source photo remains immutable</Text>
        <Text style={{ fontSize: 10, lineHeight: 15, color: tokens.color.muted }}>
          {objects.length} editable object{objects.length === 1 ? '' : 's'} · {sweepCount} discovered by the supplemental room sweep · {ignoredCount} detector candidate{ignoredCount === 1 ? '' : 's'} filtered or deferred. {selected ? `Selected: ${selected.label} · expected support ${selected.expectedSupport}${typeof selected.approximateDepth === 'number' ? ` · relative depth ${selected.approximateDepth.toFixed(2)}` : ''}.` : 'Tap an object to select it.'}
        </Text>
        {detectorInfo ? <Text style={{ fontSize: 9, color: tokens.color.muted }}>Discovery: {detectorInfo.model} · {detectorInfo.processingMs} ms</Text> : null}
        {depthInfo ? <Text style={{ fontSize: 9, color: tokens.color.muted }}>Depth: {depthInfo.model} · {depthInfo.processingMs} ms</Text> : <Text style={{ fontSize: 9, color: tokens.color.muted }}>Depth enrichment runs after objects become moveable so it does not block interaction.</Text>}
      </View>
    </View>
  );
}

function chooseCandidates(candidates: ObjectDetectionCandidate[], width: number, height: number) {
  const normalized = candidates
    .filter((candidate) => candidate.score >= 0.52 && !IGNORED_LABELS.has(candidate.label))
    .filter((candidate) => {
      const area = Math.max(0, candidate.box.xmax - candidate.box.xmin) * Math.max(0, candidate.box.ymax - candidate.box.ymin);
      const ratio = area / Math.max(1, width * height);
      return ratio >= 0.0015 && ratio <= 0.72;
    })
    .sort((a, b) => b.score - a.score);

  const chosen: ObjectDetectionCandidate[] = [];
  for (const candidate of normalized) {
    if (FIXED_LABELS.has(candidate.label)) continue;
    if (chosen.some((existing) => existing.label === candidate.label && iou(existing, candidate) > 0.62)) continue;
    chosen.push(candidate);
    if (chosen.length >= MAX_AUTOMATIC_OBJECTS) break;
  }
  return chosen;
}

function classify(label: string): { mobility: PreparedObjectMobility; support: PreparedSupportKind } {
  if (FIXED_LABELS.has(label)) return { mobility: 'fixed', support: 'unknown' };
  if (FLOOR_LABELS.has(label)) return { mobility: label === 'refrigerator' ? 'conditional' : 'movable', support: 'floor' };
  if (SURFACE_LABELS.has(label)) return { mobility: 'movable', support: 'floor' };
  if (WALL_LABELS.has(label)) return { mobility: 'conditional', support: 'wall' };
  return { mobility: 'movable', support: 'surface' };
}

function seedCovered(seed: NormalizedPoint, masks: Map<string, Uint8ClampedArray>, width: number, height: number) {
  const x = clamp(Math.round(seed.x * (width - 1)), 0, width - 1);
  const y = clamp(Math.round(seed.y * (height - 1)), 0, height - 1);
  const index = y * width + x;
  for (const mask of masks.values()) if ((mask[index] ?? 0) >= 96) return true;
  return false;
}

function overlapsPrepared(bbox: { x: number; y: number; width: number; height: number }, objects: PreparedSceneObject[], threshold: number) {
  return objects.some((object) => normalizedIou(bbox, object.bbox) >= threshold);
}

function normalizedIou(a: { x: number; y: number; width: number; height: number }, b: { x: number; y: number; width: number; height: number }) {
  const x0 = Math.max(a.x, b.x); const y0 = Math.max(a.y, b.y);
  const x1 = Math.min(a.x + a.width, b.x + b.width); const y1 = Math.min(a.y + a.height, b.y + b.height);
  const intersection = Math.max(0, x1 - x0) * Math.max(0, y1 - y0);
  return intersection / Math.max(0.000001, a.width * a.height + b.width * b.height - intersection);
}

function iou(a: ObjectDetectionCandidate, b: ObjectDetectionCandidate) {
  const x0 = Math.max(a.box.xmin, b.box.xmin); const y0 = Math.max(a.box.ymin, b.box.ymin);
  const x1 = Math.min(a.box.xmax, b.box.xmax); const y1 = Math.min(a.box.ymax, b.box.ymax);
  const intersection = Math.max(0, x1 - x0) * Math.max(0, y1 - y0);
  const areaA = Math.max(0, a.box.xmax - a.box.xmin) * Math.max(0, a.box.ymax - a.box.ymin);
  const areaB = Math.max(0, b.box.xmax - b.box.xmin) * Math.max(0, b.box.ymax - b.box.ymin);
  return intersection / Math.max(1, areaA + areaB - intersection);
}

function buttonStyle(active: boolean) {
  return { minHeight: 40, paddingHorizontal: 11, alignItems: 'center' as const, justifyContent: 'center' as const, borderRadius: 11, borderWidth: 1, borderColor: active ? tokens.color.blue : tokens.color.line, backgroundColor: active ? 'rgba(40,199,232,.09)' : '#fff' };
}
const buttonTextStyle = { fontSize: 10, fontWeight: '800' as const, color: tokens.color.text };

function StateCard({ title, body }: { title: string; body: string }) {
  return <View style={{ minHeight: 360, padding: 28, alignItems: 'center', justifyContent: 'center', borderRadius: 22, borderWidth: 1, borderColor: tokens.color.line, backgroundColor: 'rgba(255,255,255,.72)' }}><Text style={{ fontSize: 16, fontWeight: '800', color: tokens.color.text }}>{title}</Text><Text style={{ marginTop: 6, fontSize: 11, color: tokens.color.muted }}>{body}</Text></View>;
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}