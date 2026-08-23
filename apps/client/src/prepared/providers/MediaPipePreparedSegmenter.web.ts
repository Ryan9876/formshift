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
const COMPONENT_THRESHOLD = 48;

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

export async function segmentPreparedObject(source: HTMLCanvasElement, seed: Point, guideBox?: PreparedBox): Promise<PreparedSegment | null> {
  const { module, segmenter } = await getSegmenter();
  const crop = createSeedCrop(source, seed);
  segmenter.setImage(crop.canvas);
  const positive = module.BrushMode?.POSITIVE ?? 1;
  const result = segmenter.segment([{ brushMode: positive, point: [crop.seed], isCompleted: true }]);
  const mask = result?.confidenceMasks?.[0] ?? result;
  if (!mask?.getAsFloat32Array || !mask.width || !mask.height) return null;

  try {
    const raw = mask.getAsFloat32Array() as Float32Array;
    let values: Uint8ClampedArray = projectMask({
      raw,
      maskWidth: mask.width as number,
      maskHeight: mask.height as number,
      sourceWidth: source.width,
      sourceHeight: source.height,
      crop,
    });
    if (guideBox) values = refineMaskWithGuide(values, source.width, source.height, seed, guideBox);
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

function refineMaskWithGuide(values: Uint8ClampedArray, width: number, height: number, seed: Point, guideBox: PreparedBox) {
  const guide = expandGuide(guideBox, 0.22);
  const x0 = clamp(Math.floor(guide.x * width), 0, width - 1);
  const y0 = clamp(Math.floor(guide.y * height), 0, height - 1);
  const x1 = clamp(Math.ceil((guide.x + guide.width) * width), x0 + 1, width);
  const y1 = clamp(Math.ceil((guide.y + guide.height) * height), y0 + 1, height);
  const regionWidth = x1 - x0;
  const regionHeight = y1 - y0;
  const visited = new Uint8Array(regionWidth * regionHeight);
  const seedX = clamp(Math.round(seed.x * (width - 1)), 0, width - 1);
  const seedY = clamp(Math.round(seed.y * (height - 1)), 0, height - 1);
  const guidePixels = Math.max(1, Math.round(guideBox.width * width) * Math.round(guideBox.height * height));

  let best: number[] | null = null;
  let bestScore = -Infinity;

  for (let y = y0; y < y1; y += 1) {
    for (let x = x0; x < x1; x += 1) {
      const localIndex = (y - y0) * regionWidth + (x - x0);
      if (visited[localIndex] || (values[y * width + x] ?? 0) < COMPONENT_THRESHOLD) continue;
      const queue: number[] = [y * width + x];
      const component: number[] = [];
      visited[localIndex] = 1;
      let insideGuide = 0;
      let minDistanceSquared = Number.POSITIVE_INFINITY;

      for (let cursor = 0; cursor < queue.length; cursor += 1) {
        const sourceIndex = queue[cursor]!;
        const px = sourceIndex % width;
        const py = Math.floor(sourceIndex / width);
        component.push(sourceIndex);
        if (pointInGuide(px, py, width, height, guideBox)) insideGuide += 1;
        const dx = px - seedX;
        const dy = py - seedY;
        minDistanceSquared = Math.min(minDistanceSquared, dx * dx + dy * dy);

        visitNeighbor(px - 1, py);
        visitNeighbor(px + 1, py);
        visitNeighbor(px, py - 1);
        visitNeighbor(px, py + 1);
      }

      if (component.length < 16) continue;
      const overlapRatio = insideGuide / component.length;
      const sizeRatio = component.length / guidePixels;
      const guideDiagonal = Math.max(1, Math.hypot(guideBox.width * width, guideBox.height * height));
      const distanceRatio = Math.sqrt(minDistanceSquared) / guideDiagonal;
      const score = overlapRatio * 3 + Math.min(sizeRatio, 1.6) - Math.min(distanceRatio, 1.5) * 1.4;
      if (score > bestScore) {
        bestScore = score;
        best = component;
      }

      function visitNeighbor(nx: number, ny: number) {
        if (nx < x0 || nx >= x1 || ny < y0 || ny >= y1) return;
        const neighborLocal = (ny - y0) * regionWidth + (nx - x0);
        if (visited[neighborLocal]) return;
        visited[neighborLocal] = 1;
        const neighborIndex = ny * width + nx;
        if ((values[neighborIndex] ?? 0) >= COMPONENT_THRESHOLD) queue.push(neighborIndex);
      }
    }
  }

  if (!best?.length || bestScore < 0.5) return values;
  const refined = new Uint8ClampedArray(values.length);
  for (const sourceIndex of best) {
    refined[sourceIndex] = values[sourceIndex] ?? 0;
    const px = sourceIndex % width;
    const py = Math.floor(sourceIndex / width);
    for (let oy = -1; oy <= 1; oy += 1) {
      for (let ox = -1; ox <= 1; ox += 1) {
        const nx = px + ox;
        const ny = py + oy;
        if (nx < x0 || nx >= x1 || ny < y0 || ny >= y1) continue;
        const neighbor = ny * width + nx;
        if ((values[neighbor] ?? 0) > (refined[neighbor] ?? 0)) refined[neighbor] = values[neighbor] ?? 0;
      }
    }
  }
  return refined;
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

function expandGuide(box: PreparedBox, fraction: number): PreparedBox {
  const padX = box.width * fraction;
  const padY = box.height * fraction;
  const x = clamp(box.x - padX, 0, 1);
  const y = clamp(box.y - padY, 0, 1);
  const x1 = clamp(box.x + box.width + padX, 0, 1);
  const y1 = clamp(box.y + box.height + padY, 0, 1);
  return { x, y, width: Math.max(0, x1 - x), height: Math.max(0, y1 - y) };
}

function pointInGuide(x: number, y: number, width: number, height: number, guide: PreparedBox) {
  const nx = x / Math.max(1, width);
  const ny = y / Math.max(1, height);
  return nx >= guide.x && nx <= guide.x + guide.width && ny >= guide.y && ny <= guide.y + guide.height;
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}
