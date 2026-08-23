import assert from 'node:assert/strict';
import { inspectSpatialImport, compareSpatialImport } from '../apps/client/src/spatial-import/inspect.ts';

const encoder = new TextEncoder();

const gltf = {
  asset: { version: '2.0', generator: 'Polycam reference fixture' },
  accessors: [{ count: 8, type: 'VEC3', min: [-2, 0, -3], max: [2, 2.5, 3] }],
  meshes: [{ primitives: [{ attributes: { POSITION: 0 }, material: 0 }] }],
  materials: [{}],
  images: [{ uri: 'textures/0.jpg' }],
  nodes: [{ mesh: 0, translation: [1, 0, 0] }],
  scenes: [{ nodes: [0] }],
  scene: 0,
};
const gltfBytes = encoder.encode(JSON.stringify(gltf));
const gltfEvidence = inspectSpatialImport({ fileName: 'polycam-room.gltf', sizeBytes: gltfBytes.byteLength, bytes: gltfBytes });
assert.equal(gltfEvidence.source.provider, 'polycam');
assert.equal(gltfEvidence.source.format, 'gltf');
assert.equal(gltfEvidence.coordinateSystem.unit, 'm');
assert.equal(gltfEvidence.canonicalMutationAllowed, false);
assert.equal(gltfEvidence.mesh?.meshCount, 1);
assert.equal(gltfEvidence.mesh?.primitiveCount, 1);
assert.equal(gltfEvidence.mesh?.positionVertexCount, 8);
assert.deepEqual(gltfEvidence.mesh?.boundsMeters?.min, [-1, 0, -3]);
assert.deepEqual(gltfEvidence.mesh?.boundsMeters?.max, [3, 2.5, 3]);
assert.equal(gltfEvidence.mesh?.boundsBasis, 'accessor-minmax-with-node-transforms');
assert.ok(gltfEvidence.warnings.some((warning) => warning.includes('external geometry/textures')));

const glbBytes = makeGlb(gltf);
const glbEvidence = inspectSpatialImport({ fileName: 'room.glb', sizeBytes: glbBytes.byteLength, bytes: glbBytes });
assert.equal(glbEvidence.source.format, 'glb');
assert.equal(glbEvidence.mesh?.nodeCount, 1);
assert.deepEqual(glbEvidence.mesh?.boundsMeters?.size, [4, 2.5, 6]);

const roomPlan = {
  identifier: 'ROOM-1',
  version: 1,
  story: 0,
  walls: [
    item('wall', 'high', [4, 2.5, 0.1], translationMatrix(0, 1.25, -2)),
    item('wall', 'high', [6, 2.5, 0.1], translationMatrix(-2, 1.25, 0)),
  ],
  floors: [{
    ...item('floor', 'high', [4, 0.02, 6], translationMatrix(0, 0, 0)),
    polygonCorners: [[-2, 0, -3], [2, 0, -3], [2, 0, 3], [-2, 0, 3]],
  }],
  doors: [item('door', 'medium', [0.9, 2.1, 0.1], translationMatrix(-2, 1.05, 1))],
  windows: [item('window', 'high', [1.5, 1.2, 0.1], translationMatrix(0.5, 1.4, -2))],
  openings: [],
  objects: [item('television', 'medium', [1.5, 0.9, 0.12], translationMatrix(1, 1.4, -1.8))],
  sections: [{ label: 'livingRoom' }],
};
const roomPlanBytes = encoder.encode(JSON.stringify(roomPlan));
const floorplanEvidence = inspectSpatialImport({ fileName: 'original_floorplan.json', sizeBytes: roomPlanBytes.byteLength, bytes: roomPlanBytes });
assert.equal(floorplanEvidence.source.provider, 'polycam');
assert.equal(floorplanEvidence.source.format, 'roomplan-json');
assert.equal(floorplanEvidence.confidence, 'measured-candidate');
assert.equal(floorplanEvidence.floorplan?.walls, 2);
assert.equal(floorplanEvidence.floorplan?.floors, 1);
assert.equal(floorplanEvidence.floorplan?.doors, 1);
assert.equal(floorplanEvidence.floorplan?.windows, 1);
assert.equal(floorplanEvidence.floorplan?.objects, 1);
assert.equal(floorplanEvidence.floorplan?.highConfidenceItems, 4);
assert.equal(floorplanEvidence.floorplan?.mediumConfidenceItems, 2);
assert.equal(floorplanEvidence.floorplan?.floorPolygonPointCount, 4);
assert.ok((floorplanEvidence.floorplan?.boundsMeters?.size[0] ?? 0) >= 4);
assert.ok((floorplanEvidence.floorplan?.boundsMeters?.size[2] ?? 0) >= 6);

const snapshot = {
  schemaVersion: 'spatial-1',
  coordinateSystem: { handedness: 'right', upAxis: 'y', floorPlane: 'xz', unit: 'mm' },
  spaceId: 'space-1',
  boundary: { floorPolygon: [{ x: -2000, z: -3000 }, { x: 2000, z: -3000 }, { x: 2000, z: 3000 }, { x: -2000, z: 3000 }], ceilingHeightMm: 2500 },
  objects: [],
  openings: [],
  constraints: [],
  measurementRefs: [],
};
const comparison = compareSpatialImport(floorplanEvidence, snapshot);
assert.ok(comparison);
assert.equal(comparison?.canonicalHasBoundary, true);
assert.equal(comparison?.importHasMetricBounds, true);
assert.equal(comparison?.objectCountDelta, 1);
assert.equal(comparison?.openingCountDelta, 2);
assert.ok(comparison?.conclusions.some((line) => line.includes('diagnostic only')));

const zipBytes = makeCentralDirectoryZip([
  'keyframes/images/0001.jpg',
  'keyframes/images/0002.jpg',
  'keyframes/depth/0001.png',
  'keyframes/confidence/0001.png',
  'camera/poses.json',
  'metadata.json',
]);
const zipEvidence = inspectSpatialImport({ fileName: 'session.zip', sizeBytes: zipBytes.byteLength, bytes: zipBytes });
assert.equal(zipEvidence.source.provider, 'polycam');
assert.equal(zipEvidence.source.format, 'zip-inventory');
assert.equal(zipEvidence.archive?.entryCount, 6);
assert.equal(zipEvidence.archive?.keyframeImageCount, 2);
assert.ok((zipEvidence.archive?.likelyDepthEntryCount ?? 0) >= 1);
assert.ok((zipEvidence.archive?.likelyConfidenceEntryCount ?? 0) >= 1);
assert.ok((zipEvidence.archive?.likelyCameraEntryCount ?? 0) >= 1);
assert.equal(zipEvidence.canonicalMutationAllowed, false);

const unknown = inspectSpatialImport({ fileName: 'notes.txt', sizeBytes: 3, bytes: encoder.encode('abc') });
assert.equal(unknown.source.format, 'unsupported');
assert.equal(unknown.canonicalMutationAllowed, false);

console.log('PASS spatial import clean-room inspection: glTF/GLB metric metadata, RoomPlan evidence, Polycam ZIP inventory, canonical comparison, and mutation prohibition');

function item(category, confidence, dimensions, transform) {
  return { category: { [category]: {} }, confidence: { [confidence]: {} }, dimensions, transform };
}
function translationMatrix(x, y, z) {
  return [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, x, y, z, 1];
}
function makeGlb(document) {
  const json = encoder.encode(JSON.stringify(document));
  const paddedLength = Math.ceil(json.byteLength / 4) * 4;
  const total = 12 + 8 + paddedLength;
  const bytes = new Uint8Array(total);
  const view = new DataView(bytes.buffer);
  view.setUint32(0, 0x46546c67, true);
  view.setUint32(4, 2, true);
  view.setUint32(8, total, true);
  view.setUint32(12, paddedLength, true);
  view.setUint32(16, 0x4e4f534a, true);
  bytes.set(json, 20);
  bytes.fill(0x20, 20 + json.byteLength, total);
  return bytes;
}
function makeCentralDirectoryZip(names) {
  const nameBytes = names.map((name) => encoder.encode(name));
  const centralSize = nameBytes.reduce((sum, name) => sum + 46 + name.byteLength, 0);
  const bytes = new Uint8Array(centralSize + 22);
  const view = new DataView(bytes.buffer);
  let offset = 0;
  for (const name of nameBytes) {
    view.setUint32(offset, 0x02014b50, true);
    view.setUint16(offset + 28, name.byteLength, true);
    bytes.set(name, offset + 46);
    offset += 46 + name.byteLength;
  }
  view.setUint32(offset, 0x06054b50, true);
  view.setUint16(offset + 8, names.length, true);
  view.setUint16(offset + 10, names.length, true);
  view.setUint32(offset + 12, centralSize, true);
  view.setUint32(offset + 16, 0, true);
  return bytes;
}
