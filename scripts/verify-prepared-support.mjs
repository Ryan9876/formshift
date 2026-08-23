import assert from 'node:assert/strict';
import {
  analyzeSupportModelFromDepth,
  depthValueToNearness,
  estimateSupportModelFromDepth,
  mergePreparedSupportModels,
  mergePreparedSupportModelsWithDiagnostics,
} from '../apps/client/src/prepared/depthSupport.ts';
import { shouldOccludeDepthSample } from '../apps/client/src/prepared/occlusion.web.ts';
import { inpaintPreparedMask } from '../apps/client/src/prepared/quickInpaint.ts';
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

function syntheticDepth(width = 130, height = 100) {
  const normalized = new Uint8ClampedArray(width * height);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const nx = x / Math.max(1, width - 1);
      const boundary = 0.56 + 0.09 * (nx - 0.5);
      const ny = y / Math.max(1, height - 1);
      const base = ny < boundary ? 55 : 185;
      normalized[y * width + x] = Math.max(0, Math.min(255, base + Math.round((nx - 0.5) * 6)));
    }
  }
  return {
    width,
    height,
    normalized,
    dataUrl: 'data:image/png;base64,',
    provider: 'test',
    model: 'synthetic-depth',
    modelVersion: 'test',
    processingMs: 1,
  };
}

function syntheticDepthWithForegroundMaterialEdge(width = 156, height = 144) {
  const normalized = new Uint8ClampedArray(width * height);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const nx = x / Math.max(1, width - 1);
      const ny = y / Math.max(1, height - 1);
      const wallFloor = 0.54 + 0.055 * (nx - 0.5);
      const rugEdge = 0.72 + 0.035 * (nx - 0.5);
      // Both transitions persist across the whole image, but the later
      // floor/material transition is deliberately much stronger. This mirrors
      // the real-room failure where a coherent rug/hardwood band pulled the
      // support cutoff too far toward the foreground.
      const value = ny < wallFloor ? 66 : ny < rugEdge ? 122 : 246;
      normalized[y * width + x] = Math.max(0, Math.min(255, value + Math.round((nx - 0.5) * 4)));
    }
  }
  return {
    width,
    height,
    normalized,
    dataUrl: 'data:image/png;base64,',
    provider: 'test',
    model: 'two-coherent-depth-bands',
    modelVersion: 'test',
    processingMs: 1,
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

const depthAnalysis = analyzeSupportModelFromDepth(syntheticDepth());
const depthSupport = depthAnalysis.model;
assert.ok(depthSupport, 'coherent depth transition should produce support evidence');
assert.equal(depthAnalysis.diagnostics.reason, 'accepted');
assert.ok(depthAnalysis.diagnostics.strongSamples >= 5);
assert.ok(depthAnalysis.diagnostics.robustSamples >= 5);
assert.ok((depthAnalysis.diagnostics.xCoverage ?? 0) >= 0.34, 'support evidence must span a meaningful portion of the room');
assert.ok((depthAnalysis.diagnostics.averageContextStrength ?? 0) > 10, 'accepted support must have persistent nearward context');
assert.equal(depthAnalysis.diagnostics.nearDirection, 'higher-is-nearer');
assert.ok(depthAnalysis.diagnostics.nearDirectionConfidence > 0.18);
assert.equal(depthSupport.source, 'depth-profile');
assert.ok(depthSupport.floorRegionStartY > 0.5 && depthSupport.floorRegionStartY < 0.62);
assert.ok(depthSupport.floorBoundarySlope > 0.03, 'depth profile should preserve left-to-right perspective trend');
assert.ok(depthSupport.confidence >= 0.4 && depthSupport.confidence <= 0.84);
assert.deepEqual(estimateSupportModelFromDepth(syntheticDepth()), depthSupport);

const artifactAnalysis = analyzeSupportModelFromDepth(syntheticDepthWithForegroundMaterialEdge());
assert.ok(artifactAnalysis.model, 'real wall/floor transition should remain recoverable when a stronger persistent foreground material edge exists');
assert.equal(artifactAnalysis.diagnostics.reason, 'accepted');
assert.ok((artifactAnalysis.model?.floorRegionStartY ?? 1) < 0.62, 'upper wall/floor band must win over the stronger later rug/floor band');
assert.ok((artifactAnalysis.model?.floorRegionStartY ?? 0) > 0.48, 'selected band must remain near the synthetic wall/floor transition');

const flatDepth = syntheticDepth(60, 60);
flatDepth.normalized.fill(100);
const flatAnalysis = analyzeSupportModelFromDepth(flatDepth);
assert.equal(flatAnalysis.model, null);
assert.equal(flatAnalysis.diagnostics.reason, 'insufficient-strong-transitions');

const anchorNearDepth = { ...support, floorRegionStartY: depthSupport.floorRegionStartY + 0.02, floorBoundarySlope: depthSupport.floorBoundarySlope * 0.8, confidence: 0.7 };
const mergeAnalysis = mergePreparedSupportModelsWithDiagnostics(anchorNearDepth, depthSupport);
assert.equal(mergeAnalysis.decision, 'hybrid-agreement');
const hybrid = mergePreparedSupportModels(anchorNearDepth, depthSupport);
assert.equal(hybrid.source, 'hybrid');
assert.ok(hybrid.confidence >= Math.max(anchorNearDepth.confidence, depthSupport.confidence), 'agreeing independent evidence should not reduce confidence');
assert.ok(Math.abs(hybrid.floorRegionStartY - depthSupport.floorRegionStartY) < 0.04);

const disagreeingDepth = { ...depthSupport, floorRegionStartY: 0.78, confidence: 0.55 };
const disagreeMerge = mergePreparedSupportModelsWithDiagnostics({ ...support, floorRegionStartY: 0.5, confidence: 0.68 }, disagreeingDepth);
assert.equal(disagreeMerge.decision, 'anchor-wins-disagreement');
assert.ok((disagreeMerge.disagreement ?? 0) > 0.16);

assert.equal(depthValueToNearness(0.8, 'higher-is-nearer'), 0.8);
assert.ok(Math.abs(depthValueToNearness(0.8, 'lower-is-nearer') - 0.2) < 1e-12);
assert.equal(shouldOccludeDepthSample(0.8, 0.55), true, 'materially nearer source pixels should occlude a moved prepared object');
assert.equal(shouldOccludeDepthSample(0.61, 0.55), false, 'small depth differences must not create unstable occlusion');
assert.equal(shouldOccludeDepthSample(0.4, 0.55), false, 'farther source pixels remain behind the prepared object');

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

// Quick clean-plate regression: a high-contrast removed object must not be
// reproduced from its own source pixels, while every unmasked pixel remains exact.
const quickWidth = 24;
const quickHeight = 12;
const quickSource = new Uint8ClampedArray(quickWidth * quickHeight * 4);
const quickMask = new Uint8ClampedArray(quickWidth * quickHeight);
for (let y = 0; y < quickHeight; y += 1) {
  for (let x = 0; x < quickWidth; x += 1) {
    const index = y * quickWidth + x;
    const offset = index * 4;
    const background = 92 + x;
    quickSource[offset] = background;
    quickSource[offset + 1] = background;
    quickSource[offset + 2] = background;
    quickSource[offset + 3] = 255;
    if (x >= 8 && x <= 15 && y >= 3 && y <= 8) {
      quickSource[offset] = 248;
      quickSource[offset + 1] = 28;
      quickSource[offset + 2] = 28;
      quickMask[index] = 255;
    }
  }
}
const quickResult = inpaintPreparedMask(quickSource, quickMask, quickWidth, quickHeight);
assert.equal(quickResult.stats.maskedPixels, 48);
assert.equal(quickResult.stats.filledPixels, 48);
const quickCenterOffset = (6 * quickWidth + 11) * 4;
assert.ok((quickResult.pixels[quickCenterOffset] ?? 255) < 150, 'masked center should be reconstructed from surrounding background rather than retaining the bright removed object');
const quickOutsideOffset = (1 * quickWidth + 2) * 4;
for (let channel = 0; channel < 4; channel += 1) {
  assert.equal(quickResult.pixels[quickOutsideOffset + channel], quickSource[quickOutsideOffset + channel], 'unmasked quick-clean pixels must remain source-identical');
}

console.log('PASS Prepared Scene depth diagnostics, earliest coherent support-band selection, stronger foreground-material rejection, support fusion, conservative source occlusion, mask safety, movement-aware depth, and ghost-resistant quick-clean regression checks');
