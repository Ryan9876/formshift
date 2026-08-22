import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const sceneRoot = path.join(root, 'apps/client/src/scene');
const preparedRoot = path.join(root, 'apps/client/src/prepared');
const canonicalArrange = path.join(root, 'apps/client/src/components/PhotoArrangeEditor.web.tsx');
const preparedEditor = path.join(root, 'apps/client/src/components/PreparedSceneEditor.web.tsx');
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
for (const required of ['createObjectDiscoveryProvider', 'segmentPreparedObject', 'createQuickCleanBackground', 'createDepthProvider', 'Add missed object']) {
  if (!preparedSource.includes(required)) fail(`Prepared Scene editor missing ${required}`);
}
for (const forbidden of ['persistPhotoArrangement(', '.from(', 'supabase.', 'onSnapshotChange(']) {
  if (preparedSource.includes(forbidden)) fail(`Prepared Scene v1 must remain derived-only during evaluation; found ${forbidden}`);
}
if (!failures) pass('Prepared Scene v1 performs progressive local preparation without canonical persistence writes');

const detector = fs.readFileSync(path.join(preparedRoot, 'providers/DetrObjectDiscovery.web.ts'), 'utf8');
if (!detector.includes("Xenova/detr-resnet-50")) fail('Prepared Scene detector model identity missing');
else pass('Prepared Scene detector identity is explicit');

const migration = fs.readFileSync(path.join(root, 'supabase/schema/003_scene_intelligence.sql'), 'utf8');
for (const required of ['enable row level security', 'grant select, insert', 'scene_analyses_select_member', 'scene_analyses_insert_editor']) {
  if (!migration.toLowerCase().includes(required.toLowerCase())) fail(`scene migration missing ${required}`);
}
if (!failures) pass('scene persistence has explicit grants and RLS policies');

if (failures) process.exit(1);
