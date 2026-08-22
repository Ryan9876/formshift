import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const sceneRoot = path.join(root, 'apps/client/src/scene');
const preparedRoot = path.join(root, 'apps/client/src/prepared');
const canonicalArrange = path.join(root, 'apps/client/src/components/PhotoArrangeEditor.web.tsx');
const preparedEditor = path.join(root, 'apps/client/src/components/PreparedSceneEditor.web.tsx');
const preparedPersistence = path.join(root, 'apps/client/src/prepared/persistence.ts');
const preparedSupport = path.join(root, 'apps/client/src/prepared/support.ts');
const preparedRepairClient = path.join(root, 'apps/client/src/prepared/backgroundRepair.web.ts');
const repairApi = path.join(root, 'apps/api/api/ai/repair-background.ts');
const segmentationProvider = path.join(root, 'apps/client/src/vision/MediaPipeObjectSegmenter.web.ts');
const arrangeWorkspace = path.join(root, 'apps/client/src/screens/PhotoArrangeWorkspace.tsx');
const arrangePreparedRoute = path.join(root, 'apps/client/app/arrange-prepared.tsx');
const authProvider = path.join(root, 'apps/client/src/auth/AuthProvider.tsx');
const photoArrangementPersistence = path.join(root, 'apps/client/src/data/photoArrangementPersistence.ts');
const forbiddenRuntimeCoupling = ['new MutationObserver(', 'querySelector(', 'root.textContent', '.click('];
let failures = 0;

function fail(message) {
  failures += 1;
  console.error(`FAIL ${message}`);
}
function pass(message) { console.log(`PASS ${message}`); }
function filesUnder(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(directory, entry.name);
    return entry.isDirectory() ? filesUnder(full) : [full];
  });
}
function scan(file, tokens) {
  const source = fs.readFileSync(file, 'utf8');
  for (const token of tokens) {
    if (source.includes(token)) fail(`${path.relative(root, file)} uses forbidden legacy coupling: ${token}`);
  }
}

for (const file of filesUnder(sceneRoot).filter((value) => /\.(ts|tsx)$/.test(value))) {
  scan(file, [...forbiddenRuntimeCoupling, 'PhotoArrangeEditorV']);
}
for (const file of filesUnder(preparedRoot).filter((value) => /\.(ts|tsx)$/.test(value))) {
  scan(file, forbiddenRuntimeCoupling);
}
scan(canonicalArrange, forbiddenRuntimeCoupling);
scan(segmentationProvider, forbiddenRuntimeCoupling);
if (!failures) pass('scene, Prepared Scene, and canonical Arrange boundaries avoid DOM text/click observer coupling');

const workspace = fs.readFileSync(arrangeWorkspace, 'utf8');
if (!workspace.includes("from '../components/PhotoArrangeEditor'")) fail('Arrange workspace is not routed through canonical PhotoArrangeEditor fallback');
if (!workspace.includes("from '../components/PreparedSceneEditor'")) fail('Arrange workspace does not expose the Prepared Scene preview boundary');
if (!workspace.includes('flags.preparedSceneV1')) fail('Prepared Scene route is not feature-flagged in Arrange');
if (/PhotoArrangeEditorV\d+/.test(workspace)) fail('Arrange workspace still imports a versioned editor wrapper');
else pass('Arrange workspace preserves canonical fallback and feature-flagged Prepared Scene boundary');

const forcedRoute = fs.readFileSync(arrangePreparedRoute, 'utf8');
if (!forcedRoute.includes('forcePreparedScene')) fail('Dedicated Prepared Scene route does not force the Prepared Scene editor');
else pass('Dedicated Prepared Scene route cannot silently fall back to the normal Arrange editor');

const authSource = fs.readFileSync(authProvider, 'utf8');
for (const required of ['WEB_AUTH_RETURN_KEY', 'sessionStorage.setItem', 'sessionStorage.getItem', 'window.location.replace']) {
  if (!authSource.includes(required)) fail(`web authentication route restoration missing ${required}`);
}
if (!failures) pass('web authentication preserves and restores the requested preview route');

const arrangementSource = fs.readFileSync(photoArrangementPersistence, 'utf8');
const lineageMatches = arrangementSource.match(/\.eq\('source_asset_id', sourceAsset\.data\.id\)/g) ?? [];
if (lineageMatches.length < 2) fail('photo arrangement restore/parent lineage is not scoped to the current source room photo');
else pass('photo arrangement restore and parent lineage are scoped to the current source room photo');

const flags = fs.readFileSync(path.join(sceneRoot, 'featureFlags.ts'), 'utf8');
if (!flags.includes('EXPO_PUBLIC_SCENE_INTELLIGENCE_V1')) fail('scene intelligence feature flag missing');
else pass('scene intelligence is feature-flagged');
if (!flags.includes('EXPO_PUBLIC_PREPARED_SCENE_V1')) fail('Prepared Scene feature flag missing');
else pass('Prepared Scene is independently feature-flagged');

const preparedSource = fs.readFileSync(preparedEditor, 'utf8');
for (const required of [
  'createObjectDiscoveryProvider',
  'segmentPreparedObject',
  'createQuickCleanBackground',
  'createDepthProvider',
  'loadLatestPreparedScene',
  'persistPreparedScene',
  'repairPreparedSceneBackground',
  'createPreparedSceneRepairMask',
  'compositeRepairedCleanBackground',
  "automaticAcceptance: 'detector-backed-only'",
  'supportModelVersion',
  'supportAssistEnabled',
  'constrainPreparedPosition',
  'maskMatchesDetection',
  'isPersonOccludedCandidate',
  'comparePreparedDepth',
  'Add missed object',
]) {
  if (!preparedSource.includes(required)) fail(`Prepared Scene editor missing ${required}`);
}
if (preparedSource.includes('ROOM_SWEEP_SEEDS')) fail('Prepared Scene must not auto-promote unlabeled grid segmentation into moveable room objects');
else pass('automatic Prepared Scene layers require detector evidence; unknown items remain user-added');
for (const forbidden of ['persistPhotoArrangement(', '.from(', 'supabase.', 'onSnapshotChange(', 'measurement_observations', 'spatial_versions']) {
  if (preparedSource.includes(forbidden)) fail(`Prepared Scene editor crosses a forbidden canonical/data boundary: ${forbidden}`);
}
if (!failures) pass('Prepared Scene persists only through derived-scene services and does not mutate canonical measurements/spatial state');

const supportSource = fs.readFileSync(preparedSupport, 'utf8');
for (const required of [
  'estimateSupportModel',
  'estimateSupportModelFromObjects',
  'constrainPreparedPosition',
  'isPersonOccludedCandidate',
  'maskMatchesDetection',
  'comparePreparedDepth',
]) {
  if (!supportSource.includes(required)) fail(`Prepared support layer missing ${required}`);
}
if (!supportSource.includes("source: 'detector-anchors' | 'object-anchors' | 'fallback'")) fail('Prepared support model does not preserve estimated provenance');
else pass('Prepared Scene support constraints remain estimated, reversible, and provenance-aware');

const preparedPersistenceSource = fs.readFileSync(preparedPersistence, 'utf8');
for (const required of [".from('prepared_scenes')", ".eq('source_asset_id', sourceAsset.id)", "PREPARED_SCENE_SCHEMA = 'prepared-scene-1.1'", ".eq('schema_version', PREPARED_SCENE_SCHEMA)", "kind: 'prepared_scene_object_mask_v1'", "kind: 'prepared_scene_object_cutout_v1'"]) {
  if (!preparedPersistenceSource.includes(required)) fail(`Prepared Scene persistence missing source-bound derived asset contract ${required}`);
}
if (preparedPersistenceSource.includes(".from('spatial_versions')") || preparedPersistenceSource.includes(".from('measurement_observations')")) {
  fail('Prepared Scene persistence must never write canonical spatial/measurement tables');
} else pass('Prepared Scene cache is source-photo-bound, generation-bound, and derived-only');

const preparedRepairSource = fs.readFileSync(preparedRepairClient, 'utf8');
for (const required of ["mode: 'prepared-scene'", '/api/ai/repair-background', 'fast local background is still available']) {
  if (!preparedRepairSource.includes(required)) fail(`Prepared Scene repair client missing ${required}`);
}
const repairApiSource = fs.readFileSync(repairApi, 'utf8');
for (const required of ['prepared-scene-background-repair', 'preparedScenePrompt', "body.mode === 'prepared-scene'"]) {
  if (!repairApiSource.includes(required)) fail(`Prepared Scene repair API missing ${required}`);
}
if (!failures) pass('high-quality background repair is explicit and uses a dedicated Prepared Scene task contract');

const detector = fs.readFileSync(path.join(preparedRoot, 'providers/DetrObjectDiscovery.web.ts'), 'utf8');
if (!detector.includes("Xenova/detr-resnet-50")) fail('Prepared Scene detector model identity missing');
for (const required of ['isAppleWebKit', "backend: 'wasm'", 'wasm.numThreads = 1']) {
  if (!detector.includes(required)) fail(`Prepared Scene detector is missing Safari-safe inference guard ${required}`);
}
if (detector.includes("device: webGpu ? 'webgpu' : 'wasm'")) fail('Prepared Scene detector still treats navigator.gpu as sufficient WebGPU compatibility evidence');
else pass('Prepared Scene detector uses Safari-safe WASM fallback instead of navigator.gpu capability guessing');

const depthProvider = fs.readFileSync(path.join(sceneRoot, 'providers/DepthAnythingV2Small.web.ts'), 'utf8');
for (const required of ['isAppleWebKit', "backend: 'wasm'", 'wasm.numThreads = 1']) {
  if (!depthProvider.includes(required)) fail(`Depth Anything provider is missing Safari-safe inference guard ${required}`);
}
if (depthProvider.includes("device: webGpu ? 'webgpu' : 'wasm'")) fail('Depth provider still treats navigator.gpu as sufficient WebGPU compatibility evidence');
else pass('Depth Anything uses the same Safari-safe WASM fallback contract');

const sceneMigration = fs.readFileSync(path.join(root, 'supabase/schema/003_scene_intelligence.sql'), 'utf8');
for (const required of ['enable row level security', 'grant select, insert', 'scene_analyses_select_member', 'scene_analyses_insert_editor']) {
  if (!sceneMigration.toLowerCase().includes(required.toLowerCase())) fail(`scene migration missing ${required}`);
}
const preparedMigration = fs.readFileSync(path.join(root, 'supabase/schema/006_prepared_scenes.sql'), 'utf8');
for (const required of ['enable row level security', 'grant select, insert', 'prepared_scenes_select_member', 'prepared_scenes_insert_editor', 'source_asset_id']) {
  if (!preparedMigration.toLowerCase().includes(required.toLowerCase())) fail(`Prepared Scene migration missing ${required}`);
}
if (!failures) pass('scene and Prepared Scene persistence have explicit grants and RLS policies');

if (failures) process.exit(1);
