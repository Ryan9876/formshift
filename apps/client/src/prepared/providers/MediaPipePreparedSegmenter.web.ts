import type { PreparedBox } from '../types';

type Point = { x: number; y: number };
type SegmenterModule = {
  FilesetResolver: { forVisionTasks(path: string): Promise<unknown> };
  InteractiveSegmenter: { createFromOptions(fileset: unknown, options: unknown): Promise<any> };
  BrushMode?: { POSITIVE?: unknown };
};

type Crop = {
  canvas: HTMLCanvasElement;
  x: number;
  y: number;
  width: number;
  height: number;
  seed: Point;
};

export type PreparedSegment = {
  bbox: PreparedBox;
  centerX: number;
  centerY: number;
  maskDataUrl: string;
  cutoutDataUrl: string;
  maskValues: Uint8ClampedArray;
  width: number;
  height: number;
};

// The query string forces a distinct ESM module instance from the canonical
// Arrange adapter, which intentionally patches its own factory for v2.2
// compatibility. Prepared Scene must never inherit or mutate that patch.
const MEDIAPIPE_BUNDLE = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.0.1/vision_bundle.mjs?formshift=prepared-scene-v1';
const MEDIAPIPE_WASM = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.0.1/wasm';
const MAGIC_TOUCH_MODEL = 'https://storage.googleapis.com/mediapipe-models/interactive_segmenter_v2/magic_touch/int8/1/interactive_segmentation.task';
const MAX_CROP_DIMENSION = 820;
const THRESHOLD = 0.48;

let segmenterPromise: Promise<{ module: SegmenterModule; segmenter: any }> | null = null;

async function getSegmenter() {
  if (segmenterPromise) return segmenterPromise;
  segmenterPromise = (async () => {
    const dynamicImport = new Function('url', 'return import(url)') as (url: string) => Promise<SegmenterModule>;
    const module = await dynamicImport(MEDIAPIPE_BUNDLE);
    const fileset = await module.FilesetResolver.forVisionTasks(MEDIAPIPE_WASM);
    const segmenter = await module.InteractiveSegmenter.createFromOptions(fileset, {
      baseOptions: { modelAssetPath: MAGIC_TOUCH_MODEL },
      outputConfidenceMasks: true,
      outputCategoryMask: false,
    });
    return { module, segmenter };
  })().catch((error) => {
    segmenterPromise = null;
    throw error;
  });
  return segmenterPromise;
}

export async function segmentPreparedObject(source: HTMLCanvasElement, seed: Point): Promise<PreparedSegment | null> {
  const { module, segmenter } = await getSegmenter();
  const crop = createSeedCrop(source, seed);
  segmenter.setImage(crop.canvas);
  const positive = module.BrushMode?.POSITIVE ?? 1;
  const result = segmenter.segment([{ brushMode: positive, point: [crop.seed], isCompleted: true }]);
  const mask = result?.confidenceMasks?.[0] ?? result;
  if (!mask?.getAsFloat32Array || !mask.width || !mask.height) return null;

  try {
    const raw = mask.getAsFloat32Array() as Float32Array;
    const values = projectMask({
      raw,
      maskWidth: mask.width as number,
      maskHeight: mask.height as number,
      sourceWidth: source.width,
      sourceHeight: source.height,
      crop,
    });
    const pixelBounds = boundsFor(values, source.width, source.height);
    if (!pixelBounds) return null;
    const pixelCount = (pixelBounds.x1 - pixelBounds.x0 + 1) * (pixelBounds.y1 - pixelBounds.y0 + 1);
    if (pixelCount < 36) return null;

    const bbox = {
      x: pixelBounds.x0 / source.width,
      y: pixelBounds.y0 / source.height,
      width: (pixelBounds.x1 - pixelBounds.x0 + 1) / source.width,
      height: (pixelBounds.y1 - pixelBounds.y0 + 1) / source.height,
    };
    return {
      bbox,
      centerX: bbox.x + bbox.width / 2,
      centerY: bbox.y + bbox.height / 2,
      maskDataUrl: maskUrl(values, source.width, source.height),
      cutoutDataUrl: cutoutUrl(source, values, pixelBounds),
      maskValues: values,
      width: source.width,
      height: source.height,
    };
  } finally {
    mask.close?.();
  }
}

function createSeedCrop(source: HTMLCanvasElement, seed: Point): Crop {
  const desiredWidth = Math.min(source.width, Math.max(280, Math.round(source.width * 0.5)));
  const desiredHeight = Math.min(source.height, Math.max(280, Math.round(source.height * 0.62)));
  const seedPxX = clamp(seed.x, 0, 1) * source.width;
  const seedPxY = clamp(seed.y, 0, 1) * source.height;
  const x = clamp(Math.round(seedPxX - desiredWidth / 2), 0, Math.max(0, source.width - desiredWidth));
  const y = clamp(Math.round(seedPxY - desiredHeight / 2), 0, Math.max(0, source.height - desiredHeight));
  const scale = Math.min(1, MAX_CROP_DIMENSION / Math.max(desiredWidth, desiredHeight));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(desiredWidth * scale));
  canvas.height = Math.max(1, Math.round(desiredHeight * scale));
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) throw new Error('Prepared-scene segmentation canvas is unavailable.');
  context.drawImage(source, x, y, desiredWidth, desiredHeight, 0, 0, canvas.width, canvas.height);
  return {
    canvas,
    x,
    y,
    width: desiredWidth,
    height: desiredHeight,
    seed: {
      x: clamp((seedPxX - x) / Math.max(desiredWidth, 1), 0, 1),
      y: clamp((seedPxY - y) / Math.max(desiredHeight, 1), 0, 1),
    },
  };
}

function projectMask({ raw, maskWidth, maskHeight, sourceWidth, sourceHeight, crop }: {
  raw: Float32Array;
  maskWidth: number;
  maskHeight: number;
  sourceWidth: number;
  sourceHeight: number;
  crop: Crop;
}) {
  const values = new Uint8ClampedArray(sourceWidth * sourceHeight);
  const x0 = clamp(Math.floor(crop.x), 0, sourceWidth - 1);
  const y0 = clamp(Math.floor(crop.y), 0, sourceHeight - 1);
  const x1 = clamp(Math.ceil(crop.x + crop.width), x0 + 1, sourceWidth);
  const y1 = clamp(Math.ceil(crop.y + crop.height), y0 + 1, sourceHeight);

  for (let y = y0; y < y1; y += 1) {
    const v = clamp((y + 0.5 - crop.y) / crop.height, 0, 0.999999);
    const my = clamp(Math.floor(v * maskHeight), 0, maskHeight - 1);
    for (let x = x0; x < x1; x += 1) {
      const u = clamp((x + 0.5 - crop.x) / crop.width, 0, 0.999999);
      const mx = clamp(Math.floor(u * maskWidth), 0, maskWidth - 1);
      const confidence = raw[my * maskWidth + mx] ?? 0;
      values[y * sourceWidth + x] = confidence >= THRESHOLD ? 255 : confidence >= 0.36 ? Math.round(((confidence - 0.36) / (THRESHOLD - 0.36)) * 180) : 0;
    }
  }
  return values;
}

function boundsFor(values: Uint8ClampedArray, width: number, height: number) {
  let x0 = width; let y0 = height; let x1 = -1; let y1 = -1;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if ((values[y * width + x] ?? 0) < 96) continue;
      x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y);
    }
  }
  if (x1 < x0 || y1 < y0) return null;
  const pad = Math.max(2, Math.round(Math.min(width, height) * 0.004));
  return {
    x0: clamp(x0 - pad, 0, width - 1),
    y0: clamp(y0 - pad, 0, height - 1),
    x1: clamp(x1 + pad, 0, width - 1),
    y1: clamp(y1 + pad, 0, height - 1),
  };
}

function maskUrl(values: Uint8ClampedArray, width: number, height: number) {
  const canvas = document.createElement('canvas');
  canvas.width = width; canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Prepared-scene mask canvas is unavailable.');
  const rgba = new Uint8ClampedArray(width * height * 4);
  for (let index = 0; index < values.length; index += 1) {
    const value = values[index] ?? 0;
    const offset = index * 4;
    rgba[offset] = 255; rgba[offset + 1] = 255; rgba[offset + 2] = 255; rgba[offset + 3] = value;
  }
  context.putImageData(new ImageData(rgba, width, height), 0, 0);
  return canvas.toDataURL('image/png');
}

function cutoutUrl(source: HTMLCanvasElement, values: Uint8ClampedArray, bounds: { x0: number; y0: number; x1: number; y1: number }) {
  const width = bounds.x1 - bounds.x0 + 1;
  const height = bounds.y1 - bounds.y0 + 1;
  const sourceContext = source.getContext('2d', { willReadFrequently: true });
  if (!sourceContext) throw new Error('Prepared-scene source pixels are unavailable.');
  const pixels = sourceContext.getImageData(bounds.x0, bounds.y0, width, height);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const sourceIndex = (bounds.y0 + y) * source.width + bounds.x0 + x;
      pixels.data[(y * width + x) * 4 + 3] = values[sourceIndex] ?? 0;
    }
  }
  const canvas = document.createElement('canvas');
  canvas.width = width; canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Prepared-scene cutout canvas is unavailable.');
  context.putImageData(pixels, 0, 0);
  return canvas.toDataURL('image/png');
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}
