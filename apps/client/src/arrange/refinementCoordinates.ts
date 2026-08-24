export type ArrangePoint = { x: number; y: number };
export type ArrangeStageSize = { width: number; height: number };
export type ArrangeRect = { left: number; top: number; width: number; height: number };
export type ArrangeViewportOffset = { x: number; y: number };

const ZERO_OFFSET: ArrangeViewportOffset = { x: 0, y: 0 };

/**
 * Convert browser client coordinates into the editor's layout-stage coordinate
 * space. On iOS WebKit, PointerEvent clientX/clientY can be visual-viewport
 * relative while getBoundingClientRect() remains layout-viewport relative when
 * the browser chrome or pinch-zoom pans the visual viewport. We compensate that
 * visual offset before applying rendered-rect/layout-stage scaling.
 *
 * This is now a fallback path. The canonical Safari adapter prefers target-local
 * pointer offsets, which avoid viewport-origin ambiguity entirely.
 */
export function clientToStagePoint(
  client: ArrangePoint,
  rect: ArrangeRect,
  stage: ArrangeStageSize,
  viewportOffset: ArrangeViewportOffset = currentClientViewportOffset(),
): ArrangePoint | null {
  if (!isPositive(rect.width) || !isPositive(rect.height) || !isPositive(stage.width) || !isPositive(stage.height)) return null;
  const offset = finiteOffset(viewportOffset);
  const layoutClientX = client.x + offset.x;
  const layoutClientY = client.y + offset.y;
  return {
    x: (layoutClientX - rect.left) * (stage.width / rect.width),
    y: (layoutClientY - rect.top) * (stage.height / rect.height),
  };
}

/**
 * Convert a PointerEvent target-local offset into a synthetic client point that
 * the existing frozen editor can consume. The target-local offset is the source
 * of truth; client/page/visual-viewport origins are intentionally discarded.
 *
 * Passing this result through clientToStagePoint with the same viewport offset
 * is algebraically equivalent to mapping target-local pixels directly into the
 * rendered surface. This lets the canonical Safari adapter normalize events
 * without changing the validated editor state machine.
 */
export function targetLocalToClientPoint(
  local: ArrangePoint,
  rect: ArrangeRect,
  viewportOffset: ArrangeViewportOffset = currentClientViewportOffset(),
): ArrangePoint | null {
  if (!isPositive(rect.width) || !isPositive(rect.height)) return null;
  if (!Number.isFinite(local.x) || !Number.isFinite(local.y)) return null;
  const offset = finiteOffset(viewportOffset);
  return {
    x: rect.left + local.x - offset.x,
    y: rect.top + local.y - offset.y,
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

/** Test/diagnostic inverse used to prove scroll/render/visual-viewport invariance. */
export function imageToClientPoint(
  image: ArrangePoint,
  rect: ArrangeRect,
  stage: ArrangeStageSize,
  viewScale: number,
  viewOffset: ArrangePoint,
  viewportOffset: ArrangeViewportOffset = currentClientViewportOffset(),
): ArrangePoint | null {
  if (!isPositive(rect.width) || !isPositive(rect.height) || !isPositive(stage.width) || !isPositive(stage.height)) return null;
  const point = imageToStagePoint(image, viewScale, viewOffset, stage);
  const offset = finiteOffset(viewportOffset);
  return {
    x: rect.left + point.x * (rect.width / stage.width) - offset.x,
    y: rect.top + point.y * (rect.height / stage.height) - offset.y,
  };
}

/**
 * Mobile Safari/WebKit keeps a visual viewport that can move independently of
 * the layout viewport as browser chrome collapses/expands or the user
 * pinch-zooms. Other engines generally keep client rects and client pointer
 * coordinates in the same effective space, so compensation is intentionally
 * limited to iOS/iPadOS WebKit.
 */
export function currentClientViewportOffset(): ArrangeViewportOffset {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return ZERO_OFFSET;
  const ua = navigator.userAgent ?? '';
  const platform = navigator.platform ?? '';
  const maxTouchPoints = navigator.maxTouchPoints ?? 0;
  const isIOSFamily = /iP(?:ad|hone|od)/i.test(ua) || (platform === 'MacIntel' && maxTouchPoints > 1);
  const isWebKit = /AppleWebKit/i.test(ua);
  if (!isIOSFamily || !isWebKit || !window.visualViewport) return ZERO_OFFSET;
  return finiteOffset({
    x: window.visualViewport.offsetLeft,
    y: window.visualViewport.offsetTop,
  });
}

export function refinementBrushRadius(stage: ArrangeStageSize, viewScale: number) {
  return Math.max(6, Math.min(stage.width, stage.height) * 0.012 * Math.max(viewScale, 1));
}

function finiteOffset(offset: ArrangeViewportOffset): ArrangeViewportOffset {
  return {
    x: Number.isFinite(offset.x) ? offset.x : 0,
    y: Number.isFinite(offset.y) ? offset.y : 0,
  };
}

function isPositive(value: number) {
  return Number.isFinite(value) && value > 0;
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}
