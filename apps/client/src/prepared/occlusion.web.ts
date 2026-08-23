import type { DepthEstimate } from '../scene/types';
import { depthValueToNearness, type DepthNearDirection } from './depthSupport.ts';
import { projectedPreparedDepth } from './support.ts';
import type { PreparedSceneObject } from './types';

export type DestinationOcclusionResult = {
  dataUrl: string;
  hiddenFraction: number;
};

const OCCLUSION_MARGIN = 0.1;

export function shouldOccludeDepthSample(sourceNearness: number, objectNearness: number, margin = OCCLUSION_MARGIN) {
  return sourceNearness >= objectNearness + margin;
}

export async function createDestinationOccludedCutout(
  object: PreparedSceneObject,
  depth: DepthEstimate,
  direction: DepthNearDirection,
): Promise<DestinationOcclusionResult | null> {
  if (direction === 'unknown' || !object.cutoutDataUrl || typeof object.approximateDepth !== 'number') return null;
  const image = await loadImage(object.cutoutDataUrl);
  const width = Math.max(1, image.naturalWidth || image.width);
  const height = Math.max(1, image.naturalHeight || image.height);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) return null;
  context.drawImage(image, 0, 0, width, height);
  const pixels = context.getImageData(0, 0, width, height);
  const objectNearness = projectedPreparedDepth(object);
  let eligible = 0;
  let hidden = 0;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const offset = (y * width + x) * 4;
      const alpha = pixels.data[offset + 3] ?? 0;
      if (alpha < 24) continue;
      eligible += 1;
      const u = (x + 0.5) / width;
      const v = (y + 0.5) / height;
      const destinationX = object.position.x + (u - 0.5) * object.bbox.width * object.scale;
      const destinationY = object.position.y + (v - 0.5) * object.bbox.height * object.scale;
      if (destinationX < 0 || destinationX > 1 || destinationY < 0 || destinationY > 1) continue;
      const sourceRaw = sampleDepth(depth.normalized, depth.width, depth.height, destinationX, destinationY);
      const sourceNearness = depthValueToNearness(sourceRaw, direction);
      if (!shouldOccludeDepthSample(sourceNearness, objectNearness)) continue;
      const excess = Math.min(1, Math.max(0, (sourceNearness - objectNearness - OCCLUSION_MARGIN) / 0.18));
      const retainedAlpha = Math.round(alpha * (1 - (0.72 + excess * 0.28)));
      pixels.data[offset + 3] = retainedAlpha;
      hidden += 1;
    }
  }

  if (!eligible || hidden / eligible < 0.01) return null;
  context.putImageData(pixels, 0, 0);
  return {
    dataUrl: canvas.toDataURL('image/png'),
    hiddenFraction: hidden / eligible,
  };
}

function sampleDepth(values: Uint8ClampedArray, width: number, height: number, x: number, y: number) {
  const px = clamp(Math.round(clamp(x, 0, 1) * (width - 1)), 0, width - 1);
  const py = clamp(Math.round(clamp(y, 0, 1) * (height - 1)), 0, height - 1);
  return (values[py * width + px] ?? 0) / 255;
}

function loadImage(url: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Prepared Scene cutout could not be loaded for occlusion.'));
    image.src = url;
  });
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}
