type Point = { x: number; y: number };
type CachedMask = { width: number; height: number; values: Float32Array; seedKey: string };
type Crop = { canvas: HTMLCanvasElement; x: number; y: number; width: number; height: number; seed: Point };
type SegmenterModule = {
  FilesetResolver: { forVisionTasks(path: string): Promise<unknown> };
  InteractiveSegmenter: { createFromOptions(fileset: unknown, options: unknown): Promise<any> };
  BrushMode?: { POSITIVE?: unknown };
};

const MEDIAPIPE_BUNDLE = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.0.1/vision_bundle.mjs';
const MEDIAPIPE_WASM = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.0.1/wasm';
const MAGIC_TOUCH_MODEL = 'https://storage.googleapis.com/mediapipe-models/interactive_segmenter_v2/magic_touch/int8/1/interactive_segmentation.task';
const MAX_CROP_DIMENSION = 820;
const MAX_OUTPUT_DIMENSION = 1000;

let enginePromise: Promise<void> | null = null;

/**
 * Transitional adapter for the validated Photo Arrange interaction core.
 * It preserves the production object-centered segmentation behavior without
 * DOM observation or UI-text coupling. A later cycle can inject this provider
 * directly into the editor and remove the factory bridge entirely.
 */
export function prepareObjectCenteredSelectionEngine() {
  if (enginePromise) return enginePromise;
  enginePromise = (async () => {
    const dynamicImport = new Function('url', 'return import(url)') as (url: string) => Promise<SegmenterModule>;
    const module = await dynamicImport(MEDIAPIPE_BUNDLE);
    const fileset = await module.FilesetResolver.forVisionTasks(MEDIAPIPE_WASM);
    const real = await module.InteractiveSegmenter.createFromOptions(fileset, {
      baseOptions: { modelAssetPath: MAGIC_TOUCH_MODEL },
      outputConfidenceMasks: true,
      outputCategoryMask: false,
    });

    let sourceImage: HTMLCanvasElement | null = null;
    let cached: CachedMask | null = null;

    const proxy: any = {
      __formshiftV19: true,
      setImage(image: HTMLCanvasElement) {
        sourceImage = image;
      },
      segment(strokes: any[]) {
        if (!sourceImage) throw new Error('Selection image is not ready.');
        const seed = firstPoint(strokes);
        if (!seed) throw new Error('Tap the object again.');
        const seedKey = `${Math.round(seed.x * 700)}:${Math.round(seed.y * 700)}`;
        if (cached && cached.seedKey === seedKey) return fakeResult(cached);

        const crop = createSeedCrop(sourceImage, seed);
        real.setImage(crop.canvas);
        const positive = module.BrushMode?.POSITIVE ?? 1;
        const result = real.segment([{ brushMode: positive, point: [crop.seed], isCompleted: true }]);
        const mask = result?.confidenceMasks?.[0] ?? result;
        if (!mask?.getAsFloat32Array) return result;

        const raw = mask.getAsFloat32Array() as Float32Array;
        const projected = projectCropMask({
          raw,
          maskWidth: mask.width as number,
          maskHeight: mask.height as number,
          sourceWidth: sourceImage.width,
          sourceHeight: sourceImage.height,
          crop,
        });
        cached = { ...projected, seedKey };
        mask.close?.();
        return fakeResult(cached);
      },
      close() {
        cached = null;
        real.close?.();
      },
    };

    // The frozen v2.2 interaction core creates this same module lazily. Module
    // caching lets it receive the validated focused-crop proxy without a UI wrapper.
    module.InteractiveSegmenter.createFromOptions = async () => proxy;
  })().catch((error) => {
    enginePromise = null;
    throw error;
  });
  return enginePromise;
}

function createSeedCrop(source: HTMLCanvasElement, seed: Point): Crop {
  const desiredWidth = Math.min(source.width, Math.max(320, Math.round(source.width * 0.58)));
  const desiredHeight = Math.min(source.height, Math.max(320, Math.round(source.height * 0.72)));
  const seedPxX = seed.x * source.width;
  const seedPxY = seed.y * source.height;
  const x = clamp(Math.round(seedPxX - desiredWidth / 2), 0, Math.max(0, source.width - desiredWidth));
  const y = clamp(Math.round(seedPxY - desiredHeight / 2), 0, Math.max(0, source.height - desiredHeight));

  const scale = Math.min(1, MAX_CROP_DIMENSION / Math.max(desiredWidth, desiredHeight));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(desiredWidth * scale));
  canvas.height = Math.max(1, Math.round(desiredHeight * scale));
  canvas.getContext('2d', { willReadFrequently: true })!.drawImage(
    source,
    x,
    y,
    desiredWidth,
    desiredHeight,
    0,
    0,
    canvas.width,
    canvas.height,
  );

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

function projectCropMask({ raw, maskWidth, maskHeight, sourceWidth, sourceHeight, crop }: {
  raw: Float32Array;
  maskWidth: number;
  maskHeight: number;
  sourceWidth: number;
  sourceHeight: number;
  crop: Crop;
}) {
  const scale = Math.min(1, MAX_OUTPUT_DIMENSION / Math.max(sourceWidth, sourceHeight));
  const width = Math.max(1, Math.round(sourceWidth * scale));
  const height = Math.max(1, Math.round(sourceHeight * scale));
  const values = new Float32Array(width * height);

  const outX0 = clamp(Math.floor((crop.x / sourceWidth) * width), 0, width - 1);
  const outY0 = clamp(Math.floor((crop.y / sourceHeight) * height), 0, height - 1);
  const outX1 = clamp(Math.ceil(((crop.x + crop.width) / sourceWidth) * width), outX0 + 1, width);
  const outY1 = clamp(Math.ceil(((crop.y + crop.height) / sourceHeight) * height), outY0 + 1, height);

  for (let oy = outY0; oy < outY1; oy += 1) {
    const sourceY = ((oy + 0.5) / height) * sourceHeight;
    const v = clamp((sourceY - crop.y) / crop.height, 0, 0.999999);
    const my = clamp(Math.floor(v * maskHeight), 0, maskHeight - 1);
    for (let ox = outX0; ox < outX1; ox += 1) {
      const sourceX = ((ox + 0.5) / width) * sourceWidth;
      const u = clamp((sourceX - crop.x) / crop.width, 0, 0.999999);
      const mx = clamp(Math.floor(u * maskWidth), 0, maskWidth - 1);
      const confidence = raw[my * maskWidth + mx] ?? 0;
      values[oy * width + ox] = clamp((confidence - 0.40) / 0.34, 0, 1);
    }
  }

  return { width, height, values };
}

function fakeResult(mask: CachedMask) {
  return {
    confidenceMasks: [{
      width: mask.width,
      height: mask.height,
      getAsFloat32Array: () => new Float32Array(mask.values),
      close: () => undefined,
    }],
  };
}

function firstPoint(strokes: any[]): Point | null {
  if (!Array.isArray(strokes)) return null;
  for (const stroke of strokes) {
    const point = stroke?.point?.[0];
    if (point && Number.isFinite(point.x) && Number.isFinite(point.y)) return { x: point.x, y: point.y };
  }
  return null;
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}
