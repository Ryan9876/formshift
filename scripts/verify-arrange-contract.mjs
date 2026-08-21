import fs from 'node:fs';
import path from 'node:path';

const coreFile = path.join(process.cwd(), 'apps/client/src/components/PhotoArrangeEditorV17.web.tsx');
const canonicalFile = path.join(process.cwd(), 'apps/client/src/components/PhotoArrangeEditor.web.tsx');
const source = fs.readFileSync(coreFile, 'utf8');
const canonical = fs.readFileSync(canonicalFile, 'utf8');
const required = [
  ['short-tap selection gate', source, '!tap.moved && Date.now() - tap.startedAt < 650'],
  ['editable saved restore', source, 'Saved object restored and editable.'],
  ['local background persistence', source, 'backgroundForPersistence = backgroundDataUrl ?? sceneUrl'],
  ['v2.2 renderer lineage', source, "rendererVersion: 'photo-arrange-2.2'"],
  ['explicit AI background repair', source, 'async function refineBackground()'],
  ['source photo not overwritten by reset', source, 'persistedSceneUrl ?? photoUrl ?? null'],
  ['Safari active-drag continuation', canonical, "[aria-label='Move selected object']:active"],
  ['active drag spans complete photo stage', canonical, 'inset: 0 !important;'],
];
let failures = 0;
for (const [name, fileSource, token] of required) {
  if (!fileSource.includes(token)) {
    failures += 1;
    console.error(`FAIL ${name}`);
  } else {
    console.log(`PASS ${name}`);
  }
}
if (failures) process.exit(1);
