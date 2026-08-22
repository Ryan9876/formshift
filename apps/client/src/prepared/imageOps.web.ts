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
  const union = new Uint8ClampedArray(width * height);
  for (const mask of masks) {
    const length = Math.min(union.length, mask.length);
    for (let index = 0; index < length; index += 1) union[index] = Math.max(union[index] ?? 0, mask[index] ?? 0);
  }

  const maskCanvas = document.createElement('canvas');
  maskCanvas.width = width; maskCanvas.height = height;
  const maskContext = maskCanvas.getContext('2d');
  if (!maskContext) throw new Error('Prepared Scene clean-plate mask is unavailable.');
  const rgba = new Uint8ClampedArray(width * height * 4);
  for (let index = 0; index < union.length; index += 1) {
    const alpha = union[index] ?? 0;
    const offset = index * 4;
    rgba[offset] = 255; rgba[offset + 1] = 255; rgba[offset + 2] = 255;
    rgba[offset + 3] = alpha > 48 ? Math.min(255, alpha + 55) : 0;
  }
  maskContext.putImageData(new ImageData(rgba, width, height), 0, 0);

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

export function sampleDepth(normalized: Uint8ClampedArray, width: number, height: number, x: number, y: number) {
  const px = clamp(Math.round(clamp(x, 0, 1) * (width - 1)), 0, width - 1);
  const py = clamp(Math.round(clamp(y, 0, 1) * (height - 1)), 0, height - 1);
  return (normalized[py * width + px] ?? 0) / 255;
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
