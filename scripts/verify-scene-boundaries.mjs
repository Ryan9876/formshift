import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const sceneRoot = path.join(root, 'apps/client/src/scene');
const canonicalArrange = path.join(root, 'apps/client/src/components/PhotoArrangeEditor.web.tsx');
const segmentationProvider = path.join(root, 'apps/client/src/vision/MediaPipeObjectSegmenter.web.ts');
const arrangeWorkspace = path.join(root, 'apps/client/src/screens/PhotoArrangeWorkspace.tsx');
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
scan(canonicalArrange, forbiddenRuntimeCoupling);
scan(segmentationProvider, forbiddenRuntimeCoupling);
if (!failures) pass('scene and canonical Arrange boundaries avoid DOM text/click observer coupling');

const workspace = fs.readFileSync(arrangeWorkspace, 'utf8');
if (!workspace.includes("from '../components/PhotoArrangeEditor'")) fail('Arrange workspace is not routed through canonical PhotoArrangeEditor');
if (/PhotoArrangeEditorV\d+/.test(workspace)) fail('Arrange workspace still imports a versioned editor wrapper');
else pass('Arrange workspace uses one canonical editor boundary');

const flags = fs.readFileSync(path.join(sceneRoot, 'featureFlags.ts'), 'utf8');
if (!flags.includes('EXPO_PUBLIC_SCENE_INTELLIGENCE_V1')) fail('scene intelligence feature flag missing');
else pass('scene intelligence is feature-flagged');

const migration = fs.readFileSync(path.join(root, 'supabase/schema/003_scene_intelligence.sql'), 'utf8');
for (const required of ['enable row level security', 'grant select, insert', 'scene_analyses_select_member', 'scene_analyses_insert_editor']) {
  if (!migration.toLowerCase().includes(required.toLowerCase())) fail(`scene migration missing ${required}`);
}
if (!failures) pass('scene persistence has explicit grants and RLS policies');

if (failures) process.exit(1);
