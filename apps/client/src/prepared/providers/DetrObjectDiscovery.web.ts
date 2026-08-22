import type { ObjectDetectionCandidate } from '../types';
import type { ObjectDiscoveryProvider, ObjectDiscoveryResult } from './ObjectDiscoveryProvider';

const TRANSFORMERS_ESM = 'https://cdn.jsdelivr.net/npm/@huggingface/transformers@4.2.0';
const MODEL_ID = 'Xenova/detr-resnet-50';
const MODEL_VERSION = 'detr-resnet-50-onnx@main';

type RawDetection = {
  score?: number;
  label?: string;
  box?: { xmin?: number; ymin?: number; xmax?: number; ymax?: number };
};
type Detector = (input: string, options?: { threshold?: number }) => Promise<RawDetection[]>;

let detectorPromise: Promise<Detector> | null = null;

async function getDetector(): Promise<Detector> {
  if (detectorPromise) return detectorPromise;
  detectorPromise = (async () => {
    const dynamicImport = new Function('url', 'return import(url)') as (url: string) => Promise<any>;
    const transformers = await dynamicImport(TRANSFORMERS_ESM);
    const webGpu = typeof navigator !== 'undefined' && !!(navigator as any).gpu;
    return transformers.pipeline('object-detection', MODEL_ID, {
      device: webGpu ? 'webgpu' : 'wasm',
      dtype: webGpu ? 'fp16' : 'q8',
    }) as Promise<Detector>;
  })().catch((error) => {
    detectorPromise = null;
    throw error;
  });
  return detectorPromise;
}

function normalize(raw: RawDetection): ObjectDetectionCandidate | null {
  const score = Number(raw.score);
  const box = raw.box;
  if (
    !raw.label ||
    !Number.isFinite(score) ||
    !box ||
    !Number.isFinite(box.xmin) ||
    !Number.isFinite(box.ymin) ||
    !Number.isFinite(box.xmax) ||
    !Number.isFinite(box.ymax)
  ) return null;
  if ((box.xmax as number) <= (box.xmin as number) || (box.ymax as number) <= (box.ymin as number)) return null;
  return {
    label: raw.label.toLowerCase(),
    score,
    box: {
      xmin: box.xmin as number,
      ymin: box.ymin as number,
      xmax: box.xmax as number,
      ymax: box.ymax as number,
    },
  };
}

export function createObjectDiscoveryProvider(): ObjectDiscoveryProvider {
  return {
    id: 'detr-resnet-50-local-web',
    model: 'DETR ResNet-50',
    modelVersion: MODEL_VERSION,
    isSupported: () => typeof window !== 'undefined' && typeof document !== 'undefined',
    discover: async (imageUrl: string): Promise<ObjectDiscoveryResult> => {
      if (!imageUrl) throw new Error('A source room photo is required for object discovery.');
      const startedAt = performance.now();
      const detector = await getDetector();
      const raw = await detector(imageUrl, { threshold: 0.52 });
      const candidates = raw.map(normalize).filter((value): value is ObjectDetectionCandidate => !!value);
      return {
        candidates,
        provider: 'transformers.js',
        model: MODEL_ID,
        modelVersion: MODEL_VERSION,
        processingMs: Math.round(performance.now() - startedAt),
      };
    },
  };
}
