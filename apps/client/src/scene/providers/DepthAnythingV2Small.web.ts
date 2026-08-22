import type { DepthEstimate } from '../types';
import type { DepthProvider } from './DepthProvider';

const TRANSFORMERS_ESM = 'https://cdn.jsdelivr.net/npm/@huggingface/transformers@4.2.0';
const MODEL_ID = 'onnx-community/depth-anything-v2-small-ONNX';
const MODEL_VERSION = 'depth-anything-v2-small-onnx@main';

type RawDepthImage = {
  data: Uint8Array | Uint8ClampedArray;
  width: number;
  height: number;
  channels?: number;
};

type DepthPipeline = (input: string) => Promise<{ depth?: RawDepthImage }>;
type InferenceBackend = 'webgpu' | 'wasm';
let pipelinePromise: Promise<{ pipeline: DepthPipeline; backend: InferenceBackend }> | null = null;

function isAppleWebKit() {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent ?? '';
  const appleMobile = /iPad|iPhone|iPod/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const safari = /Safari/i.test(ua) && !/Chrome|Chromium|Edg|OPR|Firefox|CriOS|FxiOS/i.test(ua);
  return appleMobile || safari;
}

function canAttemptWebGpu() {
  return typeof navigator !== 'undefined' && !!(navigator as any).gpu && !isAppleWebKit();
}

function configureWasm(transformers: any) {
  const wasm = transformers?.env?.backends?.onnx?.wasm;
  if (!wasm) return;
  wasm.numThreads = 1;
  wasm.proxy = false;
}

async function buildPipeline(transformers: any, backend: InferenceBackend): Promise<DepthPipeline> {
  if (backend === 'wasm') configureWasm(transformers);
  return transformers.pipeline('depth-estimation', MODEL_ID, {
    device: backend,
    dtype: backend === 'webgpu' ? 'fp16' : 'q8',
  }) as Promise<DepthPipeline>;
}

async function getPipeline(): Promise<{ pipeline: DepthPipeline; backend: InferenceBackend }> {
  if (pipelinePromise) return pipelinePromise;
  pipelinePromise = (async () => {
    const dynamicImport = new Function('url', 'return import(url)') as (url: string) => Promise<any>;
    const transformers = await dynamicImport(TRANSFORMERS_ESM);

    if (canAttemptWebGpu()) {
      try {
        return { pipeline: await buildPipeline(transformers, 'webgpu'), backend: 'webgpu' as const };
      } catch {
        // Exposed WebGPU does not guarantee a complete ONNX WebGPU backend.
      }
    }

    return { pipeline: await buildPipeline(transformers, 'wasm'), backend: 'wasm' as const };
  })().catch((error) => {
    pipelinePromise = null;
    throw error;
  });
  return pipelinePromise;
}

function toSingleChannel(image: RawDepthImage) {
  const channels = image.channels ?? Math.max(1, Math.round(image.data.length / Math.max(1, image.width * image.height)));
  if (channels === 1) return new Uint8ClampedArray(image.data);
  const output = new Uint8ClampedArray(image.width * image.height);
  for (let index = 0; index < output.length; index += 1) {
    output[index] = image.data[index * channels] ?? 0;
  }
  return output;
}

function depthDataUrl(width: number, height: number, values: Uint8ClampedArray) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Depth canvas is unavailable.');
  const rgba = new Uint8ClampedArray(width * height * 4);
  for (let index = 0; index < values.length; index += 1) {
    const value = values[index] ?? 0;
    const offset = index * 4;
    rgba[offset] = value;
    rgba[offset + 1] = value;
    rgba[offset + 2] = value;
    rgba[offset + 3] = 255;
  }
  context.putImageData(new ImageData(rgba, width, height), 0, 0);
  return canvas.toDataURL('image/png');
}

export function createDepthProvider(): DepthProvider {
  return {
    id: 'depth-anything-v2-small-local-web',
    model: 'Depth Anything V2 Small',
    modelVersion: MODEL_VERSION,
    isSupported: () => typeof window !== 'undefined' && typeof document !== 'undefined',
    estimate: async (imageUrl: string): Promise<DepthEstimate> => {
      if (!imageUrl) throw new Error('A source room photo is required for depth estimation.');
      const startedAt = performance.now();
      const runtime = await getPipeline();
      const result = await runtime.pipeline(imageUrl);
      if (!result.depth?.data || !result.depth.width || !result.depth.height) {
        throw new Error('Depth Anything returned no usable depth image.');
      }
      const normalized = toSingleChannel(result.depth);
      return {
        width: result.depth.width,
        height: result.depth.height,
        normalized,
        dataUrl: depthDataUrl(result.depth.width, result.depth.height, normalized),
        provider: `transformers.js-${runtime.backend}`,
        model: MODEL_ID,
        modelVersion: MODEL_VERSION,
        processingMs: Math.round(performance.now() - startedAt),
      };
    },
  };
}
