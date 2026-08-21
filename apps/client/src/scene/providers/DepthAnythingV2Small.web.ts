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
let pipelinePromise: Promise<DepthPipeline> | null = null;

async function getPipeline(): Promise<DepthPipeline> {
  if (pipelinePromise) return pipelinePromise;
  pipelinePromise = (async () => {
    const dynamicImport = new Function('url', 'return import(url)') as (url: string) => Promise<any>;
    const transformers = await dynamicImport(TRANSFORMERS_ESM);
    const webGpu = typeof navigator !== 'undefined' && !!(navigator as any).gpu;
    return transformers.pipeline('depth-estimation', MODEL_ID, {
      device: webGpu ? 'webgpu' : 'wasm',
      dtype: webGpu ? 'fp16' : 'q8',
    }) as Promise<DepthPipeline>;
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
      const pipeline = await getPipeline();
      const result = await pipeline(imageUrl);
      if (!result.depth?.data || !result.depth.width || !result.depth.height) {
        throw new Error('Depth Anything returned no usable depth image.');
      }
      const normalized = toSingleChannel(result.depth);
      return {
        width: result.depth.width,
        height: result.depth.height,
        normalized,
        dataUrl: depthDataUrl(result.depth.width, result.depth.height, normalized),
        provider: 'transformers.js',
        model: MODEL_ID,
        modelVersion: MODEL_VERSION,
        processingMs: Math.round(performance.now() - startedAt),
      };
    },
  };
}
