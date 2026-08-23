import type { DepthEstimate } from '../scene/types';
import { DEFAULT_PREPARED_SUPPORT_MODEL, type PreparedSupportModel } from './support.ts';

type BoundarySample = { x: number; y: number; strength: number; contextStrength: number };
export type DepthNearDirection = 'higher-is-nearer' | 'lower-is-nearer' | 'unknown';
export type DepthSupportReason = 'accepted' | 'invalid-depth' | 'insufficient-strong-transitions' | 'incoherent-transitions' | 'high-residual';
export type DepthSupportDiagnostics = {
  reason: DepthSupportReason;
  columns: number;
  strongSamples: number;
  robustSamples: number;
  xCoverage: number | null;
  averageStrength: number | null;
  averageContextStrength: number | null;
  residual: number | null;
  centerY: number | null;
  slope: number | null;
  nearDirection: DepthNearDirection;
  nearDirectionConfidence: number;
};
export type DepthSupportAnalysis = { model: PreparedSupportModel | null; diagnostics: DepthSupportDiagnostics };
export type SupportMergeDecision = 'anchor-only-no-depth' | 'anchor-only-weak-depth' | 'depth-replaces-fallback' | 'anchor-wins-disagreement' | 'depth-wins-disagreement' | 'hybrid-agreement';
export type SupportMergeResult = { model: PreparedSupportModel; decision: SupportMergeDecision; disagreement: number | null };

const COLUMN_COUNT = 13;
const MIN_SAMPLE_STRENGTH = 5.5;
const MIN_SAMPLES = 4;
const MIN_ROBUST_SAMPLES = 5;
const MIN_X_COVERAGE = 0.34;

export function analyzeSupportModelFromDepth(estimate: DepthEstimate): DepthSupportAnalysis {
  const direction = estimateDepthNearDirection(estimate);
  const base = {
    columns: COLUMN_COUNT,
    strongSamples: 0,
    robustSamples: 0,
    xCoverage: null,
    averageStrength: null,
    averageContextStrength: null,
    residual: null,
    centerY: null,
    slope: null,
    nearDirection: direction.direction,
    nearDirectionConfidence: direction.confidence,
  } satisfies Omit<DepthSupportDiagnostics, 'reason'>;

  if (!estimate.width || !estimate.height || estimate.normalized.length < estimate.width * estimate.height) {
    return { model: null, diagnostics: { ...base, reason: 'invalid-depth' } };
  }

  const samples: BoundarySample[] = [];
  for (let index = 0; index < COLUMN_COUNT; index += 1) {
    const x = 0.06 + (index / Math.max(1, COLUMN_COUNT - 1)) * 0.88;
    const sample = strongestBoundaryAtX(estimate.normalized, estimate.width, estimate.height, x, direction.direction);
    if (sample && sample.strength >= MIN_SAMPLE_STRENGTH) samples.push(sample);
  }
  if (samples.length < MIN_SAMPLES) {
    return { model: null, diagnostics: { ...base, reason: 'insufficient-strong-transitions', strongSamples: samples.length } };
  }

  const medianY = median(samples.map((sample) => sample.y));
  const robust = samples.filter((sample) => Math.abs(sample.y - medianY) <= 0.12);
  const xCoverage = robust.length > 1
    ? Math.max(...robust.map((sample) => sample.x)) - Math.min(...robust.map((sample) => sample.x))
    : 0;
  const averageStrength = robust.length
    ? robust.reduce((sum, sample) => sum + sample.strength, 0) / robust.length
    : null;
  const averageContextStrength = robust.length
    ? robust.reduce((sum, sample) => sum + sample.contextStrength, 0) / robust.length
    : null;

  if (robust.length < MIN_ROBUST_SAMPLES || xCoverage < MIN_X_COVERAGE) {
    return {
      model: null,
      diagnostics: {
        ...base,
        reason: 'incoherent-transitions',
        strongSamples: samples.length,
        robustSamples: robust.length,
        xCoverage,
        averageStrength,
        averageContextStrength,
      },
    };
  }

  const fit = fitBoundary(robust);
  const residual = robust.reduce((sum, sample) => sum + Math.abs(sample.y - boundaryAt(fit.centerY, fit.slope, sample.x)), 0) / robust.length;
  const detail = {
    ...base,
    strongSamples: samples.length,
    robustSamples: robust.length,
    xCoverage,
    averageStrength,
    averageContextStrength,
    residual: Number.isFinite(residual) ? residual : null,
    centerY: fit.centerY,
    slope: fit.slope,
  };
  if (!Number.isFinite(residual) || residual > 0.09) {
    return { model: null, diagnostics: { ...detail, reason: 'high-residual' } };
  }

  const coverage = robust.length / COLUMN_COUNT;
  const spatialCoverage = clamp((xCoverage - MIN_X_COVERAGE) / Math.max(0.01, 0.88 - MIN_X_COVERAGE), 0, 1);
  const strengthConfidence = clamp(((averageStrength ?? MIN_SAMPLE_STRENGTH) - MIN_SAMPLE_STRENGTH) / 28, 0, 1);
  const contextConfidence = clamp(((averageContextStrength ?? 0) - 2) / 45, 0, 1);
  const residualConfidence = clamp(1 - residual / 0.09, 0, 1);
  const confidence = clamp(
    0.22
      + coverage * 0.2
      + spatialCoverage * 0.12
      + strengthConfidence * 0.16
      + contextConfidence * 0.16
      + residualConfidence * 0.12,
    0.34,
    0.78,
  );

  return {
    model: {
      floorRegionStartY: clamp(fit.centerY, 0.44, 0.78),
      floorBoundarySlope: clamp(fit.slope, -0.22, 0.22),
      confidence,
      source: 'depth-profile',
    },
    diagnostics: { ...detail, reason: 'accepted' },
  };
}

export function estimateSupportModelFromDepth(estimate: DepthEstimate): PreparedSupportModel | null {
  return analyzeSupportModelFromDepth(estimate).model;
}

export function mergePreparedSupportModelsWithDiagnostics(anchor: PreparedSupportModel, depth: PreparedSupportModel | null): SupportMergeResult {
  if (!depth) return { model: anchor, decision: 'anchor-only-no-depth', disagreement: null };
  if (anchor.source === 'fallback') {
    return depth.confidence >= 0.4
      ? { model: depth, decision: 'depth-replaces-fallback', disagreement: Math.abs(anchor.floorRegionStartY - depth.floorRegionStartY) }
      : { model: anchor, decision: 'anchor-only-weak-depth', disagreement: Math.abs(anchor.floorRegionStartY - depth.floorRegionStartY) };
  }
  const disagreement = Math.abs(anchor.floorRegionStartY - depth.floorRegionStartY);
  if (depth.confidence < 0.4) return { model: anchor, decision: 'anchor-only-weak-depth', disagreement };
  if (disagreement > 0.16) {
    return depth.confidence > anchor.confidence + 0.1
      ? { model: depth, decision: 'depth-wins-disagreement', disagreement }
      : { model: anchor, decision: 'anchor-wins-disagreement', disagreement };
  }

  const anchorWeight = clamp(anchor.confidence, 0.2, 0.85);
  const depthWeight = clamp(depth.confidence, 0.2, 0.8);
  const total = anchorWeight + depthWeight;
  const agreementBonus = clamp((0.12 - disagreement) / 0.12, 0, 1) * 0.08;
  return {
    model: {
      floorRegionStartY: clamp((anchor.floorRegionStartY * anchorWeight + depth.floorRegionStartY * depthWeight) / total, 0.42, 0.8),
      floorBoundarySlope: clamp((anchor.floorBoundarySlope * anchorWeight + depth.floorBoundarySlope * depthWeight) / total, -0.22, 0.22),
      confidence: clamp(Math.max(anchor.confidence, depth.confidence) + agreementBonus, 0, 0.84),
      source: 'hybrid',
    },
    decision: 'hybrid-agreement',
    disagreement,
  };
}

export function mergePreparedSupportModels(anchor: PreparedSupportModel, depth: PreparedSupportModel | null): PreparedSupportModel {
  return mergePreparedSupportModelsWithDiagnostics(anchor, depth).model;
}

export function depthValueToNearness(value: number, direction: DepthNearDirection) {
  const normalized = clamp(value, 0, 1);
  if (direction === 'lower-is-nearer') return 1 - normalized;
  return normalized;
}

export function estimateDepthNearDirection(estimate: Pick<DepthEstimate, 'width' | 'height' | 'normalized'>) {
  if (!estimate.width || !estimate.height || estimate.normalized.length < estimate.width * estimate.height) {
    return { direction: 'unknown' as const, confidence: 0 };
  }
  const upper = meanBand(estimate.normalized, estimate.width, estimate.height, 0.18, 0.34);
  const lower = meanBand(estimate.normalized, estimate.width, estimate.height, 0.72, 0.9);
  const difference = lower - upper;
  const confidence = clamp(Math.abs(difference) / 70, 0, 1);
  if (confidence < 0.18) return { direction: 'unknown' as const, confidence };
  return { direction: difference > 0 ? 'higher-is-nearer' as const : 'lower-is-nearer' as const, confidence };
}

function strongestBoundaryAtX(
  values: Uint8ClampedArray,
  width: number,
  height: number,
  normalizedX: number,
  direction: DepthNearDirection,
): BoundarySample | null {
  const x = clamp(Math.round(normalizedX * (width - 1)), 0, width - 1);
  const yStart = clamp(Math.round(height * 0.36), 2, height - 3);
  const yEnd = clamp(Math.round(height * 0.84), yStart + 1, height - 3);
  const step = Math.max(1, Math.round(height / 220));
  const radiusX = Math.max(1, Math.round(width / 260));
  const localRadiusY = Math.max(2, Math.round(height / 140));
  const contextOffset = Math.max(localRadiusY + 2, Math.round(height * 0.055));
  const contextRadiusY = Math.max(2, Math.round(height * 0.022));

  let bestY = -1;
  let bestStrength = 0;
  let bestContextStrength = 0;
  for (let y = yStart; y <= yEnd; y += step) {
    const localAbove = meanWindow(values, width, height, x, y - localRadiusY, radiusX, Math.max(1, Math.floor(localRadiusY / 2)));
    const localBelow = meanWindow(values, width, height, x, y + localRadiusY, radiusX, Math.max(1, Math.floor(localRadiusY / 2)));
    const contextAbove = meanWindow(values, width, height, x, y - contextOffset, radiusX * 2, contextRadiusY);
    const contextBelow = meanWindow(values, width, height, x, y + contextOffset, radiusX * 2, contextRadiusY);

    const localStep = nearwardDifference(localAbove, localBelow, direction);
    const contextStep = nearwardDifference(contextAbove, contextBelow, direction);
    if (direction !== 'unknown' && (localStep <= 0 || contextStep <= 1.5)) continue;

    const localEvidence = direction === 'unknown' ? Math.abs(localBelow - localAbove) : localStep;
    const contextEvidence = direction === 'unknown' ? Math.abs(contextBelow - contextAbove) : contextStep;
    const normalizedY = y / height;
    const locationWeight = clamp(1 - Math.abs(normalizedY - 0.6) * 0.35, 0.82, 1);
    const strength = (localEvidence * 0.45 + contextEvidence * 0.75) * locationWeight;
    if (strength > bestStrength) {
      bestStrength = strength;
      bestContextStrength = contextEvidence;
      bestY = y;
    }
  }

  if (bestY < 0) return null;
  return { x: normalizedX, y: bestY / height, strength: bestStrength, contextStrength: bestContextStrength };
}

function nearwardDifference(above: number, below: number, direction: DepthNearDirection) {
  if (direction === 'higher-is-nearer') return below - above;
  if (direction === 'lower-is-nearer') return above - below;
  return Math.abs(below - above);
}

function meanBand(values: Uint8ClampedArray, width: number, height: number, startY: number, endY: number) {
  const y0 = clamp(Math.round(startY * (height - 1)), 0, height - 1);
  const y1 = clamp(Math.round(endY * (height - 1)), y0, height - 1);
  const x0 = clamp(Math.round(width * 0.08), 0, width - 1);
  const x1 = clamp(Math.round(width * 0.92), x0, width - 1);
  let sum = 0;
  let count = 0;
  const stepX = Math.max(1, Math.round(width / 90));
  const stepY = Math.max(1, Math.round(height / 90));
  for (let y = y0; y <= y1; y += stepY) {
    for (let x = x0; x <= x1; x += stepX) {
      sum += values[y * width + x] ?? 0;
      count += 1;
    }
  }
  return count ? sum / count : 0;
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
