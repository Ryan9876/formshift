import type { SpatialSnapshot } from '@formshift/domain';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '../auth/AuthProvider';
import { loadLatestPhotoArrangement, persistPhotoArrangement } from '../data/photoArrangementPersistence';
import { tokens } from '../theme/tokens';

type Point = { x: number; y: number };
type RefinementMode = 'add' | 'remove' | 'pan';
type StrokeMode = Exclude<RefinementMode, 'pan'>;
type RefinementStroke = { mode: StrokeMode; points: Point[] };
type Selection = {
  cutoutUrl: string;
  maskUrl: string;
  previewUrl: string;
  bbox: { x: number; y: number; width: number; height: number };
  centerX: number;
  centerY: number;
};
type SegmenterModule = {
  FilesetResolver: { forVisionTasks(path: string): Promise<unknown> };
  InteractiveSegmenter: { createFromOptions(fileset: unknown, options: unknown): Promise<any> };
  BrushMode?: { POSITIVE?: unknown; NEGATIVE?: unknown; BACKGROUND?: unknown };
};
type TransformBase = { position: Point; scale: number; rotation: number; centroid: Point; distance: number; angle: number };
type ViewBase = { scale: number; offset: Point; centroid: Point; distance: number };
type TapCandidate = { pointerId: number; start: Point; moved: boolean; startedAt: number };

const MEDIAPIPE_BUNDLE = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.0.1/vision_bundle.mjs';
const MEDIAPIPE_WASM = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.0.1/wasm';
const MAGIC_TOUCH_MODEL = 'https://storage.googleapis.com/mediapipe-models/interactive_segmenter_v2/magic_touch/int8/1/interactive_segmentation.task';
const SHIELD = { touchAction: 'none', userSelect: 'none', WebkitUserSelect: 'none', WebkitTouchCallout: 'none' } as any;

export function PhotoArrangeEditorV17({ photoUrl, snapshot, projectId, spaceId, baseSpatialVersionId }: {
  photoUrl?: string | null;
  snapshot: SpatialSnapshot;
  onSnapshotChange?: (snapshot: SpatialSnapshot) => void;
  projectId?: string;
  spaceId?: string;
  baseSpatialVersionId?: string | null;
}) {
  const auth = useAuth();
  const sourceCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const sourceBeforeLiftRef = useRef<HTMLCanvasElement | null>(null);
  const segmenterRef = useRef<any>(null);
  const viewportPointers = useRef(new Map<number, Point>());
  const transformPointers = useRef(new Map<number, Point>());
  const viewBaseRef = useRef<ViewBase | null>(null);
  const transformBaseRef = useRef<TransformBase | null>(null);
  const tapRef = useRef<TapCandidate | null>(null);
  const activeStrokeRef = useRef<{ pointerId: number; mode: StrokeMode; points: Point[] } | null>(null);

  const [sceneUrl, setSceneUrl] = useState<string | null>(photoUrl ?? null);
  const [persistedSceneUrl, setPersistedSceneUrl] = useState<string | null>(photoUrl ?? null);
  const [imageSize, setImageSize] = useState({ width: 4, height: 3 });
  const [stageSize, setStageSize] = useState({ width: 1, height: 1 });
  const [candidate, setCandidate] = useState<Selection | null>(null);
  const [selection, setSelection] = useState<Selection | null>(null);
  const [refineMode, setRefineMode] = useState<RefinementMode>('add');
  const [strokes, setStrokes] = useState<RefinementStroke[]>([]);
  const [redoStrokes, setRedoStrokes] = useState<RefinementStroke[]>([]);
  const [liveStroke, setLiveStroke] = useState<RefinementStroke | null>(null);
  const [loupePoint, setLoupePoint] = useState<Point | null>(null);
  const [position, setPosition] = useState<Point>({ x: 0.5, y: 0.5 });
  const [scale, setScale] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [viewScale, setViewScale] = useState(1);
  const [viewOffset, setViewOffset] = useState<Point>({ x: 0, y: 0 });
  const [busy, setBusy] = useState(false);
  const [repairing, setRepairing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [backgroundDataUrl, setBackgroundDataUrl] = useState<string | null>(null);
  const [status, setStatus] = useState('Pinch to zoom the room, then tap an object to select it.');
  const [error, setError] = useState<string | null>(null);

  const positionRef = useRef(position); const scaleRef = useRef(scale); const rotationRef = useRef(rotation);
  const viewScaleRef = useRef(viewScale); const viewOffsetRef = useRef(viewOffset); const strokesRef = useRef(strokes); const refineModeRef = useRef(refineMode);
  useEffect(() => { positionRef.current = position; }, [position]);
  useEffect(() => { scaleRef.current = scale; }, [scale]);
  useEffect(() => { rotationRef.current = rotation; }, [rotation]);
  useEffect(() => { viewScaleRef.current = viewScale; }, [viewScale]);
  useEffect(() => { viewOffsetRef.current = viewOffset; }, [viewOffset]);
  useEffect(() => { strokesRef.current = strokes; }, [strokes]);
  useEffect(() => { refineModeRef.current = refineMode; }, [refineMode]);

  useEffect(() => {
    let cancelled = false;
    clearTransient();
    setViewScale(1); setViewOffset({ x: 0, y: 0 }); setError(null);
    const restore = async () => {
      if (!photoUrl) { if (!cancelled) { setSceneUrl(null); setPersistedSceneUrl(null); setStatus('Capture a room photo first.'); } return; }
      if (!projectId || !spaceId) { if (!cancelled) { setSceneUrl(photoUrl); setPersistedSceneUrl(photoUrl); } return; }
      try {
        const saved = await loadLatestPhotoArrangement(projectId, spaceId);
        if (cancelled) return;
        setSceneUrl(saved?.sceneUrl ?? photoUrl); setPersistedSceneUrl(saved?.sceneUrl ?? photoUrl);
        setStatus(saved ? 'Saved arrangement restored. Zoom in, then tap an object.' : 'Pinch to zoom the room, then tap an object to select it.');
      } catch (err) {
        if (!cancelled) { setSceneUrl(photoUrl); setPersistedSceneUrl(photoUrl); setError(message(err, 'Could not restore the latest arrangement.')); }
      }
    };
    void restore(); return () => { cancelled = true; };
  }, [photoUrl, projectId, spaceId, snapshot.spaceId]);

  useEffect(() => {
    if (!sceneUrl) return;
    let cancelled = false;
    void loadSceneIntoCanvas(sceneUrl).then(({ canvas, width, height }) => {
      if (!cancelled) { sourceCanvasRef.current = canvas; setImageSize({ width, height }); }
    }).catch((err) => { if (!cancelled) setError(message(err, 'Could not prepare the room photo.')); });
    return () => { cancelled = true; };
  }, [sceneUrl]);

  function clearTransient() {
    setCandidate(null); setSelection(null); setRefineMode('add'); setStrokes([]); setRedoStrokes([]); setLiveStroke(null); setLoupePoint(null);
    setBackgroundDataUrl(null); sourceBeforeLiftRef.current = null; viewportPointers.current.clear(); transformPointers.current.clear();
    viewBaseRef.current = null; transformBaseRef.current = null; tapRef.current = null; activeStrokeRef.current = null;
  }

  const displayCutout = useMemo(() => selection ? {
    width: (selection.bbox.width / imageSize.width) * stageSize.width * scale,
    height: (selection.bbox.height / imageSize.height) * stageSize.height * scale,
  } : null, [selection, imageSize, stageSize, scale]);
  const screenCutout = useMemo(() => selection && displayCutout ? {
    width: displayCutout.width * viewScale, height: displayCutout.height * viewScale,
    left: viewOffset.x + (position.x * stageSize.width - displayCutout.width / 2) * viewScale,
    top: viewOffset.y + (position.y * stageSize.height - displayCutout.height / 2) * viewScale,
  } : null, [selection, displayCutout, viewScale, viewOffset, position, stageSize]);

  async function selectAt(x: number, y: number) {
    const source = sourceCanvasRef.current; if (!source || busy || candidate || selection) return;
    setBusy(true); setError(null); setStatus('Finding object edges…');
    try {
      const initial: RefinementStroke[] = [{ mode: 'add', points: [{ x, y }] }];
      const next = await computeSelection(source, initial, segmenterRef);
      if (!next) throw new Error('FormShift could not isolate a distinct object there. Try the center of the object.');
      setCandidate(next); setStrokes(initial); setRedoStrokes([]); setRefineMode('add');
      setStatus('Selection preview ready. Paint Add or Remove, then choose Use selection.');
    } catch (err) { setError(message(err, 'Object selection failed.')); setStatus('Tap another point and try again.'); }
    finally { setBusy(false); }
  }

  async function recompute(nextStrokes: RefinementStroke[], success: string) {
    const source = sourceCanvasRef.current; if (!source || busy || !nextStrokes.length) return false;
    setBusy(true); setError(null);
    try {
      const next = await computeSelection(source, nextStrokes, segmenterRef);
      if (!next) throw new Error('That refinement removed too much. The previous selection is unchanged.');
      setCandidate(next); setStrokes(nextStrokes); setStatus(success); return true;
    } catch (err) { setError(message(err, 'Selection refinement failed.')); return false; }
    finally { setBusy(false); }
  }

  async function undoRefinement() {
    if (strokes.length <= 1 || busy) return;
    const removed = strokes[strokes.length - 1]!; const next = strokes.slice(0, -1);
    if (await recompute(next, 'Last refinement undone.')) setRedoStrokes((items) => [removed, ...items]);
  }
  async function redoRefinement() {
    if (!redoStrokes.length || busy) return;
    const restored = redoStrokes[0]!; const next = [...strokes, restored];
    if (await recompute(next, 'Refinement restored.')) setRedoStrokes((items) => items.slice(1));
  }

  async function useSelection() {
    const source = sourceCanvasRef.current; const next = candidate; if (!source || !next || busy) return;
    setBusy(true); setError(null); setStatus('Lifting the refined object…');
    try {
      sourceBeforeLiftRef.current = source;
      const localBackground = await createLocalRepair(source, next.maskUrl);
      setSelection(next); setCandidate(null); setStrokes([]); setRedoStrokes([]); setLiveStroke(null); setLoupePoint(null);
      setPosition({ x: next.centerX, y: next.centerY }); setScale(1); setRotation(0); setBackgroundDataUrl(null); setSceneUrl(localBackground);
      setStatus('Object lifted. Drag it directly; use outside gestures to navigate the room.');
    } catch (err) { sourceBeforeLiftRef.current = null; setError(message(err, 'Could not lift the selection.')); }
    finally { setBusy(false); }
  }

  function cancelCandidate() { setCandidate(null); setStrokes([]); setRedoStrokes([]); setLiveStroke(null); setLoupePoint(null); setRefineMode('add'); setError(null); setStatus('Selection canceled.'); }
  function fitPhoto() { viewportPointers.current.clear(); viewBaseRef.current = null; tapRef.current = null; activeStrokeRef.current = null; setLoupePoint(null); setViewScale(1); setViewOffset({ x: 0, y: 0 }); }

  function resetViewBase() {
    const points = [...viewportPointers.current.values()];
    if (!points.length) { viewBaseRef.current = null; return; }
    viewBaseRef.current = { scale: viewScaleRef.current, offset: viewOffsetRef.current, centroid: centroid(points), distance: points.length >= 2 ? distance(points[0]!, points[1]!) : 0 };
  }

  function beginViewport(event: React.PointerEvent<HTMLDivElement>) {
    event.preventDefault(); event.stopPropagation(); event.currentTarget.setPointerCapture?.(event.pointerId);
    const p = localPoint(event.currentTarget, event.clientX, event.clientY); viewportPointers.current.set(event.pointerId, p);
    if (viewportPointers.current.size >= 2) { activeStrokeRef.current = null; setLiveStroke(null); setLoupePoint(null); tapRef.current = null; resetViewBase(); return; }

    if (candidate) {
      if (refineModeRef.current === 'pan') { resetViewBase(); return; }
      const ip = stageToImage(p, viewScaleRef.current, viewOffsetRef.current, stageSize);
      if (ip) {
        const stroke = { pointerId: event.pointerId, mode: refineModeRef.current as StrokeMode, points: [ip] };
        activeStrokeRef.current = stroke; setLiveStroke({ mode: stroke.mode, points: stroke.points }); setLoupePoint(p);
      }
      return;
    }

    tapRef.current = { pointerId: event.pointerId, start: p, moved: false, startedAt: Date.now() }; resetViewBase();
  }

  function moveViewport(event: React.PointerEvent<HTMLDivElement>) {
    if (!viewportPointers.current.has(event.pointerId)) return;
    event.preventDefault(); event.stopPropagation();
    const p = localPoint(event.currentTarget, event.clientX, event.clientY); viewportPointers.current.set(event.pointerId, p);
    const points = [...viewportPointers.current.values()]; const base = viewBaseRef.current;

    if (points.length >= 2) {
      activeStrokeRef.current = null; setLiveStroke(null); setLoupePoint(null); tapRef.current = null;
      if (!base || base.distance <= 4) { resetViewBase(); return; }
      const c = centroid(points); const d = distance(points[0]!, points[1]!); const nextScale = clamp(base.scale * (d / base.distance), 1, 5);
      const anchorX = (base.centroid.x - base.offset.x) / Math.max(base.scale, .001); const anchorY = (base.centroid.y - base.offset.y) / Math.max(base.scale, .001);
      setViewScale(nextScale); setViewOffset(clampOffset({ x: c.x - anchorX * nextScale, y: c.y - anchorY * nextScale }, nextScale, stageSize)); return;
    }

    if (candidate) {
      if (refineModeRef.current === 'pan') {
        if (!base) { resetViewBase(); return; }
        if (base.scale > 1.001) { const c = centroid(points); setViewOffset(clampOffset({ x: base.offset.x + c.x - base.centroid.x, y: base.offset.y + c.y - base.centroid.y }, base.scale, stageSize)); }
        return;
      }
      const active = activeStrokeRef.current; if (!active || active.pointerId !== event.pointerId) return;
      const ip = stageToImage(p, viewScaleRef.current, viewOffsetRef.current, stageSize); if (!ip) return;
      const last = active.points[active.points.length - 1]!;
      const screenDelta = distance({ x: last.x * stageSize.width * viewScaleRef.current, y: last.y * stageSize.height * viewScaleRef.current }, { x: ip.x * stageSize.width * viewScaleRef.current, y: ip.y * stageSize.height * viewScaleRef.current });
      if (screenDelta >= 5) active.points.push(ip);
      setLiveStroke({ mode: active.mode, points: [...active.points] }); setLoupePoint(p); return;
    }

    const tap = tapRef.current; if (tap && tap.pointerId === event.pointerId && distance(tap.start, p) > 7) tap.moved = true;
    if (tap?.moved && base?.scale && base.scale > 1.001) { const c = centroid(points); setViewOffset(clampOffset({ x: base.offset.x + c.x - base.centroid.x, y: base.offset.y + c.y - base.centroid.y }, base.scale, stageSize)); }
  }

  function endViewport(event: React.PointerEvent<HTMLDivElement>) {
    if (!viewportPointers.current.has(event.pointerId)) return;
    event.preventDefault(); event.stopPropagation();
    const p = localPoint(event.currentTarget, event.clientX, event.clientY); const wasOnly = viewportPointers.current.size === 1; viewportPointers.current.delete(event.pointerId);

    if (candidate && activeStrokeRef.current?.pointerId === event.pointerId) {
      const active = activeStrokeRef.current; activeStrokeRef.current = null; setLiveStroke(null); setLoupePoint(null);
      if (active.points.length) {
        const nextStroke: RefinementStroke = { mode: active.mode, points: simplifyStroke(active.points) };
        const next = [...strokesRef.current, nextStroke]; setRedoStrokes([]);
        void recompute(next, `${active.mode === 'add' ? 'Added' : 'Removed'} painted area. Keep refining or use selection.`);
      }
    } else if (!candidate && !selection && wasOnly) {
      const tap = tapRef.current;
      if (tap && tap.pointerId === event.pointerId && !tap.moved && Date.now() - tap.startedAt < 650) {
        const ip = stageToImage(p, viewScaleRef.current, viewOffsetRef.current, stageSize); if (ip) void selectAt(ip.x, ip.y);
      }
    }

    if (viewportPointers.current.size) resetViewBase(); else viewBaseRef.current = null;
    if (tapRef.current?.pointerId === event.pointerId) tapRef.current = null;
  }

  function resetTransformBase() {
    const points = [...transformPointers.current.values()]; if (!points.length) { transformBaseRef.current = null; return; }
    transformBaseRef.current = { position: positionRef.current, scale: scaleRef.current, rotation: rotationRef.current, centroid: centroid(points), distance: points.length >= 2 ? distance(points[0]!, points[1]!) : 0, angle: points.length >= 2 ? angle(points[0]!, points[1]!) : 0 };
  }
  function beginTransform(event: React.PointerEvent<HTMLDivElement>) { event.preventDefault(); event.stopPropagation(); event.currentTarget.setPointerCapture?.(event.pointerId); transformPointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY }); resetTransformBase(); }
  function moveTransform(event: React.PointerEvent<HTMLDivElement>) {
    if (!transformPointers.current.has(event.pointerId)) return; event.preventDefault(); event.stopPropagation(); transformPointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    const points = [...transformPointers.current.values()]; const base = transformBaseRef.current; if (!base || !points.length) return; const c = centroid(points);
    setPosition({ x: clamp(base.position.x + (c.x - base.centroid.x) / Math.max(stageSize.width * viewScaleRef.current, 1), .02, .98), y: clamp(base.position.y + (c.y - base.centroid.y) / Math.max(stageSize.height * viewScaleRef.current, 1), .02, .98) });
    if (points.length >= 2) { const d = distance(points[0]!, points[1]!); const a = angle(points[0]!, points[1]!); if (base.distance > 4) setScale(clamp(base.scale * (d / base.distance), .35, 2.2)); setRotation(base.rotation + normalizeAngle(a - base.angle)); }
  }
  function endTransform(event: React.PointerEvent<HTMLDivElement>) { if (!transformPointers.current.has(event.pointerId)) return; event.preventDefault(); event.stopPropagation(); transformPointers.current.delete(event.pointerId); if (transformPointers.current.size) resetTransformBase(); else transformBaseRef.current = null; }

  async function refineBackground() {
    const source = sourceBeforeLiftRef.current; if (!selection || !source || repairing) return;
    setRepairing(true); setError(null); setStatus('AI is repairing the old location while you keep arranging.');
    try {
      const repaired = await repairBackground({ projectId, spaceId, token: auth.session?.access_token, sourceCanvas: source, maskUrl: selection.maskUrl });
      if (!repaired) throw new Error('AI background repair is unavailable.');
      setBackgroundDataUrl(repaired); setSceneUrl(repaired); setStatus('Background repaired. Keep arranging.');
    } catch (err) { setError(message(err, 'Background repair failed.')); }
    finally { setRepairing(false); }
  }

  async function keepPlacement() {
    if (!selection || !sceneUrl || saving) return;
    if (!projectId || !spaceId || !auth.session) { setError('A signed-in editable room is required to save this arrangement.'); return; }
    setSaving(true); setError(null); setStatus('Saving this photo arrangement…');
    try {
      const composite = await compositeScene({ sceneUrl, selection, position, scale, rotation, imageSize });
      const saved = await persistPhotoArrangement({ projectId, spaceId, userId: auth.session.user.id, baseSpatialVersionId, resultDataUrl: composite, maskDataUrl: selection.maskUrl, cutoutDataUrl: selection.cutoutUrl, backgroundDataUrl, transform: { x: position.x, y: position.y, scale, rotationDeg: rotation, bbox: selection.bbox, rendererVersion: 'photo-arrange-1.7' } });
      setSceneUrl(saved.sceneUrl); setPersistedSceneUrl(saved.sceneUrl); setSelection(null); setBackgroundDataUrl(null); sourceBeforeLiftRef.current = null; setStatus('Placement saved. It will restore after refresh.');
    } catch (err) { setError(message(err, 'Could not save this placement.')); }
    finally { setSaving(false); }
  }

  function resetScene() { setSceneUrl(persistedSceneUrl ?? photoUrl ?? null); clearTransient(); setScale(1); setRotation(0); setViewScale(1); setViewOffset({ x: 0, y: 0 }); setStatus('Scene reset. Zoom in, then tap an object.'); setError(null); }

  if (!photoUrl) return <View style={styles.empty}><Text style={styles.title}>Capture a room photo first.</Text><Text style={styles.body}>Arrange works directly on the real room image.</Text></View>;

  return <View style={styles.shell}>
    <View style={styles.toolbar}>
      <View style={styles.toolbarCopy}><Text style={styles.kicker}>PHOTO ARRANGE</Text><Text style={styles.title}>{candidate ? 'Paint the selection before you lift it.' : 'Tap it. Lift it. Move it.'}</Text><Text style={styles.body}>{status}</Text></View>
      <View style={styles.topActions}><View style={styles.zoomPill}><Text style={styles.zoomPillStrong}>{viewScale.toFixed(1)}×</Text><Text style={styles.zoomPillText}>view</Text></View><Pressable disabled={viewScale <= 1.01} style={[styles.compactButton, viewScale <= 1.01 && styles.disabled]} onPress={fitPhoto}><Text style={styles.compactButtonText}>Fit photo</Text></Pressable></View>
    </View>

    <View style={[styles.stage, { aspectRatio: imageSize.width / imageSize.height }, SHIELD]} onLayout={(event) => setStageSize(event.nativeEvent.layout)}>
      {sceneUrl ? <div aria-hidden="true" style={{ position:'absolute', inset:0, zIndex:1, pointerEvents:'none', transform:`matrix(${viewScale},0,0,${viewScale},${viewOffset.x},${viewOffset.y})`, transformOrigin:'0 0' }}>
        <img src={sceneUrl} alt="" draggable={false} style={{ width:'100%', height:'100%', objectFit:'contain', display:'block' }} />
        {candidate ? <img src={candidate.previewUrl} alt="" draggable={false} style={{ position:'absolute', inset:0, width:'100%', height:'100%', objectFit:'contain', display:'block', opacity:.92 }} /> : null}
      </div> : null}

      <div role="application" aria-label={candidate ? 'Selection refinement surface' : 'Room photo'} onPointerDown={beginViewport} onPointerMove={moveViewport} onPointerUp={endViewport} onPointerCancel={endViewport} onContextMenu={(e)=>e.preventDefault()} onDragStart={(e)=>e.preventDefault()} style={{ position:'absolute', inset:0, zIndex:4, cursor:candidate && refineMode !== 'pan' ? 'crosshair' : viewScale > 1.01 ? 'grab' : 'crosshair', ...SHIELD }} />

      {candidate && liveStroke ? <StrokeOverlay stroke={liveStroke} stageSize={stageSize} viewScale={viewScale} viewOffset={viewOffset} /> : null}
      {candidate && loupePoint && sceneUrl ? <Loupe sceneUrl={sceneUrl} point={loupePoint} stageSize={stageSize} viewScale={viewScale} viewOffset={viewOffset} mode={refineMode === 'remove' ? 'remove' : 'add'} /> : null}

      {selection && screenCutout ? <>
        <div aria-label="Move selected object" role="slider" onPointerDown={beginTransform} onPointerMove={moveTransform} onPointerUp={endTransform} onPointerCancel={endTransform} onContextMenu={(e)=>e.preventDefault()} style={{ position:'absolute', zIndex:7, left:screenCutout.left-12, top:screenCutout.top-12, width:screenCutout.width+24, height:screenCutout.height+24, borderRadius:12, cursor:'grab', ...SHIELD }} />
        <div style={{ position:'absolute', zIndex:6, pointerEvents:'none', width:screenCutout.width, height:screenCutout.height, left:screenCutout.left, top:screenCutout.top, transform:`rotate(${rotation}deg)`, transformOrigin:'center', borderRadius:7, boxShadow:'0 0 0 2px rgba(40,199,232,.9),0 12px 24px rgba(0,0,0,.12)' }}><img src={selection.cutoutUrl} alt="" draggable={false} style={{ width:'100%', height:'100%', objectFit:'contain', display:'block' }} /></div>
      </> : null}

      {busy ? <View pointerEvents="none" style={styles.busyOverlay}><ActivityIndicator color="#fff"/><Text style={styles.busyText}>{candidate ? 'Updating selection…' : 'Selecting object…'}</Text></View> : null}
      {repairing ? <View pointerEvents="none" style={styles.repairBadge}><ActivityIndicator size="small" color={tokens.color.blue}/><Text style={styles.repairBadgeText}>Repairing background…</Text></View> : null}
    </View>

    <View style={styles.controlTray}>
      {candidate ? <>
        <View style={styles.trayHeader}><View style={styles.trayHeaderCopy}><Text style={styles.trayTitle}>Refine selection</Text><Text style={styles.trayHint}>{refineMode === 'pan' ? 'Drag to pan the zoomed room. Two fingers always zoom.' : `Drag your finger to ${refineMode} areas. Two fingers still zoom.`}</Text></View><Text style={styles.pointCount}>{Math.max(0, strokes.length-1)} strokes</Text></View>
        <View style={styles.refineRow}>
          <Pressable style={[styles.modeButton, refineMode==='add' && styles.modeButtonActive]} onPress={()=>setRefineMode('add')}><Text style={[styles.modeButtonText, refineMode==='add' && styles.modeButtonTextActive]}>＋ Add</Text></Pressable>
          <Pressable style={[styles.modeButton, refineMode==='remove' && styles.removeButtonActive]} onPress={()=>setRefineMode('remove')}><Text style={[styles.modeButtonText, refineMode==='remove' && styles.removeButtonTextActive]}>− Remove</Text></Pressable>
          <Pressable style={[styles.modeButton, refineMode==='pan' && styles.modeButtonActive]} onPress={()=>setRefineMode('pan')}><Text style={[styles.modeButtonText, refineMode==='pan' && styles.modeButtonTextActive]}>↔ Pan</Text></Pressable>
          <Pressable disabled={strokes.length<=1 || busy} style={[styles.squareButton,(strokes.length<=1||busy)&&styles.disabled]} onPress={()=>void undoRefinement()}><Text style={styles.squareButtonText}>↶</Text></Pressable>
          <Pressable disabled={!redoStrokes.length || busy} style={[styles.squareButton,(!redoStrokes.length||busy)&&styles.disabled]} onPress={()=>void redoRefinement()}><Text style={styles.squareButtonText}>↷</Text></Pressable>
          <Pressable disabled={busy} style={styles.primaryButton} onPress={()=>void useSelection()}><Text style={styles.primaryText}>Use selection</Text></Pressable>
          <Pressable style={styles.cancelButton} onPress={cancelCandidate}><Text style={styles.cancelText}>Cancel</Text></Pressable>
        </View>
      </> : selection ? <>
        <View style={styles.trayHeader}><View style={styles.trayHeaderCopy}><Text style={styles.trayTitle}>Arrange object</Text><Text style={styles.trayHint}>Drag the object. Pinch/twist on it to resize/rotate; gestures outside navigate the room.</Text></View></View>
        <View style={styles.refineRow}>
          <Pressable style={styles.squareButton} onPress={()=>setScale(v=>clamp(v-.1,.35,2.2))}><Text style={styles.squareButtonText}>−</Text></Pressable><Pressable style={styles.squareButton} onPress={()=>setScale(v=>clamp(v+.1,.35,2.2))}><Text style={styles.squareButtonText}>＋</Text></Pressable><Pressable style={styles.squareButton} onPress={()=>setRotation(v=>v-5)}><Text style={styles.squareButtonText}>↺</Text></Pressable><Pressable style={styles.squareButton} onPress={()=>setRotation(v=>v+5)}><Text style={styles.squareButtonText}>↻</Text></Pressable>
          <Pressable disabled={repairing} style={[styles.aiButton,repairing&&styles.disabled]} onPress={()=>void refineBackground()}><Text style={styles.aiText}>{repairing?'Repairing…':'AI repair'}</Text></Pressable><Pressable disabled={saving} style={[styles.primaryButton,saving&&styles.disabled]} onPress={()=>void keepPlacement()}><Text style={styles.primaryText}>{saving?'Saving…':'Keep placement'}</Text></Pressable>
        </View>
      </> : <View style={styles.idleTray}><Text style={styles.trayHint}>2 fingers zoom · 1 finger pans when zoomed · short tap selects</Text><Pressable style={styles.cancelButton} onPress={resetScene}><Text style={styles.cancelText}>Reset scene</Text></Pressable></View>}
    </View>

    {error ? <Text style={styles.error}>{error}</Text> : null}
    <View style={styles.footer}><Text style={styles.footerStrong}>Paint the mask before pixels move.</Text><Text style={styles.footerText}>Continuous Add/Remove refinement, mask preview, undo/redo, and the loupe run locally in your browser. AI background repair remains explicit. Saved placements are derived photo versions; the source room photo is never overwritten.</Text></View>
  </View>;
}

function StrokeOverlay({ stroke, stageSize, viewScale, viewOffset }: { stroke: RefinementStroke; stageSize:{width:number;height:number}; viewScale:number; viewOffset:Point }) {
  const points = stroke.points.map(p => `${viewOffset.x + p.x*stageSize.width*viewScale},${viewOffset.y + p.y*stageSize.height*viewScale}`).join(' ');
  return <svg aria-hidden="true" style={{position:'absolute',inset:0,zIndex:8,pointerEvents:'none',width:'100%',height:'100%'}}><polyline points={points} fill="none" stroke={stroke.mode==='add'?'#0D7496':'#A84C4C'} strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" opacity="0.8" /></svg>;
}

function Loupe({ sceneUrl, point, stageSize, viewScale, viewOffset, mode }: { sceneUrl:string; point:Point; stageSize:{width:number;height:number}; viewScale:number; viewOffset:Point; mode:StrokeMode }) {
  const size=92, mag=2.4; const left=clamp(point.x+20,8,Math.max(8,stageSize.width-size-8)); const top=clamp(point.y-size-24,8,Math.max(8,stageSize.height-size-8));
  const innerScale=viewScale*mag; const offsetX=size/2-point.x*mag+viewOffset.x*mag; const offsetY=size/2-point.y*mag+viewOffset.y*mag; const color=mode==='add'?'#0D7496':'#A84C4C';
  return <div aria-hidden="true" style={{position:'absolute',zIndex:20,left,top,width:size,height:size,borderRadius:size/2,overflow:'hidden',pointerEvents:'none',border:`3px solid ${color}`,boxShadow:'0 8px 24px rgba(0,0,0,.24),0 0 0 2px rgba(255,255,255,.9)',background:'#fff'}}><img src={sceneUrl} alt="" draggable={false} style={{position:'absolute',left:0,top:0,width:stageSize.width,height:stageSize.height,objectFit:'contain',transform:`matrix(${innerScale},0,0,${innerScale},${offsetX},${offsetY})`,transformOrigin:'0 0',maxWidth:'none'}}/><div style={{position:'absolute',left:size/2-9,top:size/2-1,width:18,height:2,background:color}}/><div style={{position:'absolute',left:size/2-1,top:size/2-9,width:2,height:18,background:color}}/></div>;
}

async function getSegmenter(ref:{current:any}) {
  if (ref.current) return ref.current;
  const dynamicImport=new Function('url','return import(url)') as (url:string)=>Promise<SegmenterModule>; const module=await dynamicImport(MEDIAPIPE_BUNDLE); const fileset=await module.FilesetResolver.forVisionTasks(MEDIAPIPE_WASM);
  ref.current=await module.InteractiveSegmenter.createFromOptions(fileset,{baseOptions:{modelAssetPath:MAGIC_TOUCH_MODEL},outputConfidenceMasks:true,outputCategoryMask:false}); ref.current.__formshiftBrushMode=module.BrushMode; return ref.current;
}

async function computeSelection(canvas:HTMLCanvasElement, strokes:RefinementStroke[], segmenterRef:{current:any}) {
  const segmenter=await getSegmenter(segmenterRef); const mask=runSegmenter(segmenter,canvas,strokes); const next=createSelection(canvas,mask,strokes); mask?.close?.(); return next;
}
function runSegmenter(segmenter:any,image:HTMLCanvasElement,strokes:RefinementStroke[]) {
  const seed=strokes.find(s=>s.mode==='add')?.points[0]; if (!seed) return null;
  if (typeof segmenter.setImage==='function') { segmenter.setImage(image); const positive=segmenter.__formshiftBrushMode?.POSITIVE??1; const negative=segmenter.__formshiftBrushMode?.NEGATIVE??segmenter.__formshiftBrushMode?.BACKGROUND??0; const result=segmenter.segment(strokes.map(s=>({brushMode:s.mode==='add'?positive:negative,point:s.points,isCompleted:true}))); return result?.confidenceMasks?.[0]??result; }
  const result=segmenter.segment(image,{keypoint:{x:seed.x,y:seed.y}}); return result?.confidenceMasks?.[0]??result;
}

function createSelection(canvas:HTMLCanvasElement,mask:any,strokes:RefinementStroke[]):Selection|null {
  if (!mask?.getAsFloat32Array) return null; const seed=strokes.find(s=>s.mode==='add')?.points[0]; if (!seed) return null;
  const values=mask.getAsFloat32Array() as Float32Array; const mw=mask.width as number; const mh=mask.height as number; const component=isolateSeeded(values,mw,mh,seed.x,seed.y); if (!component) return null;
  let edited=erode(dilate(component,mw,mh),mw,mh); edited=paintStrokes(edited,mw,mh,strokes.slice(1)); const feather=featherMask(edited,mw,mh);
  let minX=mw,minY=mh,maxX=-1,maxY=-1; for(let y=0;y<mh;y++)for(let x=0;x<mw;x++)if(edited[y*mw+x]){minX=Math.min(minX,x);minY=Math.min(minY,y);maxX=Math.max(maxX,x);maxY=Math.max(maxY,y);} if(maxX<=minX||maxY<=minY)return null;
  const sx=canvas.width/mw,sy=canvas.height/mh,pad=4; const x0=Math.max(0,Math.floor(minX*sx)-pad),y0=Math.max(0,Math.floor(minY*sy)-pad),x1=Math.min(canvas.width,Math.ceil((maxX+1)*sx)+pad),y1=Math.min(canvas.height,Math.ceil((maxY+1)*sy)+pad),width=x1-x0,height=y1-y0;
  const source=canvas.getContext('2d',{willReadFrequently:true})!.getImageData(x0,y0,width,height); const cut=document.createElement('canvas');cut.width=width;cut.height=height;const cctx=cut.getContext('2d')!;const ci=cctx.createImageData(width,height);
  for(let y=0;y<height;y++)for(let x=0;x<width;x++){const mx=clamp(Math.floor((x+x0)/sx),0,mw-1),my=clamp(Math.floor((y+y0)/sy),0,mh-1),a=Math.round(feather[my*mw+mx]!*255),i=(y*width+x)*4;ci.data[i]=source.data[i]!;ci.data[i+1]=source.data[i+1]!;ci.data[i+2]=source.data[i+2]!;ci.data[i+3]=a;} cctx.putImageData(ci,0,0);
  const repair=dilate(dilate(edited,mw,mh),mw,mh); const maskCanvas=document.createElement('canvas');maskCanvas.width=canvas.width;maskCanvas.height=canvas.height;const mctx=maskCanvas.getContext('2d')!,mi=mctx.createImageData(canvas.width,canvas.height); const preview=document.createElement('canvas');preview.width=canvas.width;preview.height=canvas.height;const pctx=preview.getContext('2d')!,pi=pctx.createImageData(canvas.width,canvas.height);
  for(let y=0;y<canvas.height;y++)for(let x=0;x<canvas.width;x++){const mx=clamp(Math.floor(x/sx),0,mw-1),my=clamp(Math.floor(y/sy),0,mh-1),sel=!!edited[my*mw+mx],rep=repair[my*mw+mx]?255:0,i=(y*canvas.width+x)*4;mi.data[i]=rep;mi.data[i+1]=rep;mi.data[i+2]=rep;mi.data[i+3]=255;pi.data[i]=13;pi.data[i+1]=116;pi.data[i+2]=150;pi.data[i+3]=sel?92:0;} mctx.putImageData(mi,0,0);pctx.putImageData(pi,0,0);
  return {cutoutUrl:cut.toDataURL('image/png'),maskUrl:maskCanvas.toDataURL('image/png'),previewUrl:preview.toDataURL('image/png'),bbox:{x:x0,y:y0,width,height},centerX:(x0+width/2)/canvas.width,centerY:(y0+height/2)/canvas.height};
}

function paintStrokes(mask:Uint8Array,width:number,height:number,strokes:RefinementStroke[]) { const out=new Uint8Array(mask); const radius=Math.max(3,Math.round(Math.min(width,height)*.012)); for(const s of strokes){for(const p of s.points){const cx=clamp(Math.round(p.x*(width-1)),0,width-1),cy=clamp(Math.round(p.y*(height-1)),0,height-1);for(let y=Math.max(0,cy-radius);y<=Math.min(height-1,cy+radius);y++)for(let x=Math.max(0,cx-radius);x<=Math.min(width-1,cx+radius);x++){const dx=x-cx,dy=y-cy;if(dx*dx+dy*dy<=radius*radius)out[y*width+x]=s.mode==='add'?1:0;}}} return out; }
function isolateSeeded(values:Float32Array,width:number,height:number,seedX:number,seedY:number){const threshold=.34;let sx=clamp(Math.round(seedX*(width-1)),0,width-1),sy=clamp(Math.round(seedY*(height-1)),0,height-1);if(values[sy*width+sx]!<threshold){let best=values[sy*width+sx]!,bx=sx,by=sy;for(let r=1;r<=12;r++){for(let y=Math.max(0,sy-r);y<=Math.min(height-1,sy+r);y++)for(let x=Math.max(0,sx-r);x<=Math.min(width-1,sx+r);x++){const score=values[y*width+x]!;if(score>best){best=score;bx=x;by=y;}}if(best>=threshold)break;}if(best<threshold)return null;sx=bx;sy=by;}const selected=new Uint8Array(width*height),qx=new Int32Array(width*height),qy=new Int32Array(width*height);let head=0,tail=0;qx[tail]=sx;qy[tail]=sy;tail++;selected[sy*width+sx]=1;while(head<tail){const cx=qx[head]!,cy=qy[head]!;head++;for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){if(!dx&&!dy)continue;const nx=cx+dx,ny=cy+dy;if(nx<0||nx>=width||ny<0||ny>=height)continue;const i=ny*width+nx;if(selected[i]||values[i]!<threshold)continue;selected[i]=1;qx[tail]=nx;qy[tail]=ny;tail++;}}return tail>=8?selected:null;}
function dilate(mask:Uint8Array,width:number,height:number){const out=new Uint8Array(mask.length);for(let y=0;y<height;y++)for(let x=0;x<width;x++){let v=0;for(let dy=-1;dy<=1&&!v;dy++)for(let dx=-1;dx<=1;dx++){const nx=x+dx,ny=y+dy;if(nx>=0&&nx<width&&ny>=0&&ny<height&&mask[ny*width+nx]){v=1;break;}}out[y*width+x]=v;}return out;}
function erode(mask:Uint8Array,width:number,height:number){const out=new Uint8Array(mask.length);for(let y=0;y<height;y++)for(let x=0;x<width;x++){let keep=1;for(let dy=-1;dy<=1&&keep;dy++)for(let dx=-1;dx<=1;dx++){const nx=x+dx,ny=y+dy;if(nx<0||nx>=width||ny<0||ny>=height||!mask[ny*width+nx]){keep=0;break;}}out[y*width+x]=keep;}return out;}
function featherMask(mask:Uint8Array,width:number,height:number){const out=new Float32Array(mask.length);for(let y=0;y<height;y++)for(let x=0;x<width;x++){let sum=0,count=0;for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){const nx=x+dx,ny=y+dy;if(nx<0||nx>=width||ny<0||ny>=height)continue;sum+=mask[ny*width+nx]!;count++;}const avg=count?sum/count:0,i=y*width+x;out[i]=mask[i]?clamp(.72+avg*.28,0,1):avg>=.45?clamp((avg-.45)*.42,0,.22):0;}return out;}

async function createLocalRepair(source:HTMLCanvasElement,maskUrl:string){const canvas=document.createElement('canvas');canvas.width=source.width;canvas.height=source.height;const ctx=canvas.getContext('2d',{willReadFrequently:true})!;ctx.drawImage(source,0,0);const mask=await loadImage(maskUrl);const mc=document.createElement('canvas');mc.width=source.width;mc.height=source.height;const mctx=mc.getContext('2d',{willReadFrequently:true})!;mctx.drawImage(mask,0,0,mc.width,mc.height);const md=mctx.getImageData(0,0,mc.width,mc.height).data;const image=ctx.getImageData(0,0,canvas.width,canvas.height),known=new Uint8Array(canvas.width*canvas.height);let minX=canvas.width,minY=canvas.height,maxX=-1,maxY=-1;for(let y=0;y<canvas.height;y++)for(let x=0;x<canvas.width;x++){const sel=md[(y*canvas.width+x)*4]!>=128;known[y*canvas.width+x]=sel?0:1;if(sel){minX=Math.min(minX,x);minY=Math.min(minY,y);maxX=Math.max(maxX,x);maxY=Math.max(maxY,y);}}if(maxX<minX)return canvas.toDataURL('image/jpeg',.9);const left=Math.max(1,minX-2),top=Math.max(1,minY-2),right=Math.min(canvas.width-2,maxX+2),bottom=Math.min(canvas.height-2,maxY+2);for(let pass=0;pass<96;pass++){const fills:Array<{index:number;r:number;g:number;b:number}>=[];for(let y=top;y<=bottom;y++)for(let x=left;x<=right;x++){const pi=y*canvas.width+x;if(known[pi])continue;let r=0,g=0,b=0,count=0;for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){if(!dx&&!dy)continue;const ni=(y+dy)*canvas.width+(x+dx);if(!known[ni])continue;const i=ni*4;r+=image.data[i]!;g+=image.data[i+1]!;b+=image.data[i+2]!;count++;}if(count>=2)fills.push({index:pi,r:Math.round(r/count),g:Math.round(g/count),b:Math.round(b/count)});}if(!fills.length)break;for(const f of fills){const i=f.index*4;image.data[i]=f.r;image.data[i+1]=f.g;image.data[i+2]=f.b;image.data[i+3]=255;known[f.index]=1;}}ctx.putImageData(image,0,0);return canvas.toDataURL('image/jpeg',.9);}
async function repairBackground({projectId,spaceId,token,sourceCanvas,maskUrl}:{projectId?:string;spaceId?:string;token?:string;sourceCanvas:HTMLCanvasElement;maskUrl:string}){if(!projectId||!spaceId||!token)return null;const apiBase=process.env.EXPO_PUBLIC_API_BASE_URL?.replace(/\/$/,'');if(!apiBase)return null;const response=await fetch(`${apiBase}/api/ai/repair-background`,{method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify({projectId,spaceId,sourceDataUrl:resizedDataUrl(sourceCanvas,1100),maskDataUrl:maskUrl})});if(!response.ok)return null;const data=await response.json() as {imageDataUrl?:string};return data.imageDataUrl??null;}
function resizedDataUrl(source:HTMLCanvasElement,maxDimension:number){const s=Math.min(1,maxDimension/Math.max(source.width,source.height));const c=document.createElement('canvas');c.width=Math.round(source.width*s);c.height=Math.round(source.height*s);c.getContext('2d')!.drawImage(source,0,0,c.width,c.height);return c.toDataURL('image/jpeg',.88);}
async function compositeScene({sceneUrl,selection,position,scale,rotation,imageSize}:{sceneUrl:string;selection:Selection;position:Point;scale:number;rotation:number;imageSize:{width:number;height:number}}){const c=document.createElement('canvas');c.width=imageSize.width;c.height=imageSize.height;const ctx=c.getContext('2d')!;const bg=await loadImage(sceneUrl);ctx.drawImage(bg,0,0,c.width,c.height);const cut=await loadImage(selection.cutoutUrl),w=selection.bbox.width*scale,h=selection.bbox.height*scale;ctx.save();ctx.translate(position.x*c.width,position.y*c.height);ctx.rotate(rotation*Math.PI/180);ctx.drawImage(cut,-w/2,-h/2,w,h);ctx.restore();return c.toDataURL('image/jpeg',.92);}
async function loadSceneIntoCanvas(url:string){const image=await loadImage(url),max=1400,s=Math.min(1,max/Math.max(image.naturalWidth||image.width,image.naturalHeight||image.height)),width=Math.max(1,Math.round((image.naturalWidth||image.width)*s)),height=Math.max(1,Math.round((image.naturalHeight||image.height)*s)),canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;canvas.getContext('2d',{willReadFrequently:true})!.drawImage(image,0,0,width,height);return{canvas,width,height};}
function loadImage(url:string){return new Promise<HTMLImageElement>((resolve,reject)=>{const image=new window.Image();image.crossOrigin='anonymous';image.onload=()=>resolve(image);image.onerror=()=>reject(new Error('The room photo could not be loaded for pixel editing.'));image.src=url;});}
function simplifyStroke(points:Point[]){if(points.length<=2)return points;const out=[points[0]!];for(let i=1;i<points.length-1;i++){if(distance(out[out.length-1]!,points[i]!)>=.004)out.push(points[i]!);}out.push(points[points.length-1]!);return out.slice(0,96);}
function localPoint(el:HTMLElement,x:number,y:number):Point{const r=el.getBoundingClientRect();return{x:x-r.left,y:y-r.top};}
function stageToImage(p:Point,s:number,o:Point,stage:{width:number;height:number}):Point|null{const x=(p.x-o.x)/Math.max(s,.001),y=(p.y-o.y)/Math.max(s,.001);if(x<0||y<0||x>stage.width||y>stage.height)return null;return{x:clamp(x/Math.max(stage.width,1),0,1),y:clamp(y/Math.max(stage.height,1),0,1)};}
function clampOffset(o:Point,s:number,stage:{width:number;height:number}){if(s<=1.001)return{x:0,y:0};return{x:clamp(o.x,stage.width*(1-s),0),y:clamp(o.y,stage.height*(1-s),0)};}
function centroid(points:Point[]){return{x:points.reduce((a,p)=>a+p.x,0)/points.length,y:points.reduce((a,p)=>a+p.y,0)/points.length};} function distance(a:Point,b:Point){return Math.hypot(b.x-a.x,b.y-a.y);} function angle(a:Point,b:Point){return Math.atan2(b.y-a.y,b.x-a.x)*180/Math.PI;} function normalizeAngle(v:number){while(v>180)v-=360;while(v<-180)v+=360;return v;} function clamp(v:number,min:number,max:number){return Math.max(min,Math.min(max,v));} function message(err:unknown,fallback:string){return err instanceof Error?err.message:fallback;}

const styles=StyleSheet.create({
  shell:{borderRadius:24,overflow:'hidden',backgroundColor:'rgba(255,255,255,.72)',borderWidth:1,borderColor:tokens.color.line},toolbar:{padding:14,gap:10,flexDirection:'row',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',backgroundColor:'rgba(250,249,246,.96)'},toolbarCopy:{flex:1,minWidth:210},kicker:{fontSize:8,fontWeight:'800',letterSpacing:1.2,color:tokens.color.peach},title:{marginTop:3,fontSize:17,fontWeight:'800',color:tokens.color.text},body:{marginTop:3,fontSize:10,lineHeight:15,color:tokens.color.muted},topActions:{flexDirection:'row',gap:6,alignItems:'center'},zoomPill:{minHeight:34,paddingHorizontal:10,borderRadius:10,flexDirection:'row',gap:4,alignItems:'center',backgroundColor:'rgba(255,255,255,.62)',borderWidth:1,borderColor:tokens.color.line},zoomPillStrong:{fontSize:9,fontWeight:'800',color:tokens.color.text},zoomPillText:{fontSize:8,color:tokens.color.muted},compactButton:{minHeight:34,paddingHorizontal:10,borderRadius:10,justifyContent:'center',backgroundColor:'#fff',borderWidth:1,borderColor:tokens.color.line},compactButtonText:{fontSize:9,fontWeight:'800',color:tokens.color.text},disabled:{opacity:.45},stage:{width:'100%',position:'relative',overflow:'hidden',backgroundColor:'#D8D5CD'},busyOverlay:{...StyleSheet.absoluteFillObject,alignItems:'center',justifyContent:'center',gap:8,backgroundColor:'rgba(20,24,25,.20)',zIndex:30},busyText:{color:'#fff',fontSize:10,fontWeight:'800'},repairBadge:{position:'absolute',right:10,top:10,zIndex:12,flexDirection:'row',alignItems:'center',gap:6,paddingHorizontal:10,paddingVertical:7,borderRadius:999,backgroundColor:'rgba(250,249,246,.94)',borderWidth:1,borderColor:tokens.color.line},repairBadgeText:{fontSize:8,fontWeight:'800',color:tokens.color.text},controlTray:{padding:11,gap:8,borderTopWidth:1,borderTopColor:tokens.color.line,backgroundColor:'rgba(250,249,246,.98)'},trayHeader:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:8},trayHeaderCopy:{flex:1},trayTitle:{fontSize:11,fontWeight:'800',color:tokens.color.text},trayHint:{marginTop:2,fontSize:8,lineHeight:12,color:tokens.color.muted},pointCount:{fontSize:8,fontWeight:'800',color:tokens.color.blue,paddingHorizontal:8,paddingVertical:5,borderRadius:999,backgroundColor:'rgba(207,229,236,.55)'},refineRow:{flexDirection:'row',flexWrap:'wrap',gap:7,alignItems:'stretch'},modeButton:{minHeight:40,minWidth:76,paddingHorizontal:11,borderRadius:11,justifyContent:'center',alignItems:'center',backgroundColor:'#fff',borderWidth:1,borderColor:tokens.color.line},modeButtonActive:{backgroundColor:'rgba(207,229,236,.72)',borderColor:'rgba(13,116,150,.45)'},removeButtonActive:{backgroundColor:'rgba(168,76,76,.08)',borderColor:'rgba(168,76,76,.38)'},modeButtonText:{fontSize:9,fontWeight:'800',color:tokens.color.text},modeButtonTextActive:{color:tokens.color.blue},removeButtonTextActive:{color:'#A84C4C'},squareButton:{width:42,minHeight:40,borderRadius:11,justifyContent:'center',alignItems:'center',backgroundColor:'#fff',borderWidth:1,borderColor:tokens.color.line},squareButtonText:{fontSize:13,fontWeight:'800',color:tokens.color.text},aiButton:{minHeight:40,flexGrow:1,minWidth:100,paddingHorizontal:12,borderRadius:11,justifyContent:'center',alignItems:'center',backgroundColor:'rgba(207,229,236,.72)',borderWidth:1,borderColor:'rgba(13,116,150,.18)'},aiText:{fontSize:9,fontWeight:'800',color:tokens.color.blue},primaryButton:{minHeight:40,flexGrow:1,minWidth:110,paddingHorizontal:13,borderRadius:11,justifyContent:'center',alignItems:'center',backgroundColor:tokens.color.blue},primaryText:{fontSize:9,fontWeight:'800',color:'#fff'},cancelButton:{minHeight:40,minWidth:78,paddingHorizontal:12,borderRadius:11,justifyContent:'center',alignItems:'center',backgroundColor:'#fff',borderWidth:1,borderColor:tokens.color.line},cancelText:{fontSize:9,fontWeight:'800',color:tokens.color.text},idleTray:{flexDirection:'row',flexWrap:'wrap',gap:8,alignItems:'center',justifyContent:'space-between'},error:{paddingHorizontal:14,paddingTop:10,fontSize:9,lineHeight:13,color:'#A84C4C'},footer:{padding:12,borderTopWidth:1,borderTopColor:tokens.color.line,backgroundColor:'rgba(250,249,246,.94)'},footerStrong:{fontSize:9,fontWeight:'800',color:tokens.color.text},footerText:{marginTop:3,fontSize:8,lineHeight:12,color:tokens.color.muted},empty:{minHeight:360,padding:28,justifyContent:'center',backgroundColor:'rgba(255,255,255,.72)',borderRadius:24}
});
