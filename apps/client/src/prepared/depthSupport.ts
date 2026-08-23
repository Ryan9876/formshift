import type { DepthEstimate } from '../scene/types';
import { DEFAULT_PREPARED_SUPPORT_MODEL, type PreparedSupportModel } from './support';

type BoundarySample = { x: number; y: number; strength: number };

const COLUMN_COUNT = 13;
const MIN_SAMPLE_STRENGTH = 5.5;
const MIN_SAMPLES = 4;

export function estimateSupportModelFromDepth(estimate: DepthEstimate): PreparedSupportModel | null {
  if (!estimate.width || !estimate.height || estimate.normalized.length < estimate.width * estimate.height) return null;

  const samples: BoundarySample[] = [];
  for (let index = 0; index < COLUMN_COUNT; index += 1) {
    const x = 0.06 + (index / Math.max(1, COLUMN_COUNT - 1)) * 0.88;
    const sample = strongestBoundaryAtX(estimate.normalized, estimate.width, estimate.height, x);
    if (sample && sample.strength >= MIN_SAMPLE_STRENGTH) samples.push(sample);
  }
  if (samples.length < MIN_SAMPLES) return null;

  const medianY = median(samples.map((sample) => sample.y));
  const robust = samples.filter((sample) => Math.abs(sample.y - medianY) <= 0.12);
  if (robust.length < MIN_SAMPLES) return null;

  const fit = fitBoundary(robust);
  const residual = robust.reduce((sum, sample) => sum + Math.abs(sample.y - boundaryAt(fit.centerY, fit.slope, sample.x)), 0) / robust.length;
  if (!Number.isFinite(residual) || residual > 0.09) return null;

  const averageStrength = robust.reduce((sum, sample) => sum + sample.strength, 0) / robust.length;
  const coverage = robust.length / COLUMN_COUNT;
  const strengthConfidence = clamp((averageStrength - MIN_SAMPLE_STRENGTH) / 28, 0, 1);
  const residualConfidence = clamp(1 - residual / 0.09, 0, 1);
  const confidence = clamp(0.28 + coverage * 0.24 + strengthConfidence * 0.24 + residualConfidence * 0.16, 0.34, 0.78);

  return {
    floorRegionStartY: clamp(fit.centerY, 0.44, 0.78),
    floorBoundarySlope: clamp(fit.slope, -0.22, 0.22),
    confidence,
    source: 'depth-profile',
  };
}

export function mergePreparedSupportModels(anchor: PreparedSupportModel, depth: PreparedSupportModel | null): PreparedSupportModel {
  if (!depth) return anchor;
  if (anchor.source === 'fallback') return depth.confidence >= 0.4 ? depth : anchor;
  if (depth.confidence < 0.4) return anchor;

  const disagreement = Math.abs(anchor.floorRegionStartY - depth.floorRegionStartY);
  if (disagreement > 0.16) {
    return depth.confidence > anchor.confidence + 0.1 ? depth : anchor;
  }

  const anchorWeight = clamp(anchor.confidence, 0.2, 0.85);
  const depthWeight = clamp(depth.confidence, 0.2, 0.8);
  const total = anchorWeight + depthWeight;
  const agreementBonus = clamp((0.12 - disagreement) / 0.12, 0, 1) * 0.08;

  return {
    floorRegionStartY: clamp((anchor.floorRegionStartY * anchorWeight + depth.floorRegionStartY * depthWeight) / total, 0.42, 0.8),
    floorBoundarySlope: clamp((anchor.floorBoundarySlope * anchorWeight + depth.floorBoundarySlope * depthWeight) / total, -0.22, 0.22),
    confidence: clamp(Math.max(anchor.confidence, depth.confidence) + agreementBonus, 0, 0.84),
    source: 'hybrid',
  };
}

function strongestBoundaryAtX(values: Uint8ClampedArray, width: number, height: number, normalizedX: number): BoundarySample | null {
  const x = clamp(Math.round(normalizedX * (width - 1)), 0, width - 1);
  const yStart = clamp(Math.round(height * 0.36), 2, height - 3);
  const yEnd = clamp(Math.round(height * 0.84), yStart + 1, height - 3);
  const step = Math.max(1, Math.round(height / 220));
  const radiusX = Math.max(1, Math.round(width / 260));
  const radiusY = Math.max(2, Math.round(height / 140));

  let bestY = -1;
  let bestStrength = 0;
  for (let y = yStart; y <= yEnd; y += step) {
    const above = meanWindow(values, width, height, x, y - radiusY, radiusX, Math.max(1, Math.floor(radiusY / 2)));
    const below = meanWindow(values, width, height, x, y + radiusY, radiusX, Math.max(1, Math.floor(radiusY / 2)));
    const rawStrength = Math.abs(below - above);
    const normalizedY = y / height;
    const locationWeight = clamp(1 - Math.abs(normalizedY - 0.62) * 0.55, 0.78, 1);
    const strength = rawStrength * locationWeight;
    if (strength > bestStrength) {
      bestStrength = strength;
      bestY = y;
    }
  }

  if (bestY < 0) return null;
  return { x: normalizedX, y: bestY / height, strength: bestStrength };
}

function meanWindow(values: Uint8ClampedArray, width: number, height: number, centerX: number, centerY: number, radiusX: number, radiusY: number) {
  const x0 = clamp(centerX - radiusX, 0, width - 1);
  const x1 = clamp(centerX + radiusX, 0, width - 1);
  const y0 = clamp(centerY - radiusY, 0, height - 1);
  const y1 = clamp(centerY + radiusY, 0, height - 1);
  let sum = 0;
  let count = 0;
  for (let y = y0; y <= y1; y += 1) {
    for (let x = x0; x <= x1; x += 1) {
      sum += values[y * width + x] ?? 0;
      count += 1;
    }
  }
  return count ? sum / count : 0;
}

function fitBoundary(samples: BoundarySample[]) {
  const meanX = samples.reduce((sum, sample) => sum + sample.x, 0) / samples.length;
  const meanY = samples.reduce((sum, sample) => sum + sample.y, 0) / samples.length;
  let numerator = 0;
  let denominator = 0;
  for (const sample of samples) {
    const dx = sample.x - meanX;
    numerator += dx * (sample.y - meanY);
    denominator += dx * dx;
  }
  const slope = denominator > 0.005 ? numerator / denominator : 0;
  const centerY = meanY - slope * (meanX - 0.5);
  return { centerY, slope };
}

function boundaryAt(centerY: number, slope: number, x: number) {
  return centerY + slope * (x - 0.5);
}

function median(values: number[]) {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  if (sorted.length % 2) return sorted[middle] ?? 0;
  return ((sorted[middle - 1] ?? 0) + (sorted[middle] ?? 0)) / 2;
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

export const DEFAULT_DEPTH_SUPPORT_MODEL = DEFAULT_PREPARED_SUPPORT_MODEL;
