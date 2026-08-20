import type { SpatialSnapshot } from '@formshift/domain';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Image, PanResponder, Pressable, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '../auth/AuthProvider';
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

const MEDIAPIPE_BUNDLE = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.0.1/vision_bundle.mjs';
const MEDIAPIPE_WASM = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.0.1/wasm';
const MAGIC_TOUCH_MODEL = 'https://storage.googleapis.com/mediapipe-models/interactive_segmenter_v2/magic_touch/int8/1/interactive_segmentation.task';

export function PhotoArrangeEditor({
  photoUrl,
  snapshot,
  projectId,
  spaceId,
}: {
  photoUrl?: string | null;
  snapshot: SpatialSnapshot;
  onSnapshotChange?: (snapshot: SpatialSnapshot) => void;
  projectId?: string;
  spaceId?: string;
}) {
  const auth = useAuth();
  const sourceCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const sourceBeforeLiftRef = useRef<HTMLCanvasElement | null>(null);
  const segmenterRef = useRef<any>(null);
  const [sceneUrl, setSceneUrl] = useState<string | null>(photoUrl ?? null);
  const [imageSize, setImageSize] = useState({ width: 4, height: 3 });
  const [stageSize, setStageSize] = useState({ width: 1, height: 1 });
  const [selection, setSelection] = useState<Selection | null>(null);
  const [position, setPosition] = useState({ x: 0.5, y: 0.5 });
  const [scale, setScale] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [selecting, setSelecting] = useState(false);
  const [repairing, setRepairing] = useState(false);
  const [status, setStatus] = useState('Tap an object in the photo to select it.');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setSceneUrl(photoUrl ?? null);
    setSelection(null);
    sourceBeforeLiftRef.current = null;
    setStatus('Tap an object in the photo to select it.');
    setError(null);
  }, [photoUrl, snapshot.spaceId]);

  useEffect(() => {
    if (!sceneUrl) return;
    let cancelled = false;
    void loadSceneIntoCanvas(sceneUrl).then(({ canvas, width, height }) => {
      if (cancelled) return;
      sourceCanvasRef.current = canvas;
      setImageSize({ width, height });
    }).catch((err) => {
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

  const dragStart = useRef(position);
  useEffect(() => { dragStart.current = position; }, [position]);
  const panResponder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => !!selection,
    onMoveShouldSetPanResponder: () => !!selection,
    onPanResponderGrant: () => { dragStart.current = position; },
    onPanResponderMove: (_event, gesture) => {
      setPosition({
        x: clamp(dragStart.current.x + gesture.dx / Math.max(stageSize.width, 1), 0.02, 0.98),
        y: clamp(dragStart.current.y + gesture.dy / Math.max(stageSize.height, 1), 0.02, 0.98),
      });
    },
  }), [selection, position, stageSize]);

  const handleSelect = async (event: any) => {
    const source = sourceCanvasRef.current;
    if (selection || selecting || !source) return;
    const x = clamp((event.nativeEvent.locationX ?? 0) / Math.max(stageSize.width, 1), 0, 1);
    const y = clamp((event.nativeEvent.locationY ?? 0) / Math.max(stageSize.height, 1), 0, 1);
    setSelecting(true);
    setError(null);
    setStatus('Finding object edges…');
    try {
      const segmenter = await getSegmenter(segmenterRef);
      const mask = runSegmenter(segmenter, source, x, y);
      const next = createSelection(source, mask);
      mask?.close?.();
      if (!next) throw new Error('FormShift could not isolate a distinct object there. Try tapping near the center of the object.');

      sourceBeforeLiftRef.current = source;
      const localBackground = await createLocalRepair(source, next.maskUrl);
      setSelection(next);
      setPosition({ x: next.centerX, y: next.centerY });
      setScale(1);
      setRotation(0);
      setSceneUrl(localBackground);
      setStatus('Object lifted. Drag it anywhere. Use AI background repair when you want a cleaner old location.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Object selection failed.');
      setStatus('Tap another point and try again.');
    } finally {
      setSelecting(false);
    }
  };

  const refineBackground = async () => {
    const source = sourceBeforeLiftRef.current;
    if (!selection || !source || repairing) return;
    setRepairing(true);
    setError(null);
    setStatus('Reconstructing the background behind the lifted object…');
    try {
      const repaired = await repairBackground({
        projectId,
        spaceId,
        token: auth.session?.access_token,
        sourceCanvas: source,
        maskUrl: selection.maskUrl,
      });
      if (!repaired) throw new Error('AI background repair is unavailable. The local preview is still usable.');
      setSceneUrl(repaired);
      setStatus('Background repaired. Continue dragging the photographed object, then keep the placement.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Background repair failed.');
      setStatus('The object is still movable using the local background preview.');
    } finally {
      setRepairing(false);
    }
  };

  const keepPlacement = async () => {
    if (!selection || !sceneUrl) return;
    try {
      const composite = await compositeScene({ sceneUrl, selection, position, scale, rotation, imageSize });
      setSceneUrl(composite);
      setSelection(null);
      sourceBeforeLiftRef.current = null;
      setStatus('Placement kept. Tap another object to move it, or reset the scene.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not keep this placement.');
    }
  };

  const resetScene = () => {
    setSceneUrl(photoUrl ?? null);
    setSelection(null);
    sourceBeforeLiftRef.current = null;
    setScale(1);
    setRotation(0);
    setStatus('Original photo restored. Tap an object to select it.');
    setError(null);
  };

  if (!photoUrl) {
    return <View style={styles.empty}><Text style={styles.title}>Capture a room photo first.</Text><Text style={styles.body}>Arrange works directly on the real room image.</Text></View>;
  }

  return (
    <View style={styles.shell}>
      <View style={styles.toolbar}>
        <View style={styles.toolbarCopy}>
          <Text style={styles.kicker}>PHOTO ARRANGE</Text>
          <Text style={styles.title}>Tap an object. Lift it. Move it.</Text>
          <Text style={styles.body}>{status}</Text>
        </View>
        <View style={styles.actions}>
          {selection ? <>
            <Pressable style={styles.toolButton} onPress={() => setScale((value) => clamp(value - 0.1, 0.35, 2.2))}><Text style={styles.toolText}>− Size</Text></Pressable>
            <Pressable style={styles.toolButton} onPress={() => setScale((value) => clamp(value + 0.1, 0.35, 2.2))}><Text style={styles.toolText}>+ Size</Text></Pressable>
            <Pressable style={styles.toolButton} onPress={() => setRotation((value) => value - 5)}><Text style={styles.toolText}>↺</Text></Pressable>
            <Pressable style={styles.toolButton} onPress={() => setRotation((value) => value + 5)}><Text style={styles.toolText}>↻</Text></Pressable>
            <Pressable disabled={repairing} style={[styles.aiButton, repairing && styles.disabled]} onPress={() => void refineBackground()}><Text style={styles.aiText}>{repairing ? 'Repairing…' : 'Refine background with AI'}</Text></Pressable>
            <Pressable style={styles.primaryButton} onPress={() => void keepPlacement()}><Text style={styles.primaryText}>Keep placement</Text></Pressable>
          </> : null}
          <Pressable style={styles.toolButton} onPress={resetScene}><Text style={styles.toolText}>Reset</Text></Pressable>
        </View>
      </View>

      <View
        style={[styles.stage, { aspectRatio: imageSize.width / imageSize.height }]}
        onLayout={(event) => setStageSize(event.nativeEvent.layout)}
      >
        {sceneUrl ? <Image source={{ uri: sceneUrl }} resizeMode="contain" style={StyleSheet.absoluteFillObject} /> : null}
        {!selection ? <Pressable onPress={handleSelect} style={StyleSheet.absoluteFillObject} /> : null}
        {selection && displayCutout ? (
          <View
            {...panResponder.panHandlers}
            style={[
              styles.cutout,
              {
                width: displayCutout.width,
                height: displayCutout.height,
                left: position.x * stageSize.width - displayCutout.width / 2,
                top: position.y * stageSize.height - displayCutout.height / 2,
                transform: [{ rotate: `${rotation}deg` }],
              },
            ]}
          >
            <Image source={{ uri: selection.cutoutUrl }} resizeMode="contain" style={StyleSheet.absoluteFillObject} />
            <View pointerEvents="none" style={styles.selectionOutline} />
          </View>
        ) : null}
        {(selecting || repairing) ? (
          <View pointerEvents="none" style={styles.busyOverlay}>
            <ActivityIndicator color="#fff" />
            <Text style={styles.busyText}>{selecting ? 'Selecting object…' : 'Repairing background…'}</Text>
          </View>
        ) : null}
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}
      <View style={styles.footer}>
        <Text style={styles.footerStrong}>Actual photographed pixels are moved.</Text>
        <Text style={styles.footerText}>Object selection runs locally in your browser. “Refine background with AI” explicitly sends the source scene and selection mask to the configured image provider. Existing-object scale is visual until calibrated or measured.</Text>
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
  if (typeof segmenter.setImage === 'function' && segmenter.__formshiftBrushMode?.POSITIVE !== undefined) {
    segmenter.setImage(image);
    return segmenter.segment([{ brushMode: segmenter.__formshiftBrushMode.POSITIVE, point: [{ x, y }], isCompleted: true }]);
  }
  const result = segmenter.segment(image, { keypoint: { x, y } });
  return result?.confidenceMasks?.[0] ?? result;
}

function createSelection(canvas: HTMLCanvasElement, mask: any): Selection | null {
  if (!mask?.getAsFloat32Array) return null;
  const values = mask.getAsFloat32Array() as Float32Array;
  const mw = mask.width as number;
  const mh = mask.height as number;
  let minX = mw, minY = mh, maxX = -1, maxY = -1;
  for (let y = 0; y < mh; y += 1) {
    for (let x = 0; x < mw; x += 1) {
      if (values[y * mw + x]! > 0.5) {
        minX = Math.min(minX, x); minY = Math.min(minY, y); maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
      }
    }
  }
  if (maxX <= minX || maxY <= minY) return null;

  const sx = canvas.width / mw;
  const sy = canvas.height / mh;
  const pad = 5;
  const x0 = Math.max(0, Math.floor(minX * sx) - pad);
  const y0 = Math.max(0, Math.floor(minY * sy) - pad);
  const x1 = Math.min(canvas.width, Math.ceil((maxX + 1) * sx) + pad);
  const y1 = Math.min(canvas.height, Math.ceil((maxY + 1) * sy) + pad);
  const width = x1 - x0;
  const height = y1 - y0;
  const source = canvas.getContext('2d', { willReadFrequently: true })!.getImageData(x0, y0, width, height);
  const cutoutCanvas = document.createElement('canvas');
  cutoutCanvas.width = width;
  cutoutCanvas.height = height;
  const cutout = cutoutCanvas.getContext('2d')!.createImageData(width, height);

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const mx = clamp(Math.floor((x + x0) / sx), 0, mw - 1);
      const my = clamp(Math.floor((y + y0) / sy), 0, mh - 1);
      const confidence = values[my * mw + mx]!;
      const alpha = Math.round(clamp((confidence - 0.22) / 0.58, 0, 1) * 255);
      const i = (y * width + x) * 4;
      cutout.data[i] = source.data[i]!;
      cutout.data[i + 1] = source.data[i + 1]!;
      cutout.data[i + 2] = source.data[i + 2]!;
      cutout.data[i + 3] = alpha;
    }
  }
  cutoutCanvas.getContext('2d')!.putImageData(cutout, 0, 0);

  const maskCanvas = document.createElement('canvas');
  maskCanvas.width = canvas.width;
  maskCanvas.height = canvas.height;
  const maskImage = maskCanvas.getContext('2d')!.createImageData(canvas.width, canvas.height);
  for (let y = 0; y < canvas.height; y += 1) {
    for (let x = 0; x < canvas.width; x += 1) {
      const mx = clamp(Math.floor(x / sx), 0, mw - 1);
      const my = clamp(Math.floor(y / sy), 0, mh - 1);
      const selected = values[my * mw + mx]! > 0.42;
      const i = (y * canvas.width + x) * 4;
      const value = selected ? 255 : 0;
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
  const original = new Uint8ClampedArray(image.data);

  for (let y = 0; y < canvas.height; y += 1) {
    let x = 0;
    while (x < canvas.width) {
      const maskIndex = (y * canvas.width + x) * 4;
      if (maskData[maskIndex]! < 128) { x += 1; continue; }
      const start = x;
      while (x < canvas.width && maskData[(y * canvas.width + x) * 4]! >= 128) x += 1;
      const end = x - 1;
      const left = Math.max(0, start - 3);
      const right = Math.min(canvas.width - 1, end + 3);
      for (let px = start; px <= end; px += 1) {
        const t = (px - start + 1) / (end - start + 2);
        const i = (y * canvas.width + px) * 4;
        const leftIndex = (y * canvas.width + left) * 4;
        const rightIndex = (y * canvas.width + right) * 4;
        image.data[i] = Math.round(original[leftIndex]! * (1 - t) + original[rightIndex]! * t);
        image.data[i + 1] = Math.round(original[leftIndex + 1]! * (1 - t) + original[rightIndex + 1]! * t);
        image.data[i + 2] = Math.round(original[leftIndex + 2]! * (1 - t) + original[rightIndex + 2]! * t);
        image.data[i + 3] = 255;
      }
    }
  }

  ctx.putImageData(image, 0, 0);
  return canvas.toDataURL('image/jpeg', 0.9);
}

async function repairBackground({ projectId, spaceId, token, sourceCanvas, maskUrl }: { projectId?: string; spaceId?: string; token?: string; sourceCanvas: HTMLCanvasElement; maskUrl: string }) {
  if (!projectId || !spaceId || !token) return null;
  const apiBase = process.env.EXPO_PUBLIC_API_BASE_URL?.replace(/\/$/, '');
  if (!apiBase) return null;
  const sourceDataUrl = resizedDataUrl(sourceCanvas, 1100);
  const response = await fetch(`${apiBase}/api/ai/repair-background`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ projectId, spaceId, sourceDataUrl, maskDataUrl: maskUrl }),
  });
  if (!response.ok) return null;
  const data = await response.json() as { imageDataUrl?: string };
  return data.imageDataUrl ?? null;
}

function resizedDataUrl(source: HTMLCanvasElement, maxDimension: number) {
  const scale = Math.min(1, maxDimension / Math.max(source.width, source.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(source.width * scale);
  canvas.height = Math.round(source.height * scale);
  canvas.getContext('2d')!.drawImage(source, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/jpeg', 0.88);
}

async function compositeScene({ sceneUrl, selection, position, scale, rotation, imageSize }: { sceneUrl: string; selection: Selection; position: { x: number; y: number }; scale: number; rotation: number; imageSize: { width: number; height: number } }) {
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
  const scale = Math.min(1, max / Math.max(image.naturalWidth || image.width, image.naturalHeight || image.height));
  const width = Math.max(1, Math.round((image.naturalWidth || image.width) * scale));
  const height = Math.max(1, Math.round((image.naturalHeight || image.height) * scale));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  canvas.getContext('2d', { willReadFrequently: true })!.drawImage(image, 0, 0, width, height);
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

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

const styles = StyleSheet.create({
  shell: { borderRadius: 24, overflow: 'hidden', backgroundColor: 'rgba(255,255,255,.72)', borderWidth: 1, borderColor: tokens.color.line },
  toolbar: { padding: 14, gap: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', backgroundColor: 'rgba(250,249,246,.96)' },
  toolbarCopy: { flex: 1, minWidth: 230 },
  kicker: { fontSize: 8, fontWeight: '800', letterSpacing: 1.2, color: tokens.color.peach },
  title: { marginTop: 3, fontSize: 16, fontWeight: '800', color: tokens.color.text },
  body: { marginTop: 3, fontSize: 9, lineHeight: 14, color: tokens.color.muted },
  actions: { flexDirection: 'row', gap: 6, alignItems: 'center', flexWrap: 'wrap' },
  toolButton: { minHeight: 34, paddingHorizontal: 10, borderRadius: 10, justifyContent: 'center', backgroundColor: '#fff', borderWidth: 1, borderColor: tokens.color.line },
  toolText: { fontSize: 9, fontWeight: '800', color: tokens.color.text },
  aiButton: { minHeight: 34, paddingHorizontal: 11, borderRadius: 10, justifyContent: 'center', backgroundColor: 'rgba(207,229,236,.72)', borderWidth: 1, borderColor: 'rgba(13,116,150,.18)' },
  aiText: { fontSize: 9, fontWeight: '800', color: tokens.color.blue },
  primaryButton: { minHeight: 34, paddingHorizontal: 12, borderRadius: 10, justifyContent: 'center', backgroundColor: tokens.color.blue },
  primaryText: { fontSize: 9, fontWeight: '800', color: '#fff' },
  disabled: { opacity: 0.45 },
  stage: { width: '100%', position: 'relative', overflow: 'hidden', backgroundColor: '#D8D5CD' },
  cutout: { position: 'absolute', zIndex: 5 },
  selectionOutline: { ...StyleSheet.absoluteFillObject, borderWidth: 2, borderColor: '#28C7E8', borderRadius: 5 },
  busyOverlay: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: 'rgba(20,24,25,.24)', zIndex: 10 },
  busyText: { color: '#fff', fontSize: 10, fontWeight: '800' },
  error: { paddingHorizontal: 14, paddingTop: 10, fontSize: 9, lineHeight: 13, color: '#A84C4C' },
  footer: { padding: 12, borderTopWidth: 1, borderTopColor: tokens.color.line, backgroundColor: 'rgba(250,249,246,.94)' },
  footerStrong: { fontSize: 9, fontWeight: '800', color: tokens.color.text },
  footerText: { marginTop: 3, fontSize: 8, lineHeight: 12, color: tokens.color.muted },
  empty: { minHeight: 360, padding: 28, justifyContent: 'center', backgroundColor: 'rgba(255,255,255,.72)', borderRadius: 24 },
});
