import type { ObjectDetectionCandidate, PreparedBox, PreparedObjectMobility, PreparedSceneObject, PreparedSupportKind } from './types';

export type PreparedSupportModel = {
  floorRegionStartY: number;
  confidence: number;
  source: 'detector-anchors' | 'object-anchors' | 'fallback';
};

export const DEFAULT_PREPARED_SUPPORT_MODEL: PreparedSupportModel = {
  floorRegionStartY: 0.56,
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

export function estimateSupportModel(candidates: ObjectDetectionCandidate[], imageWidth: number, imageHeight: number): PreparedSupportModel {
  const anchors = candidates
    .filter((candidate) => candidate.score >= 0.45 && classifyPreparedLabel(candidate.label).support === 'floor')
    .map((candidate) => clamp(candidate.box.ymax / Math.max(1, imageHeight), 0, 1))
    .filter((value) => value >= 0.35 && value <= 0.98)
    .sort((a, b) => a - b);

  if (!anchors.length) return DEFAULT_PREPARED_SUPPORT_MODEL;
  const median = anchors[Math.floor(anchors.length / 2)] ?? 0.62;
  return {
    floorRegionStartY: clamp(median - 0.06, 0.46, 0.72),
    confidence: anchors.length >= 2 ? 0.68 : 0.52,
    source: 'detector-anchors',
  };
}

export function estimateSupportModelFromObjects(objects: PreparedSceneObject[]): PreparedSupportModel {
  const anchors = objects
    .filter((object) => object.expectedSupport === 'floor')
    .map((object) => object.bbox.y + object.bbox.height)
    .filter((value) => value >= 0.35 && value <= 0.98)
    .sort((a, b) => a - b);
  if (!anchors.length) return DEFAULT_PREPARED_SUPPORT_MODEL;
  const median = anchors[Math.floor(anchors.length / 2)] ?? 0.62;
  return {
    floorRegionStartY: clamp(median - 0.06, 0.46, 0.72),
    confidence: anchors.length >= 2 ? 0.62 : 0.48,
    source: 'object-anchors',
  };
}

export function parsePreparedSupportModel(value: unknown): PreparedSupportModel | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  const floorRegionStartY = typeof record.floorRegionStartY === 'number' ? record.floorRegionStartY : NaN;
  const confidence = typeof record.confidence === 'number' ? record.confidence : NaN;
  const source = record.source;
  if (!Number.isFinite(floorRegionStartY) || floorRegionStartY < 0.35 || floorRegionStartY > 0.85) return null;
  if (!Number.isFinite(confidence)) return null;
  if (source !== 'detector-anchors' && source !== 'object-anchors' && source !== 'fallback') return null;
  return { floorRegionStartY, confidence: clamp(confidence, 0, 1), source };
}

export function isPersonOccludedCandidate(candidate: ObjectDetectionCandidate, allCandidates: ObjectDetectionCandidate[]) {
  if (candidate.label === 'person') return false;
  const area = boxArea(candidate.box);
  if (area <= 0) return false;
  return allCandidates.some((person) => {
    if (person.label !== 'person' || person.score < 0.45) return false;
    const intersection = intersectionArea(candidate.box, person.box);
    if (intersection <= 0) return false;
    const candidateOverlap = intersection / area;
    const personCenter = { x: (person.box.xmin + person.box.xmax) / 2, y: (person.box.ymin + person.box.ymax) / 2 };
    return candidateOverlap >= 0.1 || pointInPixelBox(personCenter, candidate.box);
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
  const ratio = maskArea / detectorArea;
  const detectorExpanded = expandNormalizedBox(detectorBox, 0.35);
  const maskCenter = { x: maskBox.x + maskBox.width / 2, y: maskBox.y + maskBox.height / 2 };
  return overlapOfSmaller >= 0.22 && ratio >= 0.18 && ratio <= 3.4 && pointInNormalizedBox(maskCenter, detectorExpanded);
}

export function constrainPreparedPosition(object: PreparedSceneObject, desired: { x: number; y: number }, model: PreparedSupportModel, enabled: boolean) {
  const halfWidth = Math.max(0.005, object.bbox.width * object.scale / 2);
  const halfHeight = Math.max(0.005, object.bbox.height * object.scale / 2);
  const x = clamp(desired.x, Math.min(0.49, halfWidth + 0.01), Math.max(0.51, 0.99 - halfWidth));
  const freeY = clamp(desired.y, Math.min(0.49, halfHeight + 0.01), Math.max(0.51, 0.99 - halfHeight));
  if (!enabled) return { x, y: freeY };

  if (object.expectedSupport === 'floor') {
    const minCenterY = clamp(model.floorRegionStartY - halfHeight, halfHeight + 0.01, 0.94);
    return { x, y: clamp(freeY, minCenterY, Math.max(minCenterY, 0.99 - halfHeight)) };
  }
  if (object.expectedSupport === 'wall') {
    const maxCenterY = clamp(model.floorRegionStartY + 0.03 - halfHeight, halfHeight + 0.01, 0.94);
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

export function comparePreparedDepth(a: PreparedSceneObject, b: PreparedSceneObject) {
  const aDepth = a.approximateDepth;
  const bDepth = b.approximateDepth;
  if (typeof aDepth === 'number' && typeof bDepth === 'number' && Number.isFinite(aDepth) && Number.isFinite(bDepth)) {
    const delta = aDepth - bDepth;
    if (Math.abs(delta) >= 0.002) return delta;
  }
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
