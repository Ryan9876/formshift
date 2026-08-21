import fs from 'node:fs';
import path from 'node:path';

const file = path.join(process.cwd(), 'apps/client/src/components/PhotoArrangeEditorV17.web.tsx');
const source = fs.readFileSync(file, 'utf8');
const required = [
  ['short-tap selection gate', '!tap.moved && Date.now() - tap.startedAt < 650'],
  ['editable saved restore', 'Saved object restored and editable.'],
  ['local background persistence', 'backgroundForPersistence = backgroundDataUrl ?? sceneUrl'],
  ['v2.2 renderer lineage', "rendererVersion: 'photo-arrange-2.2'"],
  ['explicit AI background repair', 'async function refineBackground()'],
  ['source photo not overwritten by reset', 'persistedSceneUrl ?? photoUrl ?? null'],
];
let failures = 0;
for (const [name, token] of required) {
  if (!source.includes(token)) {
    failures += 1;
    console.error(`FAIL ${name}`);
  } else {
    console.log(`PASS ${name}`);
  }
}
if (failures) process.exit(1);
