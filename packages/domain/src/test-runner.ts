import { demoSnapshot } from './fixtures.js';
import { applyActions, physicalDimensionsEqual, validateLayoutActions, validateOrganizeActions, validateSnapshot } from './spatial.js';
import { inchesToMm, mmToInches } from './units.js';

let failures = 0;
function test(name: string, body: () => void): void {
  try { body(); console.log(`PASS ${name}`); }
  catch (error) { failures += 1; console.error(`FAIL ${name}`); console.error(error); }
}
function equal(actual: unknown, expected: unknown, message = ''): void {
  if (!Object.is(actual, expected)) throw new Error(`${message} expected ${String(expected)} got ${String(actual)}`);
}
function near(actual: number, expected: number, epsilon = 1e-9): void {
  if (Math.abs(actual - expected) > epsilon) throw new Error(`expected ${expected} got ${actual}`);
}

test('72 inches converts to exactly 1828.8 canonical mm', () => near(inchesToMm(72), 1828.8));
test('metric/imperial round-trip does not drift canonical value', () => near(inchesToMm(mmToInches(1828.8)), 1828.8));
test('demo snapshot satisfies baseline validator', () => equal(validateSnapshot(demoSnapshot).length, 0));
test('Arrange move changes position but not physical dimensions', () => {
  const before = demoSnapshot.objects.find((x) => x.id === 'desk-1')!;
  const afterSnapshot = applyActions(demoSnapshot, [{ type: 'move', objectId: 'desk-1', to: { x: 2200, y: 381, z: 1200 } }]);
  const after = afterSnapshot.objects.find((x) => x.id === 'desk-1')!;
  equal(physicalDimensionsEqual(before, after), true);
  equal(after.transform.translation.x, 2200);
});
test('fixed objects cannot be moved', () => {
  const snapshot = { ...demoSnapshot, objects: demoSnapshot.objects.map((x) => x.id === 'desk-1' ? { ...x, movable: false } : x) };
  let threw = false;
  try { applyActions(snapshot, [{ type: 'move', objectId: 'desk-1', to: { x: 1, y: 1, z: 1 } }]); } catch { threw = true; }
  equal(threw, true);
});

test('AI/layout validation rejects fixed-object movement', () => {
  const fixed = { ...demoSnapshot.objects[0]!, movable: false };
  const snapshot = { ...demoSnapshot, objects: [fixed, ...demoSnapshot.objects.slice(1)] };
  const errors = validateLayoutActions(snapshot, [{ type: 'move', objectId: fixed.id, to: { x: 1000, y: 0, z: 1000 } }]);
  equal(errors.some((value) => value.includes('fixed object')), true, 'expected fixed-object rejection');
});

test('AI/layout validation rejects moves beyond room envelope', () => {
  const object = demoSnapshot.objects.find((item) => item.movable)!;
  const errors = validateLayoutActions(demoSnapshot, [{ type: 'move', objectId: object.id, to: { x: 999999, y: 0, z: 999999 } }]);
  equal(errors.some((value) => value.includes('room bounding envelope')), true, 'expected room-envelope rejection');
});

test('Organize validation rejects a newly created footprint collision', () => {
  const cabinet = demoSnapshot.objects.find((item) => item.id === 'cabinet-1')!;
  const errors = validateOrganizeActions(demoSnapshot, [{
    type: 'move', objectId: cabinet.id, to: { x: 1500, y: cabinet.transform.translation.y, z: 650 }
  }]);
  equal(errors.some((value) => value.includes('creates object collision')), true, 'expected collision rejection');
});

test('Organize validation preserves vertical placement', () => {
  const object = demoSnapshot.objects[0]!;
  const errors = validateOrganizeActions(demoSnapshot, [{
    type: 'move', objectId: object.id, to: { x: 2200, y: object.transform.translation.y + 100, z: 1200 }
  }]);
  equal(errors.some((value) => value.includes('vertical position')), true, 'expected vertical-position rejection');
});

test('Organize validation rejects rotate actions until accepted by the Organize contract', () => {
  const object = demoSnapshot.objects[0]!;
  const errors = validateOrganizeActions(demoSnapshot, [{
    type: 'rotate', objectId: object.id, rotation: { x: 0, y: 0, z: 0, w: 1 }
  }]);
  equal(errors.some((value) => value.includes('move actions only')), true, 'expected rotate rejection');
});

if (failures > 0) throw new Error(`${failures} domain test(s) failed`);
console.log('All domain tests passed.');
