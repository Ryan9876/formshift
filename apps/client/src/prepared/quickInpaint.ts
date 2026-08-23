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
      const vertical = new Uint8ClampedArray(4);
      let verticalValid = false;
      if (previousKnown >= 0 && bottom >= 0 && bottom !== previousKnown) {
        const t = (y - previousKnown) / (bottom - previousKnown);
        interpolatePixel(source, (previousKnown * width + x) * 4, (bottom * width + x) * 4, t, vertical, 0);
        verticalValid = true;
      } else if (previousKnown >= 0 || bottom >= 0) {
        const sampleY = previousKnown >= 0 ? previousKnown : bottom;
        copyPixel(source, (sampleY * width + x) * 4, vertical, 0);
        verticalValid = true;
      }

      const hasHorizontal = horizontalValid[index] === 1;
      if (!hasHorizontal && !verticalValid) continue;
      const alpha = clamp((rawMask - 24) / 112, 0.18, 1);
      for (let channel = 0; channel < 3; channel += 1) {
        const candidate = hasHorizontal && verticalValid
          ? Math.round(((horizontal[offset + channel] ?? 0) + (vertical[channel] ?? 0)) / 2)
          : hasHorizontal
            ? (horizontal[offset + channel] ?? 0)
            : (vertical[channel] ?? 0);
        output[offset + channel] = blend(source[offset + channel] ?? 0, candidate, alpha);
      }
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
  for (let channel = 0; channel < 3; channel += 1) {
    const from = source[fromOffset + channel] ?? 0;
    const to = source[toOffset + channel] ?? 0;
    target[targetOffset + channel] = Math.round(from + (to - from) * clamp(t, 0, 1));
  }
  target[targetOffset + 3] = 255;
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
