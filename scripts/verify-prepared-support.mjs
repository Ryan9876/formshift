import assert from 'node:assert/strict';
import {
  classifyPreparedLabel,
  comparePreparedDepth,
  constrainPreparedPosition,
  estimateSupportModel,
  isPersonOccludedCandidate,
  maskMatchesDetection,
} from '../apps/client/src/prepared/support.ts';

function candidate(label, score, xmin, ymin, xmax, ymax) {
  return { label, score, box: { xmin, ymin, xmax, ymax } };
}

function preparedObject(overrides = {}) {
  return {
    id: 'object-1',
    label: 'couch',
    detectionScore: 0.95,
    mobility: 'movable',
    expectedSupport: 'floor',
    bbox: { x: 0.2, y: 0.45, width: 0.4, height: 0.3 },
    maskDataUrl: 'data:image/png;base64,',
    cutoutDataUrl: 'data:image/png;base64,',
    position: { x: 0.4, y: 0.6 },
    scale: 1,
    rotationDeg: 0,
    source: 'automatic',
    ...overrides,
  };
}

const tv = classifyPreparedLabel('tv');
assert.deepEqual(tv, { mobility: 'conditional', support: 'wall' });
assert.deepEqual(classifyPreparedLabel('couch'), { mobility: 'movable', support: 'floor' });
assert.equal(classifyPreparedLabel('lamp').support, 'surface');

const support = estimateSupportModel([
  candidate('couch', 0.97, 100, 300, 700, 900),
  candidate('chair', 0.91, 800, 350, 1100, 860),
], 1200, 1000);
assert.equal(support.source, 'detector-anchors');
assert.ok(support.floorRegionStartY >= 0.46 && support.floorRegionStartY <= 0.72);
assert.equal(support.confidence, 0.68);

const person = candidate('person', 0.99, 360, 260, 620, 880);
const couch = candidate('couch', 0.97, 180, 420, 880, 940);
assert.equal(isPersonOccludedCandidate(couch, [couch, person]), true);
const separateChair = candidate('chair', 0.9, 900, 450, 1120, 930);
assert.equal(isPersonOccludedCandidate(separateChair, [separateChair, person]), false);

assert.equal(
  maskMatchesDetection(
    { x: 0.18, y: 0.4, width: 0.56, height: 0.5 },
    couch,
    1200,
    1000,
  ),
  true,
);
assert.equal(
  maskMatchesDetection(
    { x: 0.78, y: 0.05, width: 0.12, height: 0.1 },
    couch,
    1200,
    1000,
  ),
  false,
);

const floorObject = preparedObject();
const constrainedFloor = constrainPreparedPosition(
  floorObject,
  { x: 0.4, y: 0.2 },
  { floorRegionStartY: 0.6, confidence: 0.7, source: 'detector-anchors' },
  true,
);
const floorBottom = constrainedFloor.y + floorObject.bbox.height / 2;
assert.ok(floorBottom >= 0.6 - 1e-9, 'floor-supported object must remain in the estimated floor region');

const wallObject = preparedObject({
  label: 'tv',
  mobility: 'conditional',
  expectedSupport: 'wall',
  bbox: { x: 0.35, y: 0.2, width: 0.3, height: 0.2 },
});
const constrainedWall = constrainPreparedPosition(
  wallObject,
  { x: 0.5, y: 0.9 },
  { floorRegionStartY: 0.6, confidence: 0.7, source: 'detector-anchors' },
  true,
);
const wallBottom = constrainedWall.y + wallObject.bbox.height / 2;
assert.ok(wallBottom <= 0.63 + 1e-9, 'wall-supported object must stay above the estimated floor transition tolerance');

const freeWall = constrainPreparedPosition(
  wallObject,
  { x: 0.5, y: 0.85 },
  { floorRegionStartY: 0.6, confidence: 0.7, source: 'detector-anchors' },
  false,
);
assert.ok(freeWall.y > constrainedWall.y, 'disabling support assist must restore freer placement');

const farther = preparedObject({ id: 'farther', approximateDepth: 0.25, position: { x: 0.4, y: 0.75 } });
const nearer = preparedObject({ id: 'nearer', approximateDepth: 0.8, position: { x: 0.4, y: 0.35 } });
assert.ok(comparePreparedDepth(farther, nearer) < 0, 'larger relative-depth values must render later/in front');

console.log('PASS Prepared Scene support, mask-safety, and depth-order regression checks');
