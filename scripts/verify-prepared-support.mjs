import assert from 'node:assert/strict';
import {
  classifyPreparedLabel,
  comparePreparedDepth,
  constrainPreparedPosition,
  estimateSupportModel,
  floorBoundaryAtX,
  isPersonOccludedCandidate,
  maskMatchesDetection,
  projectedPreparedDepth,
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
  candidate('couch', 0.97, 40, 300, 440, 780),
  candidate('chair', 0.91, 760, 350, 1120, 900),
], 1200, 1000);
assert.equal(support.source, 'detector-anchors');
assert.ok(support.floorRegionStartY >= 0.46 && support.floorRegionStartY <= 0.72);
assert.ok(Math.abs(support.floorBoundarySlope) > 0.01, 'separated floor anchors should produce an x-dependent boundary');
assert.ok(support.confidence >= 0.7);
assert.notEqual(floorBoundaryAtX(support, 0.1), floorBoundaryAtX(support, 0.9), 'perspective boundary must vary across x when evidence supports it');

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
assert.equal(
  maskMatchesDetection(
    { x: 0.02, y: 0.1, width: 0.9, height: 0.82 },
    couch,
    1200,
    1000,
  ),
  false,
  'whole-room masks must not pass detector agreement',
);

const floorObject = preparedObject();
const perspectiveModel = { floorRegionStartY: 0.6, floorBoundarySlope: 0.12, confidence: 0.74, source: 'detector-anchors' };
const constrainedLeft = constrainPreparedPosition(floorObject, { x: 0.2, y: 0.2 }, perspectiveModel, true);
const constrainedRight = constrainPreparedPosition(floorObject, { x: 0.8, y: 0.2 }, perspectiveModel, true);
assert.ok(constrainedRight.y > constrainedLeft.y, 'floor support constraint must follow the projected boundary across image x');

const wallObject = preparedObject({
  label: 'tv',
  mobility: 'conditional',
  expectedSupport: 'wall',
  bbox: { x: 0.35, y: 0.2, width: 0.3, height: 0.2 },
});
const constrainedWall = constrainPreparedPosition(wallObject, { x: 0.8, y: 0.9 }, perspectiveModel, true);
const wallBottom = constrainedWall.y + wallObject.bbox.height / 2;
assert.ok(wallBottom <= floorBoundaryAtX(perspectiveModel, 0.8) + 0.03 + 1e-9, 'wall object must remain above projected floor transition');

const freeWall = constrainPreparedPosition(wallObject, { x: 0.8, y: 0.85 }, perspectiveModel, false);
assert.ok(freeWall.y > constrainedWall.y, 'disabling support assist must restore freer placement');

const movedTowardViewer = preparedObject({ id: 'nearer', approximateDepth: 0.5, position: { x: 0.4, y: 0.82 } });
const unmoved = preparedObject({ id: 'farther', approximateDepth: 0.5, position: { x: 0.4, y: 0.58 } });
assert.ok(projectedPreparedDepth(movedTowardViewer) > projectedPreparedDepth(unmoved), 'moving lower in image should increase estimated projected depth');
assert.ok(comparePreparedDepth(unmoved, movedTowardViewer) < 0, 'movement-aware depth must render the lower/nearer prepared layer in front');

console.log('PASS Prepared Scene perspective support, mask-safety, and movement-aware depth regression checks');
