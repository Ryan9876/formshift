import { constrainPreparedPosition, floorBoundaryAtX, type PreparedSupportModel } from './support.ts';
import type { PreparedSceneObject } from './types.ts';

export type PreparedPlacementStatus = 'plausible' | 'questionable' | 'unsupported' | 'unknown';

export type PreparedPlacementAssessment = {
  status: PreparedPlacementStatus;
  expectedSupport: PreparedSceneObject['expectedSupport'];
  boundaryY: number | null;
  violation: number | null;
  confidence: number;
  reason: string;
  correctedPosition: { x: number; y: number };
};

const PLAUSIBLE_TOLERANCE = 0.015;
const QUESTIONABLE_TOLERANCE = 0.06;
const MIN_USABLE_SUPPORT_CONFIDENCE = 0.4;

/**
 * Classifies a Prepared Scene placement without mutating the object or promoting
 * estimated image-space evidence into canonical geometry. The assessment is
 * intentionally conservative and becomes `unknown` when the support model is
 * only fallback/low-confidence evidence or when the object's support class does
 * not map to the current floor/wall model.
 */
export function assessPreparedPlacement(
  object: PreparedSceneObject,
  model: PreparedSupportModel,
): PreparedPlacementAssessment {
  const correctedPosition = constrainPreparedPosition(object, object.position, model, true);
  const confidence = clamp(model.confidence, 0, 1);

  if (model.source === 'fallback' || confidence < MIN_USABLE_SUPPORT_CONFIDENCE) {
    return {
      status: 'unknown',
      expectedSupport: object.expectedSupport,
      boundaryY: null,
      violation: null,
      confidence,
      reason: 'Support evidence is too weak to judge this placement.',
      correctedPosition,
    };
  }

  if (object.expectedSupport !== 'floor' && object.expectedSupport !== 'wall') {
    return {
      status: 'unknown',
      expectedSupport: object.expectedSupport,
      boundaryY: null,
      violation: null,
      confidence,
      reason: `No validated ${object.expectedSupport} support surface is represented by the current model.`,
      correctedPosition,
    };
  }

  const boundaryY = floorBoundaryAtX(model, object.position.x);
  const halfHeight = Math.max(0.005, object.bbox.height * object.scale / 2);
  const bottomY = object.position.y + halfHeight;
  const violation = object.expectedSupport === 'floor'
    ? Math.max(0, boundaryY - bottomY)
    : Math.max(0, bottomY - (boundaryY + 0.03));

  if (violation <= PLAUSIBLE_TOLERANCE) {
    return {
      status: 'plausible',
      expectedSupport: object.expectedSupport,
      boundaryY,
      violation,
      confidence,
      reason: object.expectedSupport === 'floor'
        ? 'The object reaches the estimated floor-support region.'
        : 'The object remains above the estimated floor/wall transition.',
      correctedPosition,
    };
  }

  if (violation <= QUESTIONABLE_TOLERANCE) {
    return {
      status: 'questionable',
      expectedSupport: object.expectedSupport,
      boundaryY,
      violation,
      confidence,
      reason: object.expectedSupport === 'floor'
        ? 'The object appears slightly above its estimated floor-support region.'
        : 'The wall-supported object extends slightly into the estimated floor region.',
      correctedPosition,
    };
  }

  return {
    status: 'unsupported',
    expectedSupport: object.expectedSupport,
    boundaryY,
    violation,
    confidence,
    reason: object.expectedSupport === 'floor'
      ? 'The floor-supported object is materially separated from the estimated floor region.'
      : 'The wall-supported object is materially inside the estimated floor region.',
    correctedPosition,
  };
}

export function placementAssessmentLabel(assessment: PreparedPlacementAssessment) {
  switch (assessment.status) {
    case 'plausible': return 'Estimated support looks plausible';
    case 'questionable': return 'Estimated support is questionable';
    case 'unsupported': return 'Placement conflicts with estimated support';
    case 'unknown': return 'Support cannot be judged yet';
  }
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}
