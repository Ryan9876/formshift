export type QuickInpaintStats = {
  maskedPixels: number;
  filledPixels: number;
};

const MASK_THRESHOLD = 40;

/**
 * Fast deterministic clean-plate approximation for Prepared Scene.
 *
 * The removed object's own pixels are never used as fill evidence. Each masked
 * pixel is reconstructed from the nearest unmasked boundary samples along its
 * row and column, then blended using the source mask alpha. This is deliberately
 * conservative and inexpensive; high-quality reconstruction remains an explicit
 * image-provider action.
 */
export function inpaintPreparedMask(
  source: Uint8ClampedArray,
  mask: Uint8ClampedArray,
  width: number,
  height: number,
): { pixels: Uint8ClampedArray; stats: QuickInpaintStats } {
  const pixelCount = width * height;
  if (width <= 0 || height <= 0 || source.length < pixelCount * 4 || mask.length < pixelCount) {
    throw new Error('Prepared Scene quick inpaint received invalid pixel dimensions.');
  }

  const output = new Uint8ClampedArray(source);
  const horizontal = new Uint8ClampedArray(source.length);
  const horizontalValid = new Uint8Array(pixelCount);
  const rightKnown = new Int32Array(width);
  let maskedPixels = 0;
  let filledPixels = 0;

  for (let index = 0; index < pixelCount; index += 1) {
    if ((mask[index] ?? 0) >= MASK_THRESHOLD) maskedPixels += 1;
  }
  if (!maskedPixels) return { pixels: output, stats: { maskedPixels: 0, filledPixels: 0 } };

  // Horizontal boundary interpolation. Nearest known pixels to the left/right
  // are always outside the removal mask, so the removed object cannot ghost
  // back into its own clean plate.
  for (let y = 0; y < height; y += 1) {
    let nextKnown = -1;
    for (let x = width - 1; x >= 0; x -= 1) {
      const index = y * width + x;
      if ((mask[index] ?? 0) < MASK_THRESHOLD) nextKnown = x;
      rightKnown[x] = nextKnown;
    }

    let previousKnown = -1;
    for (let x = 0; x < width; x += 1) {
      const index = y * width + x;
      if ((mask[index] ?? 0) < MASK_THRESHOLD) {
        previousKnown = x;
        continue;
      }
      const right = rightKnown[x] ?? -1;
      if (previousKnown < 0 && right < 0) continue;
      const offset = index * 4;
      if (previousKnown >= 0 && right >= 0 && right !== previousKnown) {
        const t = (x - previousKnown) / (right - previousKnown);
        interpolatePixel(source, (y * width + previousKnown) * 4, (y * width + right) * 4, t, horizontal, offset);
      } else {
        const sampleX = previousKnown >= 0 ? previousKnown : right;
        copyPixel(source, (y * width + sampleX) * 4, horizontal, offset);
      }
      horizontalValid[index] = 1;
    }
  }

  // Vertical interpolation is combined with the horizontal candidate. Averaging
  // the two axes suppresses directional streaks while remaining deterministic.
  // Keep the vertical candidate in scalar locals to avoid per-pixel allocations.
  const bottomKnown = new Int32Array(height);
  for (let x = 0; x < width; x += 1) {
    let nextKnown = -1;
    for (let y = height - 1; y >= 0; y -= 1) {
      const index = y * width + x;
      if ((mask[index] ?? 0) < MASK_THRESHOLD) nextKnown = y;
      bottomKnown[y] = nextKnown;
    }

    let previousKnown = -1;
    for (let y = 0; y < height; y += 1) {
      const index = y * width + x;
      const rawMask = mask[index] ?? 0;
      if (rawMask < MASK_THRESHOLD) {
        previousKnown = y;
        continue;
      }
      const bottom = bottomKnown[y] ?? -1;
      const offset = index * 4;
      let verticalRed = 0;
      let verticalGreen = 0;
      let verticalBlue = 0;
      let verticalValid = false;

      if (previousKnown >= 0 && bottom >= 0 && bottom !== previousKnown) {
        const t = clamp((y - previousKnown) / (bottom - previousKnown), 0, 1);
        const fromOffset = (previousKnown * width + x) * 4;
        const toOffset = (bottom * width + x) * 4;
        verticalRed = interpolateChannel(source[fromOffset] ?? 0, source[toOffset] ?? 0, t);
        verticalGreen = interpolateChannel(source[fromOffset + 1] ?? 0, source[toOffset + 1] ?? 0, t);
        verticalBlue = interpolateChannel(source[fromOffset + 2] ?? 0, source[toOffset + 2] ?? 0, t);
        verticalValid = true;
      } else if (previousKnown >= 0 || bottom >= 0) {
        const sampleY = previousKnown >= 0 ? previousKnown : bottom;
        const sampleOffset = (sampleY * width + x) * 4;
        verticalRed = source[sampleOffset] ?? 0;
        verticalGreen = source[sampleOffset + 1] ?? 0;
        verticalBlue = source[sampleOffset + 2] ?? 0;
        verticalValid = true;
      }

      const hasHorizontal = horizontalValid[index] === 1;
      if (!hasHorizontal && !verticalValid) continue;
      const alpha = clamp((rawMask - 24) / 112, 0.18, 1);
      const horizontalRed = horizontal[offset] ?? 0;
      const horizontalGreen = horizontal[offset + 1] ?? 0;
      const horizontalBlue = horizontal[offset + 2] ?? 0;
      const candidateRed = hasHorizontal && verticalValid ? Math.round((horizontalRed + verticalRed) / 2) : hasHorizontal ? horizontalRed : verticalRed;
      const candidateGreen = hasHorizontal && verticalValid ? Math.round((horizontalGreen + verticalGreen) / 2) : hasHorizontal ? horizontalGreen : verticalGreen;
      const candidateBlue = hasHorizontal && verticalValid ? Math.round((horizontalBlue + verticalBlue) / 2) : hasHorizontal ? horizontalBlue : verticalBlue;

      output[offset] = blend(source[offset] ?? 0, candidateRed, alpha);
      output[offset + 1] = blend(source[offset + 1] ?? 0, candidateGreen, alpha);
      output[offset + 2] = blend(source[offset + 2] ?? 0, candidateBlue, alpha);
      output[offset + 3] = 255;
      filledPixels += 1;
    }
  }

  return { pixels: output, stats: { maskedPixels, filledPixels } };
}

function interpolatePixel(
  source: Uint8ClampedArray,
  fromOffset: number,
  toOffset: number,
  t: number,
  target: Uint8ClampedArray,
  targetOffset: number,
) {
  const ratio = clamp(t, 0, 1);
  for (let channel = 0; channel < 3; channel += 1) {
    target[targetOffset + channel] = interpolateChannel(source[fromOffset + channel] ?? 0, source[toOffset + channel] ?? 0, ratio);
  }
  target[targetOffset + 3] = 255;
}

function interpolateChannel(from: number, to: number, t: number) {
  return Math.round(from + (to - from) * t);
}

function copyPixel(source: Uint8ClampedArray, sourceOffset: number, target: Uint8ClampedArray, targetOffset: number) {
  target[targetOffset] = source[sourceOffset] ?? 0;
  target[targetOffset + 1] = source[sourceOffset + 1] ?? 0;
  target[targetOffset + 2] = source[sourceOffset + 2] ?? 0;
  target[targetOffset + 3] = 255;
}

function blend(a: number, b: number, alpha: number) {
  return Math.round(a * (1 - alpha) + b * alpha);
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}
