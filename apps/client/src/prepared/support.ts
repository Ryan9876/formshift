import type { ObjectDetectionCandidate, PreparedBox, PreparedObjectMobility, PreparedSceneObject, PreparedSupportKind } from './types';

export type PreparedSupportModel = {
  /** Floor/wall transition at normalized image x=0.5. */
  floorRegionStartY: number;
  /** Change in normalized transition y from image left to right. */
  floorBoundarySlope: number;
  confidence: number;
  source: 'detector-anchors' | 'object-anchors' | 'fallback';
};

export const DEFAULT_PREPARED_SUPPORT_MODEL: PreparedSupportModel = {
  floorRegionStartY: 0.56,
  floorBoundarySlope: 0,
  confidence: 0.25,
  source: 'fallback',
};

const FIXED_LABELS = new Set(['toilet', 'sink', 'oven']);
const SURFACE_LABELS = new Set(['dining table']);
const FLOOR_LABELS = new Set(['chair', 'couch', 'bed', 'suitcase', 'potted plant', 'refrigerator']);
const WALL_LABELS = new Set(['tv', 'clock']);

export function classifyPreparedLabel(label: string): { mobility: PreparedObjectMobility; support: PreparedSupportKind } {
  if (FIXED_LABELS.has(label)) return { mobility: 'fixed', support: 'unknown' };
  if (FLOOR_LABELS.has(label)) return { mobility: label === 'refrigerator' ? 'conditional' : 'movable', support: 'floor' };
  if (SURFACE_LABELS.has(label)) return { mobility: 'movable', support: 'floor' };
  if (WALL_LABELS.has(label)) return { mobility: 'conditional', support: 'wall' };
  return { mobility: 'movable', support: 'surface' };
}

export function isFixedPreparedLabel(label: string) {
  return FIXED_LABELS.has(label);
}

type SupportAnchor = { x: number; y: number };

export function estimateSupportModel(candidates: ObjectDetectionCandidate[], imageWidth: number, imageHeight: number): PreparedSupportModel {
  const anchors = candidates
    .filter((candidate) => candidate.score >= 0.45 && classifyPreparedLabel(candidate.label).support === 'floor')
    .map((candidate): SupportAnchor => ({
      x: clamp(((candidate.box.xmin + candidate.box.xmax) / 2) / Math.max(1, imageWidth), 0, 1),
      y: clamp(candidate.box.ymax / Math.max(1, imageHeight), 0, 1),
    }))
    .filter((anchor) => anchor.y >= 0.35 && anchor.y <= 0.98);

  return modelFromAnchors(anchors, 'detector-anchors');
}

export function estimateSupportModelFromObjects(objects: PreparedSceneObject[]): PreparedSupportModel {
  const anchors = objects
    .filter((object) => object.expectedSupport === 'floor')
    .map((object): SupportAnchor => ({
      x: clamp(object.bbox.x + object.bbox.width / 2, 0, 1),
      y: clamp(object.bbox.y + object.bbox.height, 0, 1),
    }))
    .filter((anchor) => anchor.y >= 0.35 && anchor.y <= 0.98);
  return modelFromAnchors(anchors, 'object-anchors');
}

function modelFromAnchors(anchors: SupportAnchor[], source: 'detector-anchors' | 'object-anchors'): PreparedSupportModel {
  if (!anchors.length) return DEFAULT_PREPARED_SUPPORT_MODEL;
  const ys = anchors.map((anchor) => anchor.y).sort((a, b) => a - b);
  const median = ys[Math.floor(ys.length / 2)] ?? 0.62;
  const slope = fitBoundarySlope(anchors);
  const centerBoundary = clamp(median - 0.06, 0.46, 0.72);
  const xSpread = anchors.length > 1 ? Math.max(...anchors.map((anchor) => anchor.x)) - Math.min(...anchors.map((anchor) => anchor.x)) : 0;
  const hasPerspectiveEvidence = anchors.length >= 2 && xSpread >= 0.16;
  return {
    floorRegionStartY: centerBoundary,
    floorBoundarySlope: hasPerspectiveEvidence ? slope : 0,
    confidence: source === 'detector-anchors'
      ? anchors.length >= 2 ? (hasPerspectiveEvidence ? 0.74 : 0.68) : 0.52
      : anchors.length >= 2 ? (hasPerspectiveEvidence ? 0.68 : 0.62) : 0.48,
    source,
  };
}

function fitBoundarySlope(anchors: SupportAnchor[]) {
  if (anchors.length < 2) return 0;
  const meanX = anchors.reduce((sum, anchor) => sum + anchor.x, 0) / anchors.length;
  const meanY = anchors.reduce((sum, anchor) => sum + anchor.y, 0) / anchors.length;
  let numerator = 0;
  let denominator = 0;
  for (const anchor of anchors) {
    const dx = anchor.x - meanX;
    numerator += dx * (anchor.y - meanY);
    denominator += dx * dx;
  }
  if (denominator < 0.005) return 0;
  return clamp(numerator / denominator, -0.22, 0.22);
}

export function floorBoundaryAtX(model: PreparedSupportModel, x: number) {
  return clamp(model.floorRegionStartY + model.floorBoundarySlope * (clamp(x, 0, 1) - 0.5), 0.38, 0.84);
}

export function parsePreparedSupportModel(value: unknown): PreparedSupportModel | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  const floorRegionStartY = typeof record.floorRegionStartY === 'number' ? record.floorRegionStartY : NaN;
  const floorBoundarySlope = typeof record.floorBoundarySlope === 'number' ? record.floorBoundarySlope : 0;
  const confidence = typeof record.confidence === 'number' ? record.confidence : NaN;
  const source = record.source;
  if (!Number.isFinite(floorRegionStartY) || floorRegionStartY < 0.35 || floorRegionStartY > 0.85) return null;
  if (!Number.isFinite(floorBoundarySlope) || Math.abs(floorBoundarySlope) > 0.3) return null;
  if (!Number.isFinite(confidence)) return null;
  if (source !== 'detector-anchors' && source !== 'object-anchors' && source !== 'fallback') return null;
  return {
    floorRegionStartY,
    floorBoundarySlope,
    confidence: clamp(confidence, 0, 1),
    source,
  };
}

export function isPersonOccludedCandidate(candidate: ObjectDetectionCandidate, allCandidates: ObjectDetectionCandidate[]) {
  if (candidate.label === 'person') return false;
  const area = boxArea(candidate.box);
  if (area <= 0) return false;
  return allCandidates.some((person) => {
    if (person.label !== 'person' || person.score < 0.45) return false;
    const intersection = intersectionArea(candidate.box, person.box);
    if (intersection <= 0) return false;
    const personArea = boxArea(person.box);
    const candidateOverlap = intersection / area;
    const personOverlap = intersection / Math.max(1, personArea);
    const personCenter = { x: (person.box.xmin + person.box.xmax) / 2, y: (person.box.ymin + person.box.ymax) / 2 };
    const candidateCenter = { x: (candidate.box.xmin + candidate.box.xmax) / 2, y: (candidate.box.ymin + candidate.box.ymax) / 2 };
    return candidateOverlap >= 0.06
      || personOverlap >= 0.16
      || pointInPixelBox(personCenter, candidate.box)
      || pointInPixelBox(candidateCenter, person.box);
  });
}

export function maskMatchesDetection(maskBox: PreparedBox, candidate: ObjectDetectionCandidate, imageWidth: number, imageHeight: number) {
  const detectorBox: PreparedBox = {
    x: candidate.box.xmin / Math.max(1, imageWidth),
    y: candidate.box.ymin / Math.max(1, imageHeight),
    width: Math.max(0, candidate.box.xmax - candidate.box.xmin) / Math.max(1, imageWidth),
    height: Math.max(0, candidate.box.ymax - candidate.box.ymin) / Math.max(1, imageHeight),
  };
  const maskArea = normalizedArea(maskBox);
  const detectorArea = normalizedArea(detectorBox);
  if (maskArea <= 0 || detectorArea <= 0) return false;
  const overlap = normalizedIntersection(maskBox, detectorBox);
  const overlapOfSmaller = overlap / Math.max(0.000001, Math.min(maskArea, detectorArea));
  const detectorCoverage = overlap / Math.max(0.000001, detectorArea);
  const maskOutsideFraction = 1 - overlap / Math.max(0.000001, maskArea);
  const ratio = maskArea / detectorArea;
  const detectorExpanded = expandNormalizedBox(detectorBox, 0.25);
  const maskCenter = { x: maskBox.x + maskBox.width / 2, y: maskBox.y + maskBox.height / 2 };
  return overlapOfSmaller >= 0.3
    && detectorCoverage >= 0.18
    && maskOutsideFraction <= 0.68
    && ratio >= 0.2
    && ratio <= 2.6
    && pointInNormalizedBox(maskCenter, detectorExpanded);
}

export function constrainPreparedPosition(object: PreparedSceneObject, desired: { x: number; y: number }, model: PreparedSupportModel, enabled: boolean) {
  const halfWidth = Math.max(0.005, object.bbox.width * object.scale / 2);
  const halfHeight = Math.max(0.005, object.bbox.height * object.scale / 2);
  const x = clamp(desired.x, Math.min(0.49, halfWidth + 0.01), Math.max(0.51, 0.99 - halfWidth));
  const freeY = clamp(desired.y, Math.min(0.49, halfHeight + 0.01), Math.max(0.51, 0.99 - halfHeight));
  if (!enabled) return { x, y: freeY };

  const boundaryY = floorBoundaryAtX(model, x);
  if (object.expectedSupport === 'floor') {
    const minCenterY = clamp(boundaryY - halfHeight, halfHeight + 0.01, 0.94);
    return { x, y: clamp(freeY, minCenterY, Math.max(minCenterY, 0.99 - halfHeight)) };
  }
  if (object.expectedSupport === 'wall') {
    const maxCenterY = clamp(boundaryY + 0.03 - halfHeight, halfHeight + 0.01, 0.94);
    return { x, y: clamp(freeY, halfHeight + 0.01, maxCenterY) };
  }
  return { x, y: freeY };
}

export function constrainPreparedObjects(objects: PreparedSceneObject[], model: PreparedSupportModel, enabled: boolean) {
  return objects.map((object) => ({ ...object, position: constrainPreparedPosition(object, object.position, model, enabled) }));
}

export function positionsDiffer(a: PreparedSceneObject[], b: PreparedSceneObject[]) {
  if (a.length !== b.length) return true;
  return a.some((object, index) => {
    const other = b[index];
    if (!other || other.id !== object.id) return true;
    return Math.abs(other.position.x - object.position.x) > 0.0001 || Math.abs(other.position.y - object.position.y) > 0.0001;
  });
}

export function projectedPreparedDepth(object: PreparedSceneObject) {
  const sourceCenterY = object.bbox.y + object.bbox.height / 2;
  const motionDepthOffset = clamp((object.position.y - sourceCenterY) * 0.55, -0.22, 0.22);
  const sourceDepth = typeof object.approximateDepth === 'number' && Number.isFinite(object.approximateDepth)
    ? object.approximateDepth
    : clamp(sourceCenterY, 0, 1);
  return clamp(sourceDepth + motionDepthOffset, 0, 1);
}

export function comparePreparedDepth(a: PreparedSceneObject, b: PreparedSceneObject) {
  const delta = projectedPreparedDepth(a) - projectedPreparedDepth(b);
  if (Math.abs(delta) >= 0.002) return delta;
  return a.position.y - b.position.y;
}

function boxArea(box: ObjectDetectionCandidate['box']) { return Math.max(0, box.xmax - box.xmin) * Math.max(0, box.ymax - box.ymin); }
function intersectionArea(a: ObjectDetectionCandidate['box'], b: ObjectDetectionCandidate['box']) {
  const x0 = Math.max(a.xmin, b.xmin); const y0 = Math.max(a.ymin, b.ymin);
  const x1 = Math.min(a.xmax, b.xmax); const y1 = Math.min(a.ymax, b.ymax);
  return Math.max(0, x1 - x0) * Math.max(0, y1 - y0);
}
function pointInPixelBox(point: { x: number; y: number }, box: ObjectDetectionCandidate['box']) { return point.x >= box.xmin && point.x <= box.xmax && point.y >= box.ymin && point.y <= box.ymax; }
function normalizedArea(box: PreparedBox) { return Math.max(0, box.width) * Math.max(0, box.height); }
function normalizedIntersection(a: PreparedBox, b: PreparedBox) {
  const x0 = Math.max(a.x, b.x); const y0 = Math.max(a.y, b.y);
  const x1 = Math.min(a.x + a.width, b.x + b.width); const y1 = Math.min(a.y + a.height, b.y + b.height);
  return Math.max(0, x1 - x0) * Math.max(0, y1 - y0);
}
function expandNormalizedBox(box: PreparedBox, fraction: number): PreparedBox {
  const padX = box.width * fraction; const padY = box.height * fraction;
  const x = clamp(box.x - padX, 0, 1); const y = clamp(box.y - padY, 0, 1);
  const x1 = clamp(box.x + box.width + padX, 0, 1); const y1 = clamp(box.y + box.height + padY, 0, 1);
  return { x, y, width: Math.max(0, x1 - x), height: Math.max(0, y1 - y) };
}
function pointInNormalizedBox(point: { x: number; y: number }, box: PreparedBox) { return point.x >= box.x && point.x <= box.x + box.width && point.y >= box.y && point.y <= box.y + box.height; }
function clamp(value: number, min: number, max: number) { return Math.max(min, Math.min(max, value)); }
