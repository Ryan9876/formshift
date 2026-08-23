import assert from 'node:assert/strict';
import fs from 'node:fs';

const inspector = fs.readFileSync('apps/client/src/spatial-import/inspect.ts', 'utf8');
const types = fs.readFileSync('apps/client/src/spatial-import/types.ts', 'utf8');
const webLab = fs.readFileSync('apps/client/src/screens/SpatialImportLabScreen.web.tsx', 'utf8');
const route = fs.readFileSync('apps/client/app/spatial-import.tsx', 'utf8');

assert.ok(types.includes('canonicalMutationAllowed: false'), 'Spatial import evidence contract must permanently prohibit direct canonical mutation.');
assert.ok(inspector.includes('compareSpatialImport'), 'Spatial import must provide an explicit comparison layer rather than canonical replacement.');
assert.ok(webLab.includes('file.arrayBuffer()'), 'Spatial Import Lab must inspect user-selected files locally.');
assert.ok(webLab.includes('No canonical mutation'), 'Spatial Import Lab must disclose the no-mutation boundary.');
assert.ok(route.includes('<AccessGate>'), 'Spatial Import Lab must remain behind the authenticated access gate.');

for (const [name, source] of [['inspector', inspector], ['web lab', webLab]]) {
  for (const forbidden of ['supabase.', ".from('", 'persistPreparedScene', 'persistPhotoArrangement', 'measurement_observations', 'spatial_versions', 'service_role']) {
    assert.equal(source.includes(forbidden), false, `${name} must not cross persistence/canonical mutation boundary: ${forbidden}`);
  }
}

for (const forbidden of ['fetch(', 'XMLHttpRequest', 'axios', 'FormData(']) {
  assert.equal(webLab.includes(forbidden), false, `Spatial Import Lab must not upload or network-fetch imported user files: ${forbidden}`);
}

console.log('PASS spatial import privacy/authority boundary: authenticated local inspection, provider-neutral comparison, no network upload, no canonical persistence mutation');
