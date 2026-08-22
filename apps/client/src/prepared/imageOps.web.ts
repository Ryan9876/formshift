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
  const union = expandedUnionMask(masks, width, height, 2);

  const maskCanvas = alphaMaskCanvas(union, width, height, true);
  const fill = document.createElement('canvas');
  fill.width = width; fill.height = height;
  const fillContext = fill.getContext('2d');
  if (!fillContext) throw new Error('Prepared Scene clean-plate fill is unavailable.');
  const shift = Math.max(14, Math.round(Math.min(width, height) * 0.04));
  fillContext.save();
  fillContext.filter = `blur(${Math.max(10, Math.round(shift * 0.46))}px)`;
  fillContext.globalAlpha = 1;
  fillContext.drawImage(source, -shift, 0, width, height);
  fillContext.globalAlpha = 0.28;
  fillContext.drawImage(source, shift, 0, width, height);
  fillContext.drawImage(source, 0, -shift, width, height);
  fillContext.drawImage(source, 0, shift, width, height);
  fillContext.globalAlpha = 0.16;
  const insetX = Math.round(width * 0.025);
  const insetY = Math.round(height * 0.025);
  fillContext.drawImage(source, insetX, insetY, width - insetX * 2, height - insetY * 2, 0, 0, width, height);
  fillContext.restore();
  fillContext.globalCompositeOperation = 'destination-in';
  fillContext.drawImage(maskCanvas, 0, 0);

  const output = document.createElement('canvas');
  output.width = width; output.height = height;
  const outputContext = output.getContext('2d');
  if (!outputContext) throw new Error('Prepared Scene clean background is unavailable.');
  outputContext.drawImage(source, 0, 0);
  outputContext.globalCompositeOperation = 'destination-out';
  outputContext.drawImage(maskCanvas, 0, 0);
  outputContext.globalCompositeOperation = 'source-over';
  outputContext.drawImage(fill, 0, 0);
  outputContext.drawImage(fill, 0, 0);
  return output.toDataURL('image/jpeg', 0.92);
}

/**
 * GPT/image-edit providers expect an opaque black/white mask image.
 * White represents pixels that may be reconstructed; black must remain unchanged.
 */
export function createPreparedSceneRepairMask(masks: Uint8ClampedArray[], width: number, height: number) {
  const union = expandedUnionMask(masks, width, height, 3);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Prepared Scene repair mask is unavailable.');
  const rgba = new Uint8ClampedArray(width * height * 4);
  for (let index = 0; index < union.length; index += 1) {
    const selected = (union[index] ?? 0) >= 48;
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
  const union = expandedUnionMask(masks, width, height, 3);
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
    if (raw < 24) continue;
    const alpha = Math.min(1, Math.max(0.22, raw / 255));
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

function expandedUnionMask(masks: Uint8ClampedArray[], width: number, height: number, radius: number) {
  const union = new Uint8ClampedArray(width * height);
  for (const mask of masks) {
    const length = Math.min(union.length, mask.length);
    for (let index = 0; index < length; index += 1) union[index] = Math.max(union[index] ?? 0, mask[index] ?? 0);
  }
  if (radius <= 0) return union;

  let current = union;
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

function alphaMaskCanvas(union: Uint8ClampedArray, width: number, height: number, feather: boolean) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Prepared Scene clean-plate mask is unavailable.');
  const rgba = new Uint8ClampedArray(width * height * 4);
  for (let index = 0; index < union.length; index += 1) {
    const raw = union[index] ?? 0;
    const alpha = raw > 48 ? (feather ? Math.min(255, raw + 55) : 255) : 0;
    const offset = index * 4;
    rgba[offset] = 255;
    rgba[offset + 1] = 255;
    rgba[offset + 2] = 255;
    rgba[offset + 3] = alpha;
  }
  context.putImageData(new ImageData(rgba, width, height), 0, 0);
  return canvas;
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
