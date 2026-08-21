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
  ['Safari object drag is tracked from the move handle', canonical, 'activeMovePointersRef.current.add(event.pointerId)'],
  ['Safari object drag forwards pointer movement after capture loss', canonical, 'window.addEventListener(\'pointermove\', forwardPointer, true)'],
  ['page scrolling is blocked only during an active object drag', canonical, "document.addEventListener('touchmove', blockPageScrollDuringObjectDrag, { capture: true, passive: false })"],
  ['failed CSS active-state drag expansion removed', canonical, "[aria-label='Move selected object']:active"],
];
let failures = 0;
for (const [name, fileSource, token] of required) {
  const shouldBeAbsent = name === 'failed CSS active-state drag expansion removed';
  const found = fileSource.includes(token);
  const passes = shouldBeAbsent ? !found : found;
  if (!passes) {
    failures += 1;
    console.error(`FAIL ${name}`);
  } else {
    console.log(`PASS ${name}`);
  }
}
if (failures) process.exit(1);
