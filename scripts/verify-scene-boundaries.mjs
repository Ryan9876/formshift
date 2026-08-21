import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const sceneRoot = path.join(root, 'apps/client/src/scene');
const forbidden = ['MutationObserver', 'querySelector(', '.textContent', '.click(', 'PhotoArrangeEditorV'];
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

for (const file of filesUnder(sceneRoot).filter((value) => /\.(ts|tsx)$/.test(value))) {
  const source = fs.readFileSync(file, 'utf8');
  for (const token of forbidden) {
    if (source.includes(token)) fail(`${path.relative(root, file)} uses forbidden legacy coupling: ${token}`);
  }
}
if (!failures) pass('scene layer is isolated from legacy DOM/editor-version coupling');

const flags = fs.readFileSync(path.join(sceneRoot, 'featureFlags.ts'), 'utf8');
if (!flags.includes('EXPO_PUBLIC_SCENE_INTELLIGENCE_V1')) fail('scene intelligence feature flag missing');
else pass('scene intelligence is feature-flagged');

const migration = fs.readFileSync(path.join(root, 'supabase/schema/003_scene_intelligence.sql'), 'utf8');
for (const required of ['enable row level security', 'grant select, insert', 'scene_analyses_select_member', 'scene_analyses_insert_editor']) {
  if (!migration.toLowerCase().includes(required.toLowerCase())) fail(`scene migration missing ${required}`);
}
if (!failures) pass('scene persistence has explicit grants and RLS policies');

if (failures) process.exit(1);
