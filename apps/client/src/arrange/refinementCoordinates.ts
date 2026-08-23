export type ArrangePoint = { x: number; y: number };
export type ArrangeStageSize = { width: number; height: number };
export type ArrangeRect = { left: number; top: number; width: number; height: number };

/**
 * Convert browser client coordinates into the editor's layout-stage coordinate
 * space. getBoundingClientRect() reports rendered CSS pixels while React Native
 * onLayout reports layout pixels; those spaces can diverge under browser/page
 * scaling. Keeping the conversion explicit prevents refinement strokes from
 * drifting relative to the source image on iOS Safari.
 */
export function clientToStagePoint(
  client: ArrangePoint,
  rect: ArrangeRect,
  stage: ArrangeStageSize,
): ArrangePoint | null {
  if (!isPositive(rect.width) || !isPositive(rect.height) || !isPositive(stage.width) || !isPositive(stage.height)) return null;
  return {
    x: (client.x - rect.left) * (stage.width / rect.width),
    y: (client.y - rect.top) * (stage.height / rect.height),
  };
}

/** Convert layout-stage coordinates to normalized source-image coordinates. */
export function stageToImagePoint(
  point: ArrangePoint,
  viewScale: number,
  viewOffset: ArrangePoint,
  stage: ArrangeStageSize,
): ArrangePoint | null {
  if (!isPositive(stage.width) || !isPositive(stage.height)) return null;
  const scale = Math.max(viewScale, 0.001);
  const x = (point.x - viewOffset.x) / scale;
  const y = (point.y - viewOffset.y) / scale;
  if (x < 0 || y < 0 || x > stage.width || y > stage.height) return null;
  return {
    x: clamp(x / stage.width, 0, 1),
    y: clamp(y / stage.height, 0, 1),
  };
}

/** Convert normalized source-image coordinates back into layout-stage pixels. */
export function imageToStagePoint(
  image: ArrangePoint,
  viewScale: number,
  viewOffset: ArrangePoint,
  stage: ArrangeStageSize,
): ArrangePoint {
  return {
    x: viewOffset.x + image.x * stage.width * viewScale,
    y: viewOffset.y + image.y * stage.height * viewScale,
  };
}

/** Test/diagnostic inverse used to prove scroll/render-scale invariance. */
export function imageToClientPoint(
  image: ArrangePoint,
  rect: ArrangeRect,
  stage: ArrangeStageSize,
  viewScale: number,
  viewOffset: ArrangePoint,
): ArrangePoint | null {
  if (!isPositive(rect.width) || !isPositive(rect.height) || !isPositive(stage.width) || !isPositive(stage.height)) return null;
  const point = imageToStagePoint(image, viewScale, viewOffset, stage);
  return {
    x: rect.left + point.x * (rect.width / stage.width),
    y: rect.top + point.y * (rect.height / stage.height),
  };
}

export function refinementBrushRadius(stage: ArrangeStageSize, viewScale: number) {
  return Math.max(6, Math.min(stage.width, stage.height) * 0.012 * Math.max(viewScale, 1));
}

function isPositive(value: number) {
  return Number.isFinite(value) && value > 0;
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}
