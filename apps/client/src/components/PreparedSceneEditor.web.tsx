import type { SpatialSnapshot } from '@formshift/domain';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { useAuth } from '../auth/AuthProvider';
import { repairPreparedSceneBackground } from '../prepared/backgroundRepair.web';
import {
  compositeRepairedCleanBackground,
  createPreparedSceneRepairMask,
  createQuickCleanBackground,
  loadPreparedSource,
  sampleDepth,
} from '../prepared/imageOps.web';
import {
  loadLatestPreparedScene,
  persistPreparedScene,
  type PreparedBackgroundQuality,
} from '../prepared/persistence';
import { createObjectDiscoveryProvider } from '../prepared/providers/DetrObjectDiscovery.web';
import { segmentPreparedObject } from '../prepared/providers/MediaPipePreparedSegmenter.web';
import {
  DEFAULT_PREPARED_SUPPORT_MODEL,
  classifyPreparedLabel,
  comparePreparedDepth,
  constrainPreparedObjects,
  constrainPreparedPosition,
  estimateSupportModel,
  estimateSupportModelFromObjects,
  isFixedPreparedLabel,
  isPersonOccludedCandidate,
  maskMatchesDetection,
  parsePreparedSupportModel,
  positionsDiffer,
  type PreparedSupportModel,
} from '../prepared/support';
import type { ObjectDetectionCandidate, PreparedSceneObject } from '../prepared/types';
import { createDepthProvider } from '../scene/providers/DepthAnythingV2Small.web';
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
type CacheState = 'none' | 'restored' | 'saving' | 'saved' | 'dirty' | 'error';

const MAX_AUTOMATIC_OBJECTS = 18;
const IGNORED_LABELS = new Set(['person', 'cat', 'dog', 'bird', 'horse', 'sheep', 'cow', 'elephant', 'bear', 'zebra', 'giraffe']);
const SUPPORT_MODEL_VERSION = 1;

export function PreparedSceneEditor({ photoUrl, projectId, spaceId }: Props) {
  const auth = useAuth();
  const stageRef = useRef<HTMLDivElement | null>(null);
  const sourceCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const maskValuesRef = useRef(new Map<string, Uint8ClampedArray>());
  const dragRef = useRef<DragSession | null>(null);
  const generationRef = useRef(0);
  const supportModelRef = useRef<PreparedSupportModel>(DEFAULT_PREPARED_SUPPORT_MODEL);
  const supportAssistRef = useRef(true);

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
  const [personDeferredCount, setPersonDeferredCount] = useState(0);
  const [backgroundQuality, setBackgroundQuality] = useState<PreparedBackgroundQuality>('quick');
  const [preparedSceneId, setPreparedSceneId] = useState<string | null>(null);
  const [cleanBackgroundAssetId, setCleanBackgroundAssetId] = useState<string | null>(null);
  const [cacheState, setCacheState] = useState<CacheState>('none');
  const [repairing, setRepairing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [repairInfo, setRepairInfo] = useState<{ model: string; processingMs: number } | null>(null);
  const [supportModel, setSupportModel] = useState<PreparedSupportModel>(DEFAULT_PREPARED_SUPPORT_MODEL);
  const [supportAssistEnabled, setSupportAssistEnabled] = useState(true);

  const selected = useMemo(() => objects.find((object) => object.id === selectedId) ?? null, [objects, selectedId]);

  function applySupportModel(model: PreparedSupportModel) {
    supportModelRef.current = model;
    setSupportModel(model);
  }

  useEffect(() => {
    supportAssistRef.current = supportAssistEnabled;
  }, [supportAssistEnabled]);

  useEffect(() => {
    const onMove = (event: PointerEvent) => {
      const drag = dragRef.current;
      const stage = stageRef.current;
      if (!drag || event.pointerId !== drag.pointerId || !stage) return;
      if (event.cancelable) event.preventDefault();
      const rect = stage.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      const desired = {
        x: drag.startX + (event.clientX - drag.clientX) / rect.width,
        y: drag.startY + (event.clientY - drag.clientY) / rect.height,
      };
      setObjects((current) => current.map((object) => object.id === drag.objectId
        ? { ...object, position: constrainPreparedPosition(object, desired, supportModelRef.current, supportAssistRef.current) }
        : object));
    };
    const onEnd = (event: PointerEvent) => {
      if (dragRef.current?.pointerId !== event.pointerId) return;
      dragRef.current = null;
      setCacheState((current) => current === 'none' ? current : 'dirty');
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
    setPersonDeferredCount(0);
    setError(null);
    setAddMode(false);
    setShowCleanPlate(false);
    setBackgroundQuality('quick');
    setPreparedSceneId(null);
    setCleanBackgroundAssetId(null);
    setCacheState('none');
    setRepairInfo(null);
    setRepairing(false);
    setSaving(false);
    setSupportAssistEnabled(true);
    supportAssistRef.current = true;
    applySupportModel(DEFAULT_PREPARED_SUPPORT_MODEL);

    if (!photoUrl) {
      setPhase('idle');
      setStatus('Capture or load a room photo first.');
      return;
    }

    void restoreOrPrepare(photoUrl, generation);
    return () => { if (generationRef.current === generation) generationRef.current += 1; };
  }, [photoUrl, projectId, spaceId]);

  async function restoreOrPrepare(url: string, generation: number) {
    try {
      setPhase('loading');
      setStatus('Photo ready. Checking for a prepared room…');
      const source = await loadPreparedSource(url);
      if (generationRef.current !== generation) return;
      sourceCanvasRef.current = source.canvas;
      setSourcePreview(source.canvas.toDataURL('image/jpeg', 0.92));

      if (projectId && spaceId) {
        try {
          const cached = await loadLatestPreparedScene(projectId, spaceId);
          if (generationRef.current !== generation) return;
          const supportVersion = typeof cached?.provider.supportModelVersion === 'number' ? cached.provider.supportModelVersion : 0;
          if (cached?.objects.length && supportVersion === SUPPORT_MODEL_VERSION) {
            const restored: PreparedSceneObject[] = [];
            maskValuesRef.current.clear();
            for (const object of cached.objects) {
              try {
                const mask = await loadMaskValues(object.maskDataUrl, source.canvas.width, source.canvas.height);
                if (generationRef.current !== generation) return;
                maskValuesRef.current.set(object.id, mask);
                restored.push(object);
              } catch {
                // One damaged cached object must not make the room unusable.
              }
            }
            if (restored.length) {
              const restoredSupport = parsePreparedSupportModel(cached.provider.supportModel) ?? estimateSupportModelFromObjects(restored);
              applySupportModel(restoredSupport);
              const constrained = constrainPreparedObjects(restored, restoredSupport, true);
              const corrected = positionsDiffer(restored, constrained);
              setObjects(constrained);
              setCleanBackground(cached.cleanBackgroundUrl);
              setBackgroundQuality(cached.backgroundQuality);
              setPreparedSceneId(cached.id);
              setCleanBackgroundAssetId(cached.cleanBackgroundAssetId);
              setCacheState(corrected ? 'dirty' : 'restored');
              setPhase('ready');
              setStatus(corrected
                ? `${constrained.length} cached objects restored. Estimated support assist corrected an unsupported saved placement.`
                : `${constrained.length} cached object${constrained.length === 1 ? '' : 's'} restored. Tap any prepared object and move it.`);
              if (constrained.some((object) => typeof object.approximateDepth !== 'number')) void enrichDepth(url, generation);
              return;
            }
          }
        } catch {
          if (generationRef.current !== generation) return;
          setCacheState('error');
          setStatus('Prepared cache unavailable. Rebuilding the room locally…');
        }
      }

      await prepareFresh(url, source, generation);
    } catch (cause) {
      if (generationRef.current !== generation) return;
      setPhase('error');
      setError(cause instanceof Error ? cause.message : 'Prepared Scene could not analyze this room.');
      setStatus('The original Arrange editor is still available when Prepared Scene is disabled.');
    }
  }

  async function prepareFresh(url: string, source: Awaited<ReturnType<typeof loadPreparedSource>>, generation: number) {
    setPhase('discovering');
    setStatus('Finding moveable objects…');
    let chosen: ObjectDetectionCandidate[] = [];
    let discoveryInfo: DetectorInfo = null;
    let nextSupport = DEFAULT_PREPARED_SUPPORT_MODEL;
    try {
      const discovery = await createObjectDiscoveryProvider().discover(url);
      if (generationRef.current !== generation) return;
      discoveryInfo = { provider: discovery.provider, model: discovery.model, modelVersion: discovery.modelVersion, processingMs: discovery.processingMs };
      setDetectorInfo(discoveryInfo);
      nextSupport = estimateSupportModel(discovery.candidates, source.originalWidth, source.originalHeight);
      applySupportModel(nextSupport);
      const deferred = discovery.candidates.filter((candidate) => candidate.score >= 0.52 && !IGNORED_LABELS.has(candidate.label) && isPersonOccludedCandidate(candidate, discovery.candidates)).length;
      setPersonDeferredCount(deferred);
      chosen = chooseCandidates(discovery.candidates, source.originalWidth, source.originalHeight);
      setIgnoredCount(Math.max(0, discovery.candidates.length - chosen.length));
    } catch {
      if (generationRef.current !== generation) return;
      setDetectorInfo(null);
      setIgnoredCount(0);
      setPersonDeferredCount(0);
      setStatus('Automatic object labels are unavailable on this device. You can still use Add missed object.');
    }
    setProgress({ complete: 0, total: chosen.length });

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
        if (
          segment
          && segment.bbox.width * segment.bbox.height <= 0.62
          && maskMatchesDetection(segment.bbox, candidate, source.originalWidth, source.originalHeight)
          && !overlapsLabeledPrepared(segment.bbox, candidate.label, prepared)
        ) {
          const id = crypto.randomUUID();
          maskValuesRef.current.set(id, segment.maskValues);
          const semantics = classifyPreparedLabel(candidate.label);
          const next: PreparedSceneObject = {
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
          };
          next.position = constrainPreparedPosition(next, next.position, nextSupport, true);
          prepared.push(next);
          setObjects([...prepared]);
        }
      } catch {
        // One weak detector candidate must not stop room preparation.
      }
      completed += 1;
      setProgress({ complete: completed, total: chosen.length });
    }

    if (generationRef.current !== generation) return;
    setPhase('cleaning');
    setStatus('Building one shared clean background plate…');
    const clean = createQuickCleanBackground(source.canvas, [...maskValuesRef.current.values()]);
    if (generationRef.current !== generation) return;
    setCleanBackground(clean);
    setBackgroundQuality('quick');
    setPhase('ready');
    setStatus(prepared.length
      ? `${prepared.length} reliable object${prepared.length === 1 ? '' : 's'} ready. Estimated support assist is on.`
      : 'No reliable automatic objects were found. Use Add missed object to prepare the items you want to move.');

    if (prepared.length) {
      void persistVersion({
        sceneObjects: prepared,
        backgroundDataUrl: clean,
        quality: 'quick',
        parentId: null,
        backgroundAssetId: null,
        provider: {
          discovery: discoveryInfo,
          automaticAcceptance: 'detector-backed-only',
          personOverlapPolicy: 'defer',
          supportModelVersion: SUPPORT_MODEL_VERSION,
          supportModel: nextSupport,
          automaticCache: true,
        },
        quiet: true,
        generation,
      });
    }
    void enrichDepth(url, generation);
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
      setCacheState((current) => current === 'none' ? current : 'dirty');
    } catch {
      // Depth is enrichment; movement remains available if it fails.
    }
  }

  async function improveBackground() {
    const source = sourceCanvasRef.current;
    const masks = [...maskValuesRef.current.values()];
    if (!source || !masks.length || phase !== 'ready' || repairing || saving || cacheState === 'saving') return;
    if (!projectId || !spaceId || !auth.session?.access_token) {
      setError('Sign in with edit access before requesting high-quality background repair.');
      return;
    }

    const repairObjects = objects.map((object) => ({ ...object, position: { ...object.position } }));
    setRepairing(true);
    setError(null);
    setStatus('Improving the hidden room areas…');
    try {
      const repairMask = createPreparedSceneRepairMask(masks, source.width, source.height);
      const repaired = await repairPreparedSceneBackground({
        projectId,
        spaceId,
        accessToken: auth.session.access_token,
        sourceCanvas: source,
        maskDataUrl: repairMask,
      });
      const clean = await compositeRepairedCleanBackground(source, repaired.imageDataUrl, masks);
      setCleanBackground(clean);
      setBackgroundQuality('ai_repaired');
      setCleanBackgroundAssetId(null);
      setRepairInfo({ model: repaired.modelUsed, processingMs: repaired.processingMs });
      setShowCleanPlate(false);
      setCacheState('dirty');
      setStatus('High-quality clean background ready. Object movement remains instant.');

      await persistVersion({
        sceneObjects: repairObjects,
        backgroundDataUrl: clean,
        quality: 'ai_repaired',
        parentId: preparedSceneId,
        backgroundAssetId: null,
        provider: providerMetadata({ repairModel: repaired.modelUsed, repairMs: repaired.processingMs, backgroundQuality: 'ai_repaired' }),
        quiet: true,
        generation: generationRef.current,
      });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'High-quality background repair failed.');
      setStatus('The quick local clean background remains available.');
    } finally {
      setRepairing(false);
    }
  }

  async function savePreparedScene() {
    if (!cleanBackground || !objects.length || saving || repairing || cacheState === 'saving') return;
    setSaving(true);
    setError(null);
    setStatus('Saving the prepared room…');
    try {
      await persistVersion({
        sceneObjects: objects,
        backgroundDataUrl: cleanBackground,
        quality: backgroundQuality,
        parentId: preparedSceneId,
        backgroundAssetId: cleanBackgroundAssetId,
        provider: providerMetadata(),
        quiet: false,
        generation: generationRef.current,
      });
      setStatus('Prepared room saved. This photo can reopen without repeating object discovery.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Prepared Scene could not be saved.');
      setStatus('Your current in-memory scene is still usable.');
    } finally {
      setSaving(false);
    }
  }

  async function persistVersion(input: {
    sceneObjects: PreparedSceneObject[];
    backgroundDataUrl: string;
    quality: PreparedBackgroundQuality;
    parentId: string | null;
    backgroundAssetId: string | null;
    provider: Record<string, unknown>;
    quiet: boolean;
    generation: number;
  }) {
    if (!projectId || !spaceId || !auth.session?.user.id || !input.sceneObjects.length) return null;
    if (!input.quiet) setSaving(true);
    setCacheState('saving');
    try {
      const saved = await persistPreparedScene({
        projectId,
        spaceId,
        userId: auth.session.user.id,
        objects: input.sceneObjects,
        cleanBackgroundDataUrl: input.backgroundDataUrl,
        backgroundQuality: input.quality,
        provider: input.provider,
        parentPreparedSceneId: input.parentId,
        cleanBackgroundAssetId: input.backgroundAssetId,
      });
      if (generationRef.current !== input.generation) return saved;
      setPreparedSceneId(saved.id);
      setCleanBackgroundAssetId(saved.cleanBackgroundAssetId);
      setObjects((current) => mergePersistedAssetIds(current, saved.objects));
      setCacheState('saved');
      return saved;
    } catch (cause) {
      if (generationRef.current === input.generation) setCacheState('error');
      if (!input.quiet) throw cause;
      return null;
    } finally {
      if (!input.quiet) setSaving(false);
    }
  }

  function providerMetadata(extra: Record<string, unknown> = {}) {
    return {
      discovery: detectorInfo,
      depth: depthInfo,
      automaticAcceptance: 'detector-backed-only',
      personOverlapPolicy: 'defer',
      supportModelVersion: SUPPORT_MODEL_VERSION,
      supportModel,
      backgroundQuality,
      ...extra,
    };
  }

  async function addMissedObjectAt(event: React.PointerEvent<HTMLDivElement>) {
    if (!addMode || !sourceCanvasRef.current || phase !== 'ready' || repairing || saving || cacheState === 'saving') return;
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
      setCleanBackgroundAssetId(null);
      setBackgroundQuality('quick');
      setRepairInfo(null);
      setCacheState('dirty');
      setAddMode(false);
      setStatus('Object added and ready to move. Improve background again if the new hidden region needs cleanup.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'That object could not be prepared.');
      setStatus('Tap nearer the center of the object and try again.');
    }
  }

  function beginObjectDrag(event: React.PointerEvent<HTMLDivElement>, object: PreparedSceneObject) {
    if (repairing || saving || cacheState === 'saving') return;
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

  function toggleSupportAssist() {
    const next = !supportAssistEnabled;
    supportAssistRef.current = next;
    setSupportAssistEnabled(next);
    if (next) {
      setObjects((current) => constrainPreparedObjects(current, supportModelRef.current, true));
      setCacheState((current) => current === 'none' ? current : 'dirty');
      setStatus('Estimated support assist enabled. Floor and wall objects are kept on plausible support regions.');
    } else {
      setStatus('Estimated support assist disabled. Free placement is available for comparison.');
    }
  }

  function resetPositions() {
    setObjects((current) => current.map((object) => {
      const original = { ...object, position: { x: object.bbox.x + object.bbox.width / 2, y: object.bbox.y + object.bbox.height / 2 }, scale: 1, rotationDeg: 0 };
      return { ...original, position: constrainPreparedPosition(original, original.position, supportModelRef.current, supportAssistRef.current) };
    }));
    setCacheState((current) => current === 'none' ? current : 'dirty');
    setStatus('Prepared objects returned to their original photo positions.');
  }

  const background = showCleanPlate ? cleanBackground : (cleanBackground ?? sourcePreview ?? photoUrl ?? null);
  const ordered = useMemo(() => [...objects].sort(comparePreparedDepth), [objects]);

  if (!photoUrl) return <StateCard title="No room photo" body="Load a room photo to create a Prepared Scene." />;

  return (
    <View style={{ gap: 10 }}>
      <View style={{ padding: 12, borderRadius: 16, borderWidth: 1, borderColor: tokens.color.line, backgroundColor: 'rgba(250,249,246,.94)', gap: 8 }}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
          {phase !== 'ready' && phase !== 'error' ? <ActivityIndicator color={tokens.color.blue} /> : null}
          <Text style={{ fontSize: 13, fontWeight: '800', color: tokens.color.text }}>Prepared Scene v1</Text>
          <Text style={{ flex: 1, minWidth: 180, fontSize: 11, lineHeight: 16, color: tokens.color.muted }}>{status}</Text>
        </View>
        {phase === 'segmenting' && progress.total ? <Text style={{ fontSize: 10, color: tokens.color.muted }}>{progress.complete}/{progress.total} detector-backed objects processed</Text> : null}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 7 }}>
          <Pressable disabled={phase !== 'ready'} onPress={() => { setAddMode((value) => !value); setError(null); }} style={buttonStyle(addMode)}>
            <Text style={buttonTextStyle}>{addMode ? 'Tap object in photo' : 'Add missed object'}</Text>
          </Pressable>
          <Pressable disabled={phase !== 'ready' || !cleanBackground} onPress={() => setShowCleanPlate((value) => !value)} style={buttonStyle(showCleanPlate)}>
            <Text style={buttonTextStyle}>{showCleanPlate ? 'Show layered room' : 'Inspect clean background'}</Text>
          </Pressable>
          <Pressable disabled={phase !== 'ready' || !objects.length || repairing} onPress={improveBackground} style={buttonStyle(false)}>
            <Text style={buttonTextStyle}>{repairing ? 'Improving…' : backgroundQuality === 'ai_repaired' ? 'Improve background again' : 'Improve background'}</Text>
          </Pressable>
          <Pressable disabled={phase !== 'ready' || !objects.length || saving || cacheState === 'saving'} onPress={savePreparedScene} style={buttonStyle(cacheState === 'saved' || cacheState === 'restored')}>
            <Text style={buttonTextStyle}>{saving || cacheState === 'saving' ? 'Saving…' : cacheState === 'dirty' ? 'Save changes' : 'Save scene'}</Text>
          </Pressable>
          <Pressable disabled={phase !== 'ready'} onPress={toggleSupportAssist} style={buttonStyle(supportAssistEnabled)}>
            <Text style={buttonTextStyle}>{supportAssistEnabled ? 'Support assist on' : 'Support assist off'}</Text>
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
        {phase === 'ready' && supportAssistEnabled && !showCleanPlate ? (
          <div style={{ position: 'absolute', left: 0, right: 0, top: `${supportModel.floorRegionStartY * 100}%`, borderTop: '1px dashed rgba(40,199,232,.5)', zIndex: 4, pointerEvents: 'none' }}>
            <span style={{ position: 'absolute', right: 8, top: -18, padding: '2px 6px', borderRadius: 999, background: 'rgba(20,24,24,.62)', color: '#fff', fontSize: 9, fontWeight: 700 }}>Estimated floor region</span>
          </div>
        ) : null}
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
                zIndex: 10 + index, touchAction: 'none', cursor: 'grab',
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
          <Pressable key={object.id} onPress={() => { setSelectedId(object.id); setAddMode(false); }} style={{ paddingHorizontal: 9, minHeight: 36, justifyContent: 'center', borderRadius: 999, borderWidth: 1, borderColor: selectedId === object.id ? tokens.color.blue : tokens.color.line, backgroundColor: selectedId === object.id ? 'rgba(40,199,232,.08)' : 'rgba(255,255,255,.72)' }}>
            <Text style={{ fontSize: 10, fontWeight: '700', color: tokens.color.text }}>{object.label}{object.source === 'user_added' ? ' · added' : ''}</Text>
          </Pressable>
        ))}
      </View>

      <View style={{ padding: 10, borderRadius: 14, backgroundColor: 'rgba(250,249,246,.82)', borderWidth: 1, borderColor: tokens.color.line, gap: 3 }}>
        <Text style={{ fontSize: 10, fontWeight: '800', color: tokens.color.text }}>Estimated prepared scene · source photo remains immutable</Text>
        <Text style={{ fontSize: 10, lineHeight: 15, color: tokens.color.muted }}>
          {objects.length} editable object{objects.length === 1 ? '' : 's'} · {ignoredCount} detector candidate{ignoredCount === 1 ? '' : 's'} filtered/deferred · {personDeferredCount} candidate{personDeferredCount === 1 ? '' : 's'} deferred because a person overlaps it. {selected ? `Selected: ${selected.label} · expected support ${selected.expectedSupport}${typeof selected.approximateDepth === 'number' ? ` · relative depth ${selected.approximateDepth.toFixed(2)}` : ''}.` : 'Tap an object to select it.'}
        </Text>
        <Text style={{ fontSize: 9, color: tokens.color.muted }}>Support assist: {supportAssistEnabled ? 'on' : 'off'} · estimated floor region {(supportModel.floorRegionStartY * 100).toFixed(0)}% down photo · confidence {(supportModel.confidence * 100).toFixed(0)}% · {supportModel.source}.</Text>
        <Text style={{ fontSize: 9, color: tokens.color.muted }}>Automatic masks must agree with detector geometry. Person-overlapped furniture is deferred instead of moving the person with it.</Text>
        <Text style={{ fontSize: 9, color: tokens.color.muted }}>Prepared layers use relative depth for front/back order when depth evidence exists; this is still estimated, not calibrated occlusion.</Text>
        <Text style={{ fontSize: 9, color: tokens.color.muted }}>Background: {backgroundQuality === 'ai_repaired' ? 'AI-repaired masked regions' : 'fast local approximation'} · Cache: {cacheLabel(cacheState)}</Text>
        {detectorInfo ? <Text style={{ fontSize: 9, color: tokens.color.muted }}>Discovery: {detectorInfo.model} · {detectorInfo.processingMs} ms</Text> : null}
        {depthInfo ? <Text style={{ fontSize: 9, color: tokens.color.muted }}>Depth: {depthInfo.model} · {depthInfo.processingMs} ms</Text> : <Text style={{ fontSize: 9, color: tokens.color.muted }}>Depth enrichment runs after objects become moveable so it does not block interaction.</Text>}
        {repairInfo ? <Text style={{ fontSize: 9, color: tokens.color.muted }}>Background repair: {repairInfo.model} · {repairInfo.processingMs} ms · only masked source regions are accepted back into the clean plate.</Text> : null}
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
    if (isFixedPreparedLabel(candidate.label)) continue;
    if (isPersonOccludedCandidate(candidate, candidates)) continue;
    if (chosen.some((existing) => existing.label === candidate.label && iou(existing, candidate) > 0.55)) continue;
    chosen.push(candidate);
    if (chosen.length >= MAX_AUTOMATIC_OBJECTS) break;
  }
  return chosen;
}

function overlapsLabeledPrepared(bbox: { x: number; y: number; width: number; height: number }, label: string, objects: PreparedSceneObject[]) {
  const center = boxCenter(bbox);
  return objects.some((object) => {
    if (object.label !== label) return false;
    if (normalizedIou(bbox, object.bbox) >= 0.55) return true;
    return pointInBox(center, object.bbox) || pointInBox(boxCenter(object.bbox), bbox);
  });
}

function boxCenter(bbox: { x: number; y: number; width: number; height: number }) { return { x: bbox.x + bbox.width / 2, y: bbox.y + bbox.height / 2 }; }
function pointInBox(point: { x: number; y: number }, bbox: { x: number; y: number; width: number; height: number }) { return point.x >= bbox.x && point.x <= bbox.x + bbox.width && point.y >= bbox.y && point.y <= bbox.y + bbox.height; }
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

async function loadMaskValues(url: string, width: number, height: number) {
  const image = await loadImage(url);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) throw new Error('Cached Prepared Scene mask could not be restored.');
  context.drawImage(image, 0, 0, width, height);
  const pixels = context.getImageData(0, 0, width, height).data;
  const values = new Uint8ClampedArray(width * height);
  for (let index = 0; index < values.length; index += 1) values[index] = pixels[index * 4 + 3] ?? 0;
  return values;
}

function mergePersistedAssetIds(current: PreparedSceneObject[], persisted: PreparedSceneObject[]) {
  const byId = new Map(persisted.map((object) => [object.id, object]));
  return current.map((object) => {
    const stored = byId.get(object.id);
    return stored ? { ...object, maskAssetId: stored.maskAssetId, cutoutAssetId: stored.cutoutAssetId } : object;
  });
}

function cacheLabel(state: CacheState) {
  switch (state) {
    case 'restored': return 'restored from private cache';
    case 'saving': return 'saving privately';
    case 'saved': return 'saved privately';
    case 'dirty': return 'changes not yet saved';
    case 'error': return 'cache unavailable';
    default: return 'not cached yet';
  }
}

function buttonStyle(active: boolean) {
  return { minHeight: 44, paddingHorizontal: 11, alignItems: 'center' as const, justifyContent: 'center' as const, borderRadius: 11, borderWidth: 1, borderColor: active ? tokens.color.blue : tokens.color.line, backgroundColor: active ? 'rgba(40,199,232,.09)' : '#fff' };
}
const buttonTextStyle = { fontSize: 10, fontWeight: '800' as const, color: tokens.color.text };

function StateCard({ title, body }: { title: string; body: string }) {
  return <View style={{ minHeight: 360, padding: 28, alignItems: 'center', justifyContent: 'center', borderRadius: 22, borderWidth: 1, borderColor: tokens.color.line, backgroundColor: 'rgba(255,255,255,.72)' }}><Text style={{ fontSize: 16, fontWeight: '800', color: tokens.color.text }}>{title}</Text><Text style={{ marginTop: 6, fontSize: 11, color: tokens.color.muted }}>{body}</Text></View>;
}

function loadImage(url: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Cached Prepared Scene image could not be loaded.'));
    image.src = url;
  });
}

function clamp(value: number, min: number, max: number) { return Math.max(min, Math.min(max, value)); }
