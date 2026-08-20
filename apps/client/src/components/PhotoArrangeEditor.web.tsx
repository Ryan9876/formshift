import type { SpatialSnapshot } from '@formshift/domain';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '../auth/AuthProvider';
import {
  loadLatestPhotoArrangement,
  persistPhotoArrangement,
} from '../data/photoArrangementPersistence';
import { tokens } from '../theme/tokens';

type Selection = {
  cutoutUrl: string;
  maskUrl: string;
  bbox: { x: number; y: number; width: number; height: number };
  centerX: number;
  centerY: number;
};

type SegmenterModule = {
  FilesetResolver: { forVisionTasks(path: string): Promise<unknown> };
  InteractiveSegmenter: { createFromOptions(fileset: unknown, options: unknown): Promise<any> };
  BrushMode?: { POSITIVE: unknown };
};

type Point = { x: number; y: number };
type GestureBase = {
  position: Point;
  scale: number;
  rotation: number;
  centroid: Point;
  distance: number;
  angle: number;
};

type ViewportGestureBase = {
  scale: number;
  offset: Point;
  centroid: Point;
  distance: number;
};

type TapCandidate = {
  pointerId: number;
  start: Point;
  moved: boolean;
  startedAt: number;
};

const MEDIAPIPE_BUNDLE = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.0.1/vision_bundle.mjs';
const MEDIAPIPE_WASM = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.0.1/wasm';
const MAGIC_TOUCH_MODEL = 'https://storage.googleapis.com/mediapipe-models/interactive_segmenter_v2/magic_touch/int8/1/interactive_segmentation.task';
const WEB_GESTURE_SHIELD = {
  touchAction: 'none',
  userSelect: 'none',
  WebkitUserSelect: 'none',
  WebkitTouchCallout: 'none',
} as any;

export function PhotoArrangeEditor({
  photoUrl,
  snapshot,
  projectId,
  spaceId,
  baseSpatialVersionId,
}: {
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
  const pointerMapRef = useRef(new Map<number, Point>());
  const gestureBaseRef = useRef<GestureBase | null>(null);
  const viewportPointerMapRef = useRef(new Map<number, Point>());
  const viewportGestureBaseRef = useRef<ViewportGestureBase | null>(null);
  const tapCandidateRef = useRef<TapCandidate | null>(null);

  const [sceneUrl, setSceneUrl] = useState<string | null>(photoUrl ?? null);
  const [persistedSceneUrl, setPersistedSceneUrl] = useState<string | null>(photoUrl ?? null);
  const [imageSize, setImageSize] = useState({ width: 4, height: 3 });
  const [stageSize, setStageSize] = useState({ width: 1, height: 1 });
  const [selection, setSelection] = useState<Selection | null>(null);
  const [position, setPosition] = useState({ x: 0.5, y: 0.5 });
  const [scale, setScale] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [viewScale, setViewScale] = useState(1);
  const [viewOffset, setViewOffset] = useState<Point>({ x: 0, y: 0 });
  const [selecting, setSelecting] = useState(false);
  const [repairing, setRepairing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [backgroundDataUrl, setBackgroundDataUrl] = useState<string | null>(null);
  const [status, setStatus] = useState('Pinch to zoom the room, then tap an object to select it.');
  const [error, setError] = useState<string | null>(null);

  const positionRef = useRef(position);
  const scaleRef = useRef(scale);
  const rotationRef = useRef(rotation);
  const viewScaleRef = useRef(viewScale);
  const viewOffsetRef = useRef(viewOffset);
  useEffect(() => { positionRef.current = position; }, [position]);
  useEffect(() => { scaleRef.current = scale; }, [scale]);
  useEffect(() => { rotationRef.current = rotation; }, [rotation]);
  useEffect(() => { viewScaleRef.current = viewScale; }, [viewScale]);
  useEffect(() => { viewOffsetRef.current = viewOffset; }, [viewOffset]);

  useEffect(() => {
    let cancelled = false;
    setSelection(null);
    setBackgroundDataUrl(null);
    sourceBeforeLiftRef.current = null;
    pointerMapRef.current.clear();
    gestureBaseRef.current = null;
    viewportPointerMapRef.current.clear();
    viewportGestureBaseRef.current = null;
    tapCandidateRef.current = null;
    setViewScale(1);
    setViewOffset({ x: 0, y: 0 });
    setError(null);

    const restore = async () => {
      if (!photoUrl) {
        if (!cancelled) {
          setSceneUrl(null);
          setPersistedSceneUrl(null);
          setStatus('Capture a room photo first.');
        }
        return;
      }

      if (!projectId || !spaceId) {
        if (!cancelled) {
          setSceneUrl(photoUrl);
          setPersistedSceneUrl(photoUrl);
          setStatus('Pinch to zoom the room, then tap an object to select it.');
        }
        return;
      }

      try {
        const saved = await loadLatestPhotoArrangement(projectId, spaceId);
        if (cancelled) return;
        if (saved) {
          setSceneUrl(saved.sceneUrl);
          setPersistedSceneUrl(saved.sceneUrl);
          setStatus('Saved arrangement restored. Pinch to zoom, then tap an object to move it.');
        } else {
          setSceneUrl(photoUrl);
          setPersistedSceneUrl(photoUrl);
          setStatus('Pinch to zoom the room, then tap an object to select it.');
        }
      } catch (err) {
        if (cancelled) return;
        setSceneUrl(photoUrl);
        setPersistedSceneUrl(photoUrl);
        setError(err instanceof Error ? err.message : 'Could not restore the latest photo arrangement.');
      }
    };

    void restore();
    return () => { cancelled = true; };
  }, [photoUrl, projectId, spaceId, snapshot.spaceId]);

  useEffect(() => {
    if (!sceneUrl) return;
    let cancelled = false;
    void loadSceneIntoCanvas(sceneUrl)
      .then(({ canvas, width, height }) => {
        if (cancelled) return;
        sourceCanvasRef.current = canvas;
        setImageSize({ width, height });
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Could not prepare the room photo for editing.');
      });
    return () => { cancelled = true; };
  }, [sceneUrl]);

  const displayCutout = useMemo(() => {
    if (!selection) return null;
    return {
      width: (selection.bbox.width / imageSize.width) * stageSize.width * scale,
      height: (selection.bbox.height / imageSize.height) * stageSize.height * scale,
    };
  }, [selection, imageSize, stageSize, scale]);

  const screenCutout = useMemo(() => {
    if (!selection || !displayCutout) return null;
    return {
      width: displayCutout.width * viewScale,
      height: displayCutout.height * viewScale,
      left: viewOffset.x + (position.x * stageSize.width - displayCutout.width / 2) * viewScale,
      top: viewOffset.y + (position.y * stageSize.height - displayCutout.height / 2) * viewScale,
    };
  }, [selection, displayCutout, viewScale, viewOffset, position, stageSize]);

  const handleSelectAt = async (x: number, y: number) => {
    const source = sourceCanvasRef.current;
    if (selection || selecting || !source) return;
    setSelecting(true);
    setError(null);
    setStatus('Finding object edges…');

    try {
      const segmenter = await getSegmenter(segmenterRef);
      const mask = runSegmenter(segmenter, source, x, y);
      const next = createSelection(source, mask, x, y);
      mask?.close?.();
      if (!next) {
        throw new Error('FormShift could not isolate a distinct object there. Try tapping near the center of the object.');
      }

      sourceBeforeLiftRef.current = source;
      const localBackground = await createLocalRepair(source, next.maskUrl);
      setSelection(next);
      setPosition({ x: next.centerX, y: next.centerY });
      setScale(1);
      setRotation(0);
      setBackgroundDataUrl(null);
      setSceneUrl(localBackground);
      setStatus('Object lifted. Drag the object; pinch outside it to zoom the room.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Object selection failed.');
      setStatus('Tap another point and try again.');
    } finally {
      setSelecting(false);
    }
  };

  const resetViewportGestureBase = () => {
    const points = [...viewportPointerMapRef.current.values()];
    if (!points.length) {
      viewportGestureBaseRef.current = null;
      return;
    }
    viewportGestureBaseRef.current = {
      scale: viewScaleRef.current,
      offset: viewOffsetRef.current,
      centroid: pointCentroid(points),
      distance: points.length >= 2 ? pointDistance(points[0]!, points[1]!) : 0,
    };
  };

  const beginViewportGesture = (event: React.PointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture?.(event.pointerId);
    const point = pointerPointInElement(event.currentTarget, event.clientX, event.clientY);
    viewportPointerMapRef.current.set(event.pointerId, point);

    if (viewportPointerMapRef.current.size === 1) {
      tapCandidateRef.current = {
        pointerId: event.pointerId,
        start: point,
        moved: false,
        startedAt: Date.now(),
      };
    } else {
      tapCandidateRef.current = null;
    }
    resetViewportGestureBase();
  };

  const moveViewportGesture = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!viewportPointerMapRef.current.has(event.pointerId)) return;
    event.preventDefault();
    event.stopPropagation();
    const point = pointerPointInElement(event.currentTarget, event.clientX, event.clientY);
    viewportPointerMapRef.current.set(event.pointerId, point);

    const candidate = tapCandidateRef.current;
    if (candidate && candidate.pointerId === event.pointerId && pointDistance(candidate.start, point) > 7) {
      candidate.moved = true;
    }

    const points = [...viewportPointerMapRef.current.values()];
    const base = viewportGestureBaseRef.current;
    if (!base || !points.length) return;
    const centroid = pointCentroid(points);

    if (points.length >= 2 && base.distance > 4) {
      tapCandidateRef.current = null;
      const distance = pointDistance(points[0]!, points[1]!);
      const nextScale = clamp(base.scale * (distance / base.distance), 1, 5);
      const anchorX = (base.centroid.x - base.offset.x) / Math.max(base.scale, 0.001);
      const anchorY = (base.centroid.y - base.offset.y) / Math.max(base.scale, 0.001);
      const nextOffset = clampViewportOffset({
        x: centroid.x - anchorX * nextScale,
        y: centroid.y - anchorY * nextScale,
      }, nextScale, stageSize);
      setViewScale(nextScale);
      setViewOffset(nextOffset);
      return;
    }

    if (points.length === 1 && base.scale > 1.001) {
      const nextOffset = clampViewportOffset({
        x: base.offset.x + centroid.x - base.centroid.x,
        y: base.offset.y + centroid.y - base.centroid.y,
      }, base.scale, stageSize);
      setViewOffset(nextOffset);
    }
  };

  const endViewportGesture = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!viewportPointerMapRef.current.has(event.pointerId)) return;
    event.preventDefault();
    event.stopPropagation();
    const point = pointerPointInElement(event.currentTarget, event.clientX, event.clientY);
    const wasOnlyPointer = viewportPointerMapRef.current.size === 1;
    const candidate = tapCandidateRef.current;
    viewportPointerMapRef.current.delete(event.pointerId);

    if (viewportPointerMapRef.current.size) resetViewportGestureBase();
    else viewportGestureBaseRef.current = null;

    if (
      !selection
      && !selecting
      && wasOnlyPointer
      && candidate
      && candidate.pointerId === event.pointerId
      && !candidate.moved
      && Date.now() - candidate.startedAt < 650
    ) {
      const imagePoint = stagePointToImagePoint(point, viewScaleRef.current, viewOffsetRef.current, stageSize);
      if (imagePoint) void handleSelectAt(imagePoint.x, imagePoint.y);
    }

    if (candidate?.pointerId === event.pointerId) tapCandidateRef.current = null;
  };

  const fitPhoto = () => {
    viewportPointerMapRef.current.clear();
    viewportGestureBaseRef.current = null;
    tapCandidateRef.current = null;
    setViewScale(1);
    setViewOffset({ x: 0, y: 0 });
  };

  const beginTransformGesture = (event: React.PointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture?.(event.pointerId);
    pointerMapRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    resetGestureBase();
  };

  const moveTransformGesture = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!pointerMapRef.current.has(event.pointerId)) return;
    event.preventDefault();
    event.stopPropagation();
    pointerMapRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });

    const points = [...pointerMapRef.current.values()];
    const base = gestureBaseRef.current;
    if (!base || points.length === 0) return;

    const centroid = pointCentroid(points);
    const dx = (centroid.x - base.centroid.x) / Math.max(stageSize.width * viewScaleRef.current, 1);
    const dy = (centroid.y - base.centroid.y) / Math.max(stageSize.height * viewScaleRef.current, 1);
    const nextPosition = {
      x: clamp(base.position.x + dx, 0.02, 0.98),
      y: clamp(base.position.y + dy, 0.02, 0.98),
    };
    setPosition(nextPosition);

    if (points.length >= 2) {
      const [a, b] = points;
      const distance = pointDistance(a!, b!);
      const angle = pointAngle(a!, b!);
      if (base.distance > 4) {
        setScale(clamp(base.scale * (distance / base.distance), 0.35, 2.2));
      }
      setRotation(base.rotation + normalizeAngle(angle - base.angle));
    }
  };

  const endTransformGesture = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!pointerMapRef.current.has(event.pointerId)) return;
    event.preventDefault();
    event.stopPropagation();
    pointerMapRef.current.delete(event.pointerId);
    if (pointerMapRef.current.size) resetGestureBase();
    else gestureBaseRef.current = null;
  };

  const resetGestureBase = () => {
    const points = [...pointerMapRef.current.values()];
    if (!points.length) {
      gestureBaseRef.current = null;
      return;
    }
    gestureBaseRef.current = {
      position: positionRef.current,
      scale: scaleRef.current,
      rotation: rotationRef.current,
      centroid: pointCentroid(points),
      distance: points.length >= 2 ? pointDistance(points[0]!, points[1]!) : 0,
      angle: points.length >= 2 ? pointAngle(points[0]!, points[1]!) : 0,
    };
  };

  const refineBackground = async () => {
    const source = sourceBeforeLiftRef.current;
    if (!selection || !source || repairing) return;
    setRepairing(true);
    setError(null);
    setStatus('AI is repairing the old location while you keep arranging.');

    try {
      const repaired = await repairBackground({
        projectId,
        spaceId,
        token: auth.session?.access_token,
        sourceCanvas: source,
        maskUrl: selection.maskUrl,
      });
      if (!repaired) throw new Error('AI background repair is unavailable. The local preview is still usable.');
      setBackgroundDataUrl(repaired);
      setSceneUrl(repaired);
      setStatus('Background repaired. Keep arranging; pinch outside the object to zoom the room.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Background repair failed.');
      setStatus('The object is still movable using the local background preview.');
    } finally {
      setRepairing(false);
    }
  };

  const keepPlacement = async () => {
    if (!selection || !sceneUrl || saving) return;
    if (!projectId || !spaceId || !auth.session) {
      setError('A signed-in editable room is required to save this arrangement.');
      return;
    }

    setSaving(true);
    setError(null);
    setStatus('Saving this photo arrangement…');

    try {
      const composite = await compositeScene({
        sceneUrl,
        selection,
        position,
        scale,
        rotation,
        imageSize,
      });

      const saved = await persistPhotoArrangement({
        projectId,
        spaceId,
        userId: auth.session.user.id,
        baseSpatialVersionId,
        resultDataUrl: composite,
        maskDataUrl: selection.maskUrl,
        cutoutDataUrl: selection.cutoutUrl,
        backgroundDataUrl,
        transform: {
          x: position.x,
          y: position.y,
          scale,
          rotationDeg: rotation,
          bbox: selection.bbox,
          rendererVersion: 'photo-arrange-1.5',
        },
      });

      setSceneUrl(saved.sceneUrl);
      setPersistedSceneUrl(saved.sceneUrl);
      setSelection(null);
      setBackgroundDataUrl(null);
      sourceBeforeLiftRef.current = null;
      pointerMapRef.current.clear();
      gestureBaseRef.current = null;
      setStatus('Placement saved. It will restore after refresh.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save this placement.');
      setStatus('The edit is still on screen. Try saving again.');
    } finally {
      setSaving(false);
    }
  };

  const resetScene = () => {
    setSceneUrl(persistedSceneUrl ?? photoUrl ?? null);
    setSelection(null);
    setBackgroundDataUrl(null);
    sourceBeforeLiftRef.current = null;
    pointerMapRef.current.clear();
    gestureBaseRef.current = null;
    viewportPointerMapRef.current.clear();
    viewportGestureBaseRef.current = null;
    tapCandidateRef.current = null;
    setScale(1);
    setRotation(0);
    setViewScale(1);
    setViewOffset({ x: 0, y: 0 });
    setStatus(persistedSceneUrl && persistedSceneUrl !== photoUrl
      ? 'Last saved arrangement restored. Pinch to zoom, then tap an object.'
      : 'Source photo restored. Pinch to zoom, then tap an object to select it.');
    setError(null);
  };

  if (!photoUrl) {
    return (
      <View style={styles.empty}>
        <Text style={styles.title}>Capture a room photo first.</Text>
        <Text style={styles.body}>Arrange works directly on the real room image.</Text>
      </View>
    );
  }

  return (
    <View style={styles.shell}>
      <View style={styles.toolbar}>
        <View style={styles.toolbarCopy}>
          <Text style={styles.kicker}>PHOTO ARRANGE</Text>
          <Text style={styles.title}>Tap it. Lift it. Move it.</Text>
          <Text style={styles.body}>{status}</Text>
        </View>

        <View style={styles.actions}>
          <View style={styles.gestureHint}>
            <Text style={styles.gestureHintStrong}>{viewScale > 1.01 ? `${viewScale.toFixed(1)}×` : '2 fingers'}</Text>
            <Text style={styles.gestureHintText}>{viewScale > 1.01 ? 'room zoom' : 'pinch room to zoom'}</Text>
          </View>
          <Pressable
            disabled={viewScale <= 1.01}
            style={[styles.toolButton, viewScale <= 1.01 && styles.disabled]}
            onPress={fitPhoto}
          >
            <Text style={styles.toolText}>Fit photo</Text>
          </Pressable>
          {selection ? (
            <>
              <View style={styles.gestureHint}>
                <Text style={styles.gestureHintStrong}>On object</Text>
                <Text style={styles.gestureHintText}>drag · pinch · rotate</Text>
                <Text style={styles.gestureHintDot}>•</Text>
                <Text style={styles.gestureHintStrong}>Outside</Text>
                <Text style={styles.gestureHintText}>pan · zoom room</Text>
              </View>
              <Pressable style={styles.toolButton} onPress={() => setScale((value) => clamp(value - 0.1, 0.35, 2.2))}>
                <Text style={styles.toolText}>−</Text>
              </Pressable>
              <Pressable style={styles.toolButton} onPress={() => setScale((value) => clamp(value + 0.1, 0.35, 2.2))}>
                <Text style={styles.toolText}>+</Text>
              </Pressable>
              <Pressable style={styles.toolButton} onPress={() => setRotation((value) => value - 5)}>
                <Text style={styles.toolText}>↺</Text>
              </Pressable>
              <Pressable style={styles.toolButton} onPress={() => setRotation((value) => value + 5)}>
                <Text style={styles.toolText}>↻</Text>
              </Pressable>
              <Pressable
                disabled={repairing}
                style={[styles.aiButton, repairing && styles.disabled]}
                onPress={() => void refineBackground()}
              >
                <Text style={styles.aiText}>{repairing ? 'Repairing…' : 'Refine background with AI'}</Text>
              </Pressable>
              <Pressable
                disabled={saving}
                style={[styles.primaryButton, saving && styles.disabled]}
                onPress={() => void keepPlacement()}
              >
                <Text style={styles.primaryText}>{saving ? 'Saving…' : 'Keep placement'}</Text>
              </Pressable>
            </>
          ) : null}
          <Pressable style={styles.toolButton} onPress={resetScene}>
            <Text style={styles.toolText}>Reset</Text>
          </Pressable>
        </View>
      </View>

      <View
        style={[styles.stage, { aspectRatio: imageSize.width / imageSize.height }, WEB_GESTURE_SHIELD]}
        onLayout={(event) => setStageSize(event.nativeEvent.layout)}
      >
        {sceneUrl ? (
          <div
            aria-hidden="true"
            style={{
              position: 'absolute',
              inset: 0,
              zIndex: 1,
              pointerEvents: 'none',
              transform: `matrix(${viewScale}, 0, 0, ${viewScale}, ${viewOffset.x}, ${viewOffset.y})`,
              transformOrigin: '0 0',
            }}
          >
            <img
              src={sceneUrl}
              alt=""
              draggable={false}
              style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }}
            />
          </div>
        ) : null}

        <div
          aria-label={selection
            ? 'Room view. Pinch to zoom or drag outside the selected object to pan.'
            : 'Room view. Pinch to zoom, drag to pan when zoomed, or tap an object to select it.'}
          role="application"
          onPointerDown={beginViewportGesture}
          onPointerMove={moveViewportGesture}
          onPointerUp={endViewportGesture}
          onPointerCancel={endViewportGesture}
          onContextMenu={(event) => event.preventDefault()}
          onDragStart={(event) => event.preventDefault()}
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 4,
            cursor: viewScale > 1.01 ? 'grab' : selection ? 'default' : 'crosshair',
            ...WEB_GESTURE_SHIELD,
          }}
        />

        {selection && screenCutout ? (
          <>
            <div
              aria-label="Move selected object. Pinch and rotate on the object."
              role="slider"
              onPointerDown={beginTransformGesture}
              onPointerMove={moveTransformGesture}
              onPointerUp={endTransformGesture}
              onPointerCancel={endTransformGesture}
              onContextMenu={(event) => event.preventDefault()}
              style={{
                position: 'absolute',
                zIndex: 7,
                cursor: 'grab',
                left: screenCutout.left - 12,
                top: screenCutout.top - 12,
                width: screenCutout.width + 24,
                height: screenCutout.height + 24,
                borderRadius: 12,
                ...WEB_GESTURE_SHIELD,
              }}
            />
            <div
              style={{
                position: 'absolute',
                zIndex: 6,
                pointerEvents: 'none',
                width: screenCutout.width,
                height: screenCutout.height,
                left: screenCutout.left,
                top: screenCutout.top,
                transform: `rotate(${rotation}deg)`,
                transformOrigin: 'center center',
                borderRadius: 7,
                boxShadow: '0 0 0 2px rgba(40,199,232,.9), 0 12px 24px rgba(0,0,0,.12)',
              }}
            >
              <img
                src={selection.cutoutUrl}
                alt=""
                draggable={false}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'contain',
                  display: 'block',
                  ...WEB_GESTURE_SHIELD,
                }}
              />
            </div>
          </>
        ) : null}

        {selecting ? (
          <View pointerEvents="none" style={styles.busyOverlay}>
            <ActivityIndicator color="#fff" />
            <Text style={styles.busyText}>Selecting object…</Text>
          </View>
        ) : null}

        {repairing ? (
          <View pointerEvents="none" style={styles.repairBadge}>
            <ActivityIndicator size="small" color={tokens.color.blue} />
            <Text style={styles.repairBadgeText}>Repairing background… keep arranging</Text>
          </View>
        ) : null}
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <View style={styles.footer}>
        <Text style={styles.footerStrong}>Actual photographed pixels are moved.</Text>
        <Text style={styles.footerText}>
          Pinch/zoom changes only your view of the room; it never changes object geometry or the saved scene. Selection and mask cleanup run locally in your browser. AI background repair remains explicit and sends only the current scene plus selection mask to the configured image provider. Saved placements are derived photo versions; the source room photo is never overwritten.
        </Text>
      </View>
    </View>
  );
}

async function getSegmenter(ref: { current: any }) {
  if (ref.current) return ref.current;
  const dynamicImport = new Function('url', 'return import(url)') as (url: string) => Promise<SegmenterModule>;
  const module = await dynamicImport(MEDIAPIPE_BUNDLE);
  const fileset = await module.FilesetResolver.forVisionTasks(MEDIAPIPE_WASM);
  ref.current = await module.InteractiveSegmenter.createFromOptions(fileset, {
    baseOptions: { modelAssetPath: MAGIC_TOUCH_MODEL },
    outputConfidenceMasks: true,
    outputCategoryMask: false,
  });
  ref.current.__formshiftBrushMode = module.BrushMode;
  return ref.current;
}

function runSegmenter(segmenter: any, image: HTMLCanvasElement, x: number, y: number) {
  if (typeof segmenter.setImage === 'function') {
    segmenter.setImage(image);
    const positiveBrushMode = segmenter.__formshiftBrushMode?.POSITIVE ?? 1;
    const result = segmenter.segment([
      { brushMode: positiveBrushMode, point: [{ x, y }], isCompleted: true },
    ]);
    return result?.confidenceMasks?.[0] ?? result;
  }
  const result = segmenter.segment(image, { keypoint: { x, y } });
  return result?.confidenceMasks?.[0] ?? result;
}

function createSelection(
  canvas: HTMLCanvasElement,
  mask: any,
  seedX: number,
  seedY: number,
): Selection | null {
  if (!mask?.getAsFloat32Array) return null;

  const values = mask.getAsFloat32Array() as Float32Array;
  const mw = mask.width as number;
  const mh = mask.height as number;
  const cleaned = isolateSeededComponent(values, mw, mh, seedX, seedY);
  if (!cleaned) return null;

  const closed = erodeMask(dilateMask(cleaned, mw, mh), mw, mh);
  const feather = featherMask(closed, mw, mh);

  let minX = mw;
  let minY = mh;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < mh; y += 1) {
    for (let x = 0; x < mw; x += 1) {
      if (closed[y * mw + x]) {
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      }
    }
  }
  if (maxX <= minX || maxY <= minY) return null;

  const sx = canvas.width / mw;
  const sy = canvas.height / mh;
  const pad = 4;
  const x0 = Math.max(0, Math.floor(minX * sx) - pad);
  const y0 = Math.max(0, Math.floor(minY * sy) - pad);
  const x1 = Math.min(canvas.width, Math.ceil((maxX + 1) * sx) + pad);
  const y1 = Math.min(canvas.height, Math.ceil((maxY + 1) * sy) + pad);
  const width = x1 - x0;
  const height = y1 - y0;

  const source = canvas
    .getContext('2d', { willReadFrequently: true })!
    .getImageData(x0, y0, width, height);

  const cutoutCanvas = document.createElement('canvas');
  cutoutCanvas.width = width;
  cutoutCanvas.height = height;
  const cutoutContext = cutoutCanvas.getContext('2d')!;
  const cutout = cutoutContext.createImageData(width, height);

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const mx = clamp(Math.floor((x + x0) / sx), 0, mw - 1);
      const my = clamp(Math.floor((y + y0) / sy), 0, mh - 1);
      const alpha = Math.round(feather[my * mw + mx]! * 255);
      const i = (y * width + x) * 4;
      cutout.data[i] = source.data[i]!;
      cutout.data[i + 1] = source.data[i + 1]!;
      cutout.data[i + 2] = source.data[i + 2]!;
      cutout.data[i + 3] = alpha;
    }
  }
  cutoutContext.putImageData(cutout, 0, 0);

  const repairMask = dilateMask(dilateMask(closed, mw, mh), mw, mh);
  const maskCanvas = document.createElement('canvas');
  maskCanvas.width = canvas.width;
  maskCanvas.height = canvas.height;
  const maskImage = maskCanvas.getContext('2d')!.createImageData(canvas.width, canvas.height);

  for (let y = 0; y < canvas.height; y += 1) {
    for (let x = 0; x < canvas.width; x += 1) {
      const mx = clamp(Math.floor(x / sx), 0, mw - 1);
      const my = clamp(Math.floor(y / sy), 0, mh - 1);
      const value = repairMask[my * mw + mx] ? 255 : 0;
      const i = (y * canvas.width + x) * 4;
      maskImage.data[i] = value;
      maskImage.data[i + 1] = value;
      maskImage.data[i + 2] = value;
      maskImage.data[i + 3] = 255;
    }
  }
  maskCanvas.getContext('2d')!.putImageData(maskImage, 0, 0);

  return {
    cutoutUrl: cutoutCanvas.toDataURL('image/png'),
    maskUrl: maskCanvas.toDataURL('image/png'),
    bbox: { x: x0, y: y0, width, height },
    centerX: (x0 + width / 2) / canvas.width,
    centerY: (y0 + height / 2) / canvas.height,
  };
}

function isolateSeededComponent(
  values: Float32Array,
  width: number,
  height: number,
  seedX: number,
  seedY: number,
) {
  const threshold = 0.34;
  let sx = clamp(Math.round(seedX * (width - 1)), 0, width - 1);
  let sy = clamp(Math.round(seedY * (height - 1)), 0, height - 1);

  if (values[sy * width + sx]! < threshold) {
    let bestScore = values[sy * width + sx]!;
    let bestX = sx;
    let bestY = sy;
    for (let radius = 1; radius <= 12; radius += 1) {
      for (let y = Math.max(0, sy - radius); y <= Math.min(height - 1, sy + radius); y += 1) {
        for (let x = Math.max(0, sx - radius); x <= Math.min(width - 1, sx + radius); x += 1) {
          const score = values[y * width + x]!;
          if (score > bestScore) {
            bestScore = score;
            bestX = x;
            bestY = y;
          }
        }
      }
      if (bestScore >= threshold) break;
    }
    if (bestScore < threshold) return null;
    sx = bestX;
    sy = bestY;
  }

  const selected = new Uint8Array(width * height);
  const queueX = new Int32Array(width * height);
  const queueY = new Int32Array(width * height);
  let head = 0;
  let tail = 0;
  queueX[tail] = sx;
  queueY[tail] = sy;
  tail += 1;
  selected[sy * width + sx] = 1;

  const neighbors = [-1, 0, 1];
  while (head < tail) {
    const cx = queueX[head]!;
    const cy = queueY[head]!;
    head += 1;

    for (const dy of neighbors) {
      for (const dx of neighbors) {
        if (dx === 0 && dy === 0) continue;
        const nx = cx + dx;
        const ny = cy + dy;
        if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;
        const index = ny * width + nx;
        if (selected[index] || values[index]! < threshold) continue;
        selected[index] = 1;
        queueX[tail] = nx;
        queueY[tail] = ny;
        tail += 1;
      }
    }
  }

  return tail >= 8 ? selected : null;
}

function dilateMask(mask: Uint8Array, width: number, height: number) {
  const out = new Uint8Array(mask.length);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      let value = 0;
      for (let dy = -1; dy <= 1 && !value; dy += 1) {
        for (let dx = -1; dx <= 1; dx += 1) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx >= 0 && nx < width && ny >= 0 && ny < height && mask[ny * width + nx]) {
            value = 1;
            break;
          }
        }
      }
      out[y * width + x] = value;
    }
  }
  return out;
}

function erodeMask(mask: Uint8Array, width: number, height: number) {
  const out = new Uint8Array(mask.length);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      let keep = 1;
      for (let dy = -1; dy <= 1 && keep; dy += 1) {
        for (let dx = -1; dx <= 1; dx += 1) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx < 0 || nx >= width || ny < 0 || ny >= height || !mask[ny * width + nx]) {
            keep = 0;
            break;
          }
        }
      }
      out[y * width + x] = keep;
    }
  }
  return out;
}

function featherMask(mask: Uint8Array, width: number, height: number) {
  const out = new Float32Array(mask.length);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      let sum = 0;
      let count = 0;
      for (let dy = -1; dy <= 1; dy += 1) {
        for (let dx = -1; dx <= 1; dx += 1) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;
          sum += mask[ny * width + nx]!;
          count += 1;
        }
      }
      const average = count ? sum / count : 0;
      const index = y * width + x;
      out[index] = mask[index]
        ? clamp(0.72 + average * 0.28, 0, 1)
        : average >= 0.45
          ? clamp((average - 0.45) * 0.42, 0, 0.22)
          : 0;
    }
  }
  return out;
}

async function createLocalRepair(sourceCanvas: HTMLCanvasElement, maskUrl: string) {
  const canvas = document.createElement('canvas');
  canvas.width = sourceCanvas.width;
  canvas.height = sourceCanvas.height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
  ctx.drawImage(sourceCanvas, 0, 0);

  const mask = await loadImage(maskUrl);
  const maskCanvas = document.createElement('canvas');
  maskCanvas.width = sourceCanvas.width;
  maskCanvas.height = sourceCanvas.height;
  const maskContext = maskCanvas.getContext('2d', { willReadFrequently: true })!;
  maskContext.drawImage(mask, 0, 0, maskCanvas.width, maskCanvas.height);
  const maskData = maskContext.getImageData(0, 0, maskCanvas.width, maskCanvas.height).data;

  const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const known = new Uint8Array(canvas.width * canvas.height);
  let minX = canvas.width;
  let minY = canvas.height;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < canvas.height; y += 1) {
    for (let x = 0; x < canvas.width; x += 1) {
      const selected = maskData[(y * canvas.width + x) * 4]! >= 128;
      known[y * canvas.width + x] = selected ? 0 : 1;
      if (selected) {
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      }
    }
  }

  if (maxX < minX || maxY < minY) return canvas.toDataURL('image/jpeg', 0.9);

  const left = Math.max(1, minX - 2);
  const top = Math.max(1, minY - 2);
  const right = Math.min(canvas.width - 2, maxX + 2);
  const bottom = Math.min(canvas.height - 2, maxY + 2);

  for (let pass = 0; pass < 96; pass += 1) {
    const fills: Array<{ index: number; r: number; g: number; b: number }> = [];

    for (let y = top; y <= bottom; y += 1) {
      for (let x = left; x <= right; x += 1) {
        const pixelIndex = y * canvas.width + x;
        if (known[pixelIndex]) continue;

        let r = 0;
        let g = 0;
        let b = 0;
        let count = 0;
        for (let dy = -1; dy <= 1; dy += 1) {
          for (let dx = -1; dx <= 1; dx += 1) {
            if (dx === 0 && dy === 0) continue;
            const nx = x + dx;
            const ny = y + dy;
            const neighbor = ny * canvas.width + nx;
            if (!known[neighbor]) continue;
            const i = neighbor * 4;
            r += image.data[i]!;
            g += image.data[i + 1]!;
            b += image.data[i + 2]!;
            count += 1;
          }
        }
        if (count >= 2) {
          fills.push({
            index: pixelIndex,
            r: Math.round(r / count),
            g: Math.round(g / count),
            b: Math.round(b / count),
          });
        }
      }
    }

    if (!fills.length) break;
    for (const fill of fills) {
      const i = fill.index * 4;
      image.data[i] = fill.r;
      image.data[i + 1] = fill.g;
      image.data[i + 2] = fill.b;
      image.data[i + 3] = 255;
      known[fill.index] = 1;
    }
  }

  ctx.putImageData(image, 0, 0);

  const blurredCanvas = document.createElement('canvas');
  blurredCanvas.width = canvas.width;
  blurredCanvas.height = canvas.height;
  const blurredContext = blurredCanvas.getContext('2d')!;
  blurredContext.filter = 'blur(4px)';
  blurredContext.drawImage(canvas, 0, 0);
  blurredContext.filter = 'none';
  const blurred = blurredContext.getImageData(0, 0, canvas.width, canvas.height);
  const finalImage = ctx.getImageData(0, 0, canvas.width, canvas.height);

  for (let y = minY; y <= maxY; y += 1) {
    for (let x = minX; x <= maxX; x += 1) {
      if (maskData[(y * canvas.width + x) * 4]! < 128) continue;
      const i = (y * canvas.width + x) * 4;
      finalImage.data[i] = Math.round(finalImage.data[i]! * 0.35 + blurred.data[i]! * 0.65);
      finalImage.data[i + 1] = Math.round(finalImage.data[i + 1]! * 0.35 + blurred.data[i + 1]! * 0.65);
      finalImage.data[i + 2] = Math.round(finalImage.data[i + 2]! * 0.35 + blurred.data[i + 2]! * 0.65);
      finalImage.data[i + 3] = 255;
    }
  }

  ctx.putImageData(finalImage, 0, 0);
  return canvas.toDataURL('image/jpeg', 0.9);
}

async function repairBackground({
  projectId,
  spaceId,
  token,
  sourceCanvas,
  maskUrl,
}: {
  projectId?: string;
  spaceId?: string;
  token?: string;
  sourceCanvas: HTMLCanvasElement;
  maskUrl: string;
}) {
  if (!projectId || !spaceId || !token) return null;
  const apiBase = process.env.EXPO_PUBLIC_API_BASE_URL?.replace(/\/$/, '');
  if (!apiBase) return null;
  const sourceDataUrl = resizedDataUrl(sourceCanvas, 1100);
  const response = await fetch(`${apiBase}/api/ai/repair-background`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      projectId,
      spaceId,
      sourceDataUrl,
      maskDataUrl: maskUrl,
    }),
  });
  if (!response.ok) return null;
  const data = await response.json() as { imageDataUrl?: string };
  return data.imageDataUrl ?? null;
}

function resizedDataUrl(source: HTMLCanvasElement, maxDimension: number) {
  const resizeScale = Math.min(1, maxDimension / Math.max(source.width, source.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(source.width * resizeScale);
  canvas.height = Math.round(source.height * resizeScale);
  canvas.getContext('2d')!.drawImage(source, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/jpeg', 0.88);
}

async function compositeScene({
  sceneUrl,
  selection,
  position,
  scale,
  rotation,
  imageSize,
}: {
  sceneUrl: string;
  selection: Selection;
  position: Point;
  scale: number;
  rotation: number;
  imageSize: { width: number; height: number };
}) {
  const canvas = document.createElement('canvas');
  canvas.width = imageSize.width;
  canvas.height = imageSize.height;
  const ctx = canvas.getContext('2d')!;
  const background = await loadImage(sceneUrl);
  ctx.drawImage(background, 0, 0, canvas.width, canvas.height);
  const cutout = await loadImage(selection.cutoutUrl);
  const width = selection.bbox.width * scale;
  const height = selection.bbox.height * scale;
  const centerX = position.x * canvas.width;
  const centerY = position.y * canvas.height;

  ctx.save();
  ctx.translate(centerX, centerY);
  ctx.rotate(rotation * Math.PI / 180);
  ctx.drawImage(cutout, -width / 2, -height / 2, width, height);
  ctx.restore();

  return canvas.toDataURL('image/jpeg', 0.92);
}

async function loadSceneIntoCanvas(url: string) {
  const image = await loadImage(url);
  const max = 1400;
  const resizeScale = Math.min(
    1,
    max / Math.max(image.naturalWidth || image.width, image.naturalHeight || image.height),
  );
  const width = Math.max(1, Math.round((image.naturalWidth || image.width) * resizeScale));
  const height = Math.max(1, Math.round((image.naturalHeight || image.height) * resizeScale));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  canvas
    .getContext('2d', { willReadFrequently: true })!
    .drawImage(image, 0, 0, width, height);
  return { canvas, width, height };
}

function loadImage(url: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new window.Image();
    image.crossOrigin = 'anonymous';
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('The room photo could not be loaded for pixel editing.'));
    image.src = url;
  });
}

function pointerPointInElement(element: HTMLElement, clientX: number, clientY: number): Point {
  const rect = element.getBoundingClientRect();
  return { x: clientX - rect.left, y: clientY - rect.top };
}

function stagePointToImagePoint(
  point: Point,
  scale: number,
  offset: Point,
  stageSize: { width: number; height: number },
): Point | null {
  const x = (point.x - offset.x) / Math.max(scale, 0.001);
  const y = (point.y - offset.y) / Math.max(scale, 0.001);
  if (x < 0 || y < 0 || x > stageSize.width || y > stageSize.height) return null;
  return {
    x: clamp(x / Math.max(stageSize.width, 1), 0, 1),
    y: clamp(y / Math.max(stageSize.height, 1), 0, 1),
  };
}

function clampViewportOffset(
  offset: Point,
  scale: number,
  stageSize: { width: number; height: number },
): Point {
  if (scale <= 1.001) return { x: 0, y: 0 };
  return {
    x: clamp(offset.x, stageSize.width * (1 - scale), 0),
    y: clamp(offset.y, stageSize.height * (1 - scale), 0),
  };
}

function pointCentroid(points: Point[]) {
  return {
    x: points.reduce((sum, point) => sum + point.x, 0) / points.length,
    y: points.reduce((sum, point) => sum + point.y, 0) / points.length,
  };
}

function pointDistance(a: Point, b: Point) {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

function pointAngle(a: Point, b: Point) {
  return Math.atan2(b.y - a.y, b.x - a.x) * 180 / Math.PI;
}

function normalizeAngle(value: number) {
  let next = value;
  while (next > 180) next -= 360;
  while (next < -180) next += 360;
  return next;
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

const styles = StyleSheet.create({
  shell: {
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,.72)',
    borderWidth: 1,
    borderColor: tokens.color.line,
  },
  toolbar: {
    padding: 14,
    gap: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    backgroundColor: 'rgba(250,249,246,.96)',
  },
  toolbarCopy: { flex: 1, minWidth: 230 },
  kicker: {
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 1.2,
    color: tokens.color.peach,
  },
  title: {
    marginTop: 3,
    fontSize: 16,
    fontWeight: '800',
    color: tokens.color.text,
  },
  body: {
    marginTop: 3,
    fontSize: 9,
    lineHeight: 14,
    color: tokens.color.muted,
  },
  actions: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  gestureHint: {
    minHeight: 34,
    paddingHorizontal: 10,
    borderRadius: 10,
    flexDirection: 'row',
    gap: 4,
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,.62)',
    borderWidth: 1,
    borderColor: tokens.color.line,
  },
  gestureHintStrong: { fontSize: 8, fontWeight: '800', color: tokens.color.text },
  gestureHintText: { fontSize: 8, color: tokens.color.muted },
  gestureHintDot: { fontSize: 8, color: tokens.color.muted },
  toolButton: {
    minWidth: 34,
    minHeight: 34,
    paddingHorizontal: 9,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: tokens.color.line,
  },
  toolText: { fontSize: 9, fontWeight: '800', color: tokens.color.text },
  aiButton: {
    minHeight: 34,
    paddingHorizontal: 11,
    borderRadius: 10,
    justifyContent: 'center',
    backgroundColor: 'rgba(207,229,236,.72)',
    borderWidth: 1,
    borderColor: 'rgba(13,116,150,.18)',
  },
  aiText: { fontSize: 9, fontWeight: '800', color: tokens.color.blue },
  primaryButton: {
    minHeight: 34,
    paddingHorizontal: 12,
    borderRadius: 10,
    justifyContent: 'center',
    backgroundColor: tokens.color.blue,
  },
  primaryText: { fontSize: 9, fontWeight: '800', color: '#fff' },
  disabled: { opacity: 0.45 },
  stage: {
    width: '100%',
    position: 'relative',
    overflow: 'hidden',
    backgroundColor: '#D8D5CD',
  },
  busyOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(20,24,25,.24)',
    zIndex: 10,
  },
  busyText: { color: '#fff', fontSize: 10, fontWeight: '800' },
  repairBadge: {
    position: 'absolute',
    right: 10,
    top: 10,
    zIndex: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: 'rgba(250,249,246,.94)',
    borderWidth: 1,
    borderColor: tokens.color.line,
  },
  repairBadgeText: { fontSize: 8, fontWeight: '800', color: tokens.color.text },
  error: {
    paddingHorizontal: 14,
    paddingTop: 10,
    fontSize: 9,
    lineHeight: 13,
    color: '#A84C4C',
  },
  footer: {
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: tokens.color.line,
    backgroundColor: 'rgba(250,249,246,.94)',
  },
  footerStrong: { fontSize: 9, fontWeight: '800', color: tokens.color.text },
  footerText: {
    marginTop: 3,
    fontSize: 8,
    lineHeight: 12,
    color: tokens.color.muted,
  },
  empty: {
    minHeight: 360,
    padding: 28,
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,.72)',
    borderRadius: 24,
  },
});
