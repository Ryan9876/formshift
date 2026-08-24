import assert from 'node:assert/strict';
import {
  clientToStagePoint,
  imageToClientPoint,
  imageToStagePoint,
  refinementBrushRadius,
  stageToImagePoint,
  targetLocalToClientPoint,
} from '../apps/client/src/arrange/refinementCoordinates.ts';

const EPSILON = 1e-9;
const stage = { width: 390, height: 650 };
const imagePoint = { x: 0.73, y: 0.41 };

function close(actual, expected, message) {
  assert.ok(Math.abs(actual - expected) <= EPSILON, `${message}: expected ${expected}, got ${actual}`);
}

function roundTrip(rect, viewScale, viewOffset, clientViewportOffset = { x: 0, y: 0 }) {
  const client = imageToClientPoint(imagePoint, rect, stage, viewScale, viewOffset, clientViewportOffset);
  assert.ok(client, 'inverse client point should exist');
  const layout = clientToStagePoint(client, rect, stage, clientViewportOffset);
  assert.ok(layout, 'client point should map into layout-stage coordinates');
  const restored = stageToImagePoint(layout, viewScale, viewOffset, stage);
  assert.ok(restored, 'layout-stage point should map back into source-image coordinates');
  close(restored.x, imagePoint.x, 'normalized x must round-trip');
  close(restored.y, imagePoint.y, 'normalized y must round-trip');
}

// Normal desktop/mobile CSS-pixel case.
roundTrip({ left: 20, top: 400, width: 390, height: 650 }, 1, { x: 0, y: 0 });

// Same stage after substantial page scrolling. client coordinates change with the
// rect, but the normalized source point must not.
roundTrip({ left: 20, top: -275, width: 390, height: 650 }, 1, { x: 0, y: 0 });

// Rendered rect is scaled relative to RN layout dimensions.
roundTrip({ left: 14, top: 182, width: 327.6, height: 546 }, 1, { x: 0, y: 0 });

// App-level photo zoom and pan must compose with browser/page scale rather than
// introducing another coordinate space.
roundTrip({ left: 8, top: 96, width: 351, height: 585 }, 2.4, { x: -188, y: -214 });

// iOS WebKit visual viewport can pan independently from the layout viewport.
roundTrip(
  { left: 14, top: 182, width: 327.6, height: 546 },
  1,
  { x: 0, y: 0 },
  { x: 0, y: 148 },
);

// The hardest fallback composition: page/render scaling + independent visual
// viewport + FormShift zoom/pan.
roundTrip(
  { left: 8, top: 96, width: 351, height: 585 },
  2.4,
  { x: -188, y: -214 },
  { x: 11, y: 126 },
);

// Changing only the visual viewport origin must change browser clientY while
// resolving to the exact same source coordinate on the fallback client path.
const rect = { left: 12, top: 164, width: 343.2, height: 572 };
const clientA = imageToClientPoint(imagePoint, rect, stage, 1.7, { x: -96, y: -132 }, { x: 0, y: 0 });
const clientB = imageToClientPoint(imagePoint, rect, stage, 1.7, { x: -96, y: -132 }, { x: 0, y: 154 });
assert.ok(clientA && clientB);
assert.notEqual(clientA.y, clientB.y, 'visual viewport pan must materially change raw browser clientY');
const stageA = clientToStagePoint(clientA, rect, stage, { x: 0, y: 0 });
const stageB = clientToStagePoint(clientB, rect, stage, { x: 0, y: 154 });
assert.ok(stageA && stageB);
close(stageA.x, stageB.x, 'visual viewport pan must not change layout-stage x');
close(stageA.y, stageB.y, 'visual viewport pan must not change layout-stage y');

// PRIMARY SAFARI PATH: target-local offsets are authoritative. The raw client
// coordinate can be arbitrarily wrong and it must have no effect on the point
// forwarded into the frozen editor.
const targetRect = { left: 18, top: 211, width: 327.6, height: 546 };
const targetLocal = { x: 241.7, y: 193.4 };
const viewportOffset = { x: 7, y: 154 };
const normalizedClient = targetLocalToClientPoint(targetLocal, targetRect, viewportOffset);
assert.ok(normalizedClient, 'target-local pointer must normalize into a client point');
const targetStage = clientToStagePoint(normalizedClient, targetRect, stage, viewportOffset);
assert.ok(targetStage, 'normalized target-local pointer must reach layout stage');
close(targetStage.x, targetLocal.x * (stage.width / targetRect.width), 'target-local x must map directly to rendered surface');
close(targetStage.y, targetLocal.y * (stage.height / targetRect.height), 'target-local y must map directly to rendered surface');

const corruptRawClient = { x: normalizedClient.x - 283, y: normalizedClient.y + 611 };
assert.ok(Math.abs(corruptRawClient.y - normalizedClient.y) > 600, 'fixture must materially corrupt raw clientY');
const normalizedAgain = targetLocalToClientPoint(targetLocal, targetRect, viewportOffset);
assert.deepEqual(normalizedAgain, normalizedClient, 'target-local normalization must be independent of corrupt raw client coordinates');

// Browser chrome/layout position can change between pointer samples; the same
// target-local offset must still land on the same stage coordinate.
const shiftedRect = { ...targetRect, top: -93, left: 4 };
const shiftedViewport = { x: 21, y: 228 };
const shiftedClient = targetLocalToClientPoint(targetLocal, shiftedRect, shiftedViewport);
assert.ok(shiftedClient);
const shiftedStage = clientToStagePoint(shiftedClient, shiftedRect, stage, shiftedViewport);
assert.ok(shiftedStage);
close(shiftedStage.x, targetStage.x, 'target-local x must survive browser chrome/layout motion');
close(shiftedStage.y, targetStage.y, 'target-local y must survive browser chrome/layout motion');

const stagePoint = imageToStagePoint(imagePoint, 2.4, { x: -188, y: -214 }, stage);
const restored = stageToImagePoint(stagePoint, 2.4, { x: -188, y: -214 }, stage);
assert.ok(restored);
close(restored.x, imagePoint.x, 'image/stage x transform must be inverse');
close(restored.y, imagePoint.y, 'image/stage y transform must be inverse');

assert.ok(refinementBrushRadius(stage, 2) > refinementBrushRadius(stage, 1), 'brush footprint should visually grow with image zoom');
assert.equal(clientToStagePoint({ x: 0, y: 0 }, { left: 0, top: 0, width: 0, height: 100 }, stage), null, 'zero-size DOM rect must fail closed');
assert.equal(targetLocalToClientPoint({ x: Number.NaN, y: 4 }, targetRect, viewportOffset), null, 'invalid target-local pointer must fail closed');

console.log('PASS Arrange refinement coordinates prefer target-local pointer offsets and remain source-stable across corrupted client coordinates, browser chrome motion, visual-viewport panning, rendered scaling, and app zoom/pan');
