import { inpaintPreparedMask } from './quickInpaint';

export async function loadPreparedSource(imageUrl: string, maxDimension = 1600) {
  const image = await loadImage(imageUrl);
  const scale = Math.min(1, maxDimension / Math.max(image.naturalWidth, image.naturalHeight));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
  canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) throw new Error('Prepared Scene source canvas is unavailable.');
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  return {
    canvas,
    originalWidth: image.naturalWidth,
    originalHeight: image.naturalHeight,
  };
}

export function createQuickCleanBackground(source: HTMLCanvasElement, masks: Uint8ClampedArray[]) {
  if (!masks.length) return source.toDataURL('image/jpeg', 0.92);
  const width = source.width;
  const height = source.height;
  const context = source.getContext('2d', { willReadFrequently: true });
  if (!context) throw new Error('Prepared Scene source pixels are unavailable for the quick clean plate.');

  const radius = quickExpansionRadius(width, height);
  const union = featheredExpandedUnionMask(masks, width, height, radius);
  const sourcePixels = context.getImageData(0, 0, width, height);
  const inpainted = inpaintPreparedMask(sourcePixels.data, union, width, height);

  const output = document.createElement('canvas');
  output.width = width;
  output.height = height;
  const outputContext = output.getContext('2d');
  if (!outputContext) throw new Error('Prepared Scene clean background is unavailable.');
  const ownedPixels = new Uint8ClampedArray(inpainted.pixels.length);
  ownedPixels.set(inpainted.pixels);
  outputContext.putImageData(new ImageData(ownedPixels, width, height), 0, 0);
  return output.toDataURL('image/jpeg', 0.92);
}

/**
 * GPT/image-edit providers expect an opaque black/white mask image.
 * White represents pixels that may be reconstructed; black must remain unchanged.
 */
export function createPreparedSceneRepairMask(masks: Uint8ClampedArray[], width: number, height: number) {
  const union = expandedUnionMask(masks, width, height, repairExpansionRadius(width, height));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Prepared Scene repair mask is unavailable.');
  const rgba = new Uint8ClampedArray(width * height * 4);
  for (let index = 0; index < union.length; index += 1) {
    const selected = (union[index] ?? 0) >= 40;
    const offset = index * 4;
    const value = selected ? 255 : 0;
    rgba[offset] = value;
    rgba[offset + 1] = value;
    rgba[offset + 2] = value;
    rgba[offset + 3] = 255;
  }
  context.putImageData(new ImageData(rgba, width, height), 0, 0);
  return canvas.toDataURL('image/png');
}

/**
 * AI providers may alter pixels outside the requested edit area. FormShift never
 * accepts those changes wholesale: only pixels covered by the derived object
 * masks are blended back into the immutable source-photo coordinate frame.
 */
export async function compositeRepairedCleanBackground(
  source: HTMLCanvasElement,
  repairedDataUrl: string,
  masks: Uint8ClampedArray[],
) {
  const width = source.width;
  const height = source.height;
  const union = featheredExpandedUnionMask(masks, width, height, repairExpansionRadius(width, height));
  const repaired = await loadImage(repairedDataUrl);

  const repairedCanvas = document.createElement('canvas');
  repairedCanvas.width = width;
  repairedCanvas.height = height;
  const repairedContext = repairedCanvas.getContext('2d', { willReadFrequently: true });
  if (!repairedContext) throw new Error('Prepared Scene repaired-background canvas is unavailable.');
  repairedContext.drawImage(repaired, 0, 0, width, height);

  const sourceContext = source.getContext('2d', { willReadFrequently: true });
  if (!sourceContext) throw new Error('Prepared Scene source pixels are unavailable.');
  const sourcePixels = sourceContext.getImageData(0, 0, width, height);
  const repairedPixels = repairedContext.getImageData(0, 0, width, height);
  const out = new ImageData(new Uint8ClampedArray(sourcePixels.data), width, height);

  for (let index = 0; index < union.length; index += 1) {
    const raw = union[index] ?? 0;
    if (raw < 18) continue;
    const alpha = clamp(raw / 255, 0.08, 1);
    const offset = index * 4;
    out.data[offset] = blend(sourcePixels.data[offset]!, repairedPixels.data[offset]!, alpha);
    out.data[offset + 1] = blend(sourcePixels.data[offset + 1]!, repairedPixels.data[offset + 1]!, alpha);
    out.data[offset + 2] = blend(sourcePixels.data[offset + 2]!, repairedPixels.data[offset + 2]!, alpha);
    out.data[offset + 3] = 255;
  }

  const output = document.createElement('canvas');
  output.width = width;
  output.height = height;
  const outputContext = output.getContext('2d');
  if (!outputContext) throw new Error('Prepared Scene repaired-background output is unavailable.');
  outputContext.putImageData(out, 0, 0);
  return output.toDataURL('image/jpeg', 0.94);
}

export function sampleDepth(normalized: Uint8ClampedArray, width: number, height: number, x: number, y: number) {
  const px = clamp(Math.round(clamp(x, 0, 1) * (width - 1)), 0, width - 1);
  const py = clamp(Math.round(clamp(y, 0, 1) * (height - 1)), 0, height - 1);
  return (normalized[py * width + px] ?? 0) / 255;
}

export function quickExpansionRadius(width: number, height: number) {
  return Math.round(clamp(Math.min(width, height) * 0.006, 4, 10));
}

export function repairExpansionRadius(width: number, height: number) {
  return Math.round(clamp(Math.min(width, height) * 0.008, 5, 14));
}

function unionMasks(masks: Uint8ClampedArray[], width: number, height: number) {
  const union = new Uint8ClampedArray(width * height);
  for (const mask of masks) {
    const length = Math.min(union.length, mask.length);
    for (let index = 0; index < length; index += 1) union[index] = Math.max(union[index] ?? 0, mask[index] ?? 0);
  }
  return union;
}

function expandedUnionMask(masks: Uint8ClampedArray[], width: number, height: number, radius: number) {
  let current = unionMasks(masks, width, height);
  if (radius <= 0) return current;

  for (let pass = 0; pass < radius; pass += 1) {
    const next = new Uint8ClampedArray(current);
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const index = y * width + x;
        let max = current[index] ?? 0;
        for (let dy = -1; dy <= 1; dy += 1) {
          for (let dx = -1; dx <= 1; dx += 1) {
            const nx = x + dx; const ny = y + dy;
            if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;
            max = Math.max(max, current[ny * width + nx] ?? 0);
          }
        }
        next[index] = max;
      }
    }
    current = next;
  }
  return current;
}

function featheredExpandedUnionMask(masks: Uint8ClampedArray[], width: number, height: number, radius: number) {
  let current = unionMasks(masks, width, height);
  if (radius <= 0) return current;

  for (let pass = 0; pass < radius; pass += 1) {
    const next = new Uint8ClampedArray(current);
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const index = y * width + x;
        let neighborMax = 0;
        for (let dy = -1; dy <= 1; dy += 1) {
          for (let dx = -1; dx <= 1; dx += 1) {
            const nx = x + dx; const ny = y + dy;
            if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;
            neighborMax = Math.max(neighborMax, current[ny * width + nx] ?? 0);
          }
        }
        next[index] = Math.max(current[index] ?? 0, Math.round(neighborMax * 0.82));
      }
    }
    current = next;
  }
  return current;
}

function blend(a: number, b: number, alpha: number) {
  return Math.round(a * (1 - alpha) + b * alpha);
}

function loadImage(url: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('The room photo could not be loaded for Prepared Scene analysis.'));
    image.src = url;
  });
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}
