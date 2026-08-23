import assert from 'node:assert/strict';
import {
  clientToStagePoint,
  imageToClientPoint,
  imageToStagePoint,
  refinementBrushRadius,
  stageToImagePoint,
} from '../apps/client/src/arrange/refinementCoordinates.ts';

const EPSILON = 1e-9;
const stage = { width: 390, height: 650 };
const imagePoint = { x: 0.73, y: 0.41 };

function close(actual, expected, message) {
  assert.ok(Math.abs(actual - expected) <= EPSILON, `${message}: expected ${expected}, got ${actual}`);
}

function roundTrip(rect, viewScale, viewOffset) {
  const client = imageToClientPoint(imagePoint, rect, stage, viewScale, viewOffset);
  assert.ok(client, 'inverse client point should exist');
  const layout = clientToStagePoint(client, rect, stage);
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

// Rendered rect is scaled relative to RN layout dimensions. This is the exact
// mixed-space failure the iPhone screenshot exposed.
roundTrip({ left: 14, top: 182, width: 327.6, height: 546 }, 1, { x: 0, y: 0 });

// App-level photo zoom and pan must compose with browser/page scale rather than
// introducing another coordinate space.
roundTrip({ left: 8, top: 96, width: 351, height: 585 }, 2.4, { x: -188, y: -214 });

const stagePoint = imageToStagePoint(imagePoint, 2.4, { x: -188, y: -214 }, stage);
const restored = stageToImagePoint(stagePoint, 2.4, { x: -188, y: -214 }, stage);
assert.ok(restored);
close(restored.x, imagePoint.x, 'image/stage x transform must be inverse');
close(restored.y, imagePoint.y, 'image/stage y transform must be inverse');

assert.ok(refinementBrushRadius(stage, 2) > refinementBrushRadius(stage, 1), 'brush footprint should visually grow with image zoom');
assert.equal(clientToStagePoint({ x: 0, y: 0 }, { left: 0, top: 0, width: 0, height: 100 }, stage), null, 'zero-size DOM rect must fail closed');

console.log('PASS Arrange refinement coordinates remain source-stable across page scroll, rendered scaling, zoom/pan, and brush preview transforms');
