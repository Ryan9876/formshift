import type { LayoutAction, SpatialObject, SpatialSnapshot, Vector3Mm } from './types.js';

export const canonicalCoordinateSystem = Object.freeze({
  handedness: 'right' as const,
  upAxis: 'y' as const,
  floorPlane: 'xz' as const,
  unit: 'mm' as const,
});

export function createEmptySnapshot(spaceId: string): SpatialSnapshot {
  if (!spaceId.trim()) throw new Error('spaceId is required');
  return {
    schemaVersion: 'spatial-1',
    coordinateSystem: canonicalCoordinateSystem,
    spaceId,
    boundary: { floorPolygon: [] },
    objects: [],
    openings: [],
    constraints: [],
    measurementRefs: [],
  };
}

export function moveObject(snapshot: SpatialSnapshot, objectId: string, to: Vector3Mm): SpatialSnapshot {
  const target = snapshot.objects.find((item) => item.id === objectId);
  if (!target) throw new Error(`object not found: ${objectId}`);
  if (!target.movable) throw new Error(`object is fixed: ${objectId}`);
  return applyActions(snapshot, [{ type: 'move', objectId, to }]);
}

export function applyActions(snapshot: SpatialSnapshot, actions: LayoutAction[]): SpatialSnapshot {
  let objects = snapshot.objects.map(cloneObject);
  for (const action of actions) {
    if (action.type === 'add') {
      if (objects.some((x) => x.id === action.object.id)) throw new Error(`duplicate object id: ${action.object.id}`);
      objects.push(cloneObject(action.object));
      continue;
    }
    const index = objects.findIndex((x) => x.id === action.objectId);
    if (index < 0) throw new Error(`object not found: ${action.objectId}`);
    const current = objects[index]!;
    if (!current.movable && (action.type === 'move' || action.type === 'rotate' || action.type === 'remove')) {
      throw new Error(`object is fixed: ${action.objectId}`);
    }
    if (action.type === 'move') objects[index] = { ...current, transform: { ...current.transform, translation: { ...action.to } } };
    if (action.type === 'rotate') objects[index] = { ...current, transform: { ...current.transform, rotation: { ...action.rotation } };
    if (action.type === 'remove') objects = objects.filter((x) => x.id !== action.objectId);
  }
  return { ...snapshot, objects };
}

export function validateLayoutActions(snapshot: SpatialSnapshot, actions: LayoutAction[]): string[] {
  const errors: string[] = [];
  const xs = snapshot.boundary.floorPolygon.map((point) => point.x);
  const zs = snapshot.boundary.floorPolygon.map((point) => point.z);
  const bounds = xs.length >= 3 && zs.length >= 3
    ? { minX: Math.min(...xs), maxX: Math.max(...xs), minZ: Math.min(...zs), maxZ: Math.max(...zs) }
    : null;

  for (const action of actions) {
    if (action.type === 'add') {
      if (snapshot.objects.some((object) => object.id === action.object.id)) errors.push(`duplicate object id: ${action.object.id}`);
      continue;
    }
    const object = snapshot.objects.find((candidate) => candidate.id === action.objectId);
    if (!object) { errors.push(`unknown object id: ${action.objectId}`); continue; }
    if (!object.movable) errors.push(`fixed object cannot be changed: ${action.objectId}`);
    if (action.type === 'move') {
      if (![action.to.x, action.to.y, action.to.z].every(Number.isFinite)) errors.push(`non-finite move coordinate: ${action.objectId}`);
      if (bounds) {
        const halfWidth = object.dimensions.width / 2;
        const halfDepth = object.dimensions.depth / 2;
        if (action.to.x - halfWidth < bounds.minX || action.to.x + halfWidth > bounds.maxX || action.to.z - halfDepth < bounds.minZ || action.to.z + halfDepth > bounds.maxZ) {
          errors.push(`move leaves room bounding envelope: ${action.objectId}`);
        }
      }
    }
    if (action.type === 'rotate') {
      const q = action.rotation;
      const norm = Math.hypot(q.x, q.y, q.z, q.w);
      if (!Number.isFinite(norm) || Math.abs(norm - 1) > 0.02) errors.push(`rotation quaternion is not normalized: ${action.objectId}`);
    }
  }
  return errors;
}

export function validateOrganizeActions(snapshot: SpatialSnapshot, actions: LayoutAction[]): string[] {
  const errors = [...validateLayoutActions(snapshot, actions)];
  const changed = new Set<string>();

  for (const action of actions) {
    if (action.type !== 'move') {
      errors.push(`organize currently supports move actions only: ${action.type}`);
      continue;
    }
    if (changed.has(action.objectId)) errors.push(`duplicate organize action for object: ${action.objectId}`);
    changed.add(action.objectId);

    const object = snapshot.objects.find((candidate) => candidate.id === action.objectId);
    if (object && Math.abs(action.to.y - object.transform.translation.y) > 0.001) {
      errors.push(`organize move cannot change vertical position: ${action.objectId}`);
    }
  }

  if (errors.length > 0) return Array.from(new Set(errors));

  let proposed: SpatialSnapshot;
  try {
    proposed = applyActions(snapshot, actions);
  } catch (error) {
    return [error instanceof Error ? error.message : 'organize actions could not be applied'];
  }

  const boundary = snapshot.boundary.floorPolygon;
  if (boundary.length >= 3) {
    for (const object of proposed.objects) {
      if (footprintCorners(object).some((point) => !pointInPolygon(point, boundary))) {
        errors.push(`proposal leaves room floor polygon: ${object.id}`);
      }
    }
  }

  const beforeCollisions = new Set(floorCollisionPairs(snapshot));
  for (const pair of floorCollisionPairs(proposed)) {
    if (!beforeCollisions.has(pair)) errors.push(`proposal creates object collision: ${pair}`);
  }

  for (const before of snapshot.objects) {
    const after = proposed.objects.find((candidate) => candidate.id === before.id);
    if (!after) {
      errors.push(`organize cannot remove objects: ${before.id}`);
      continue;
    }
    if (!physicalDimensionsEqual(before, after)) errors.push(`organize changed physical dimensions: ${before.id}`);
  }

  return Array.from(new Set(errors));
}

export function validateBuildObjectPlacement(snapshot: SpatialSnapshot, object: SpatialObject): string[] {
  const errors: string[] = [];
  if (snapshot.objects.some((candidate) => candidate.id === object.id)) errors.push(`duplicate object id: ${object.id}`);
  if (object.dimensions.width <= 0 || object.dimensions.height <= 0 || object.dimensions.depth <= 0) {
    errors.push(`invalid dimensions: ${object.id}`);
    return errors;
  }
  if (Math.abs(object.transform.translation.y - object.dimensions.height / 2) > 1) {
    errors.push(`build object must sit on the floor plane: ${object.id}`);
  }
  if (snapshot.boundary.ceilingHeightMm != null
    && object.transform.translation.y + object.dimensions.height / 2 > snapshot.boundary.ceilingHeightMm + 0.001) {
    errors.push(`build exceeds room ceiling height: ${object.id}`);
  }
  const footprint = footprintCorners(object);
  if (snapshot.boundary.floorPolygon.length >= 3
    && footprint.some((point) => !pointInPolygon(point, snapshot.boundary.floorPolygon))) {
    errors.push(`build leaves room floor polygon: ${object.id}`);
  }
  for (const existing of snapshot.objects) {
    if (polygonsOverlap(footprint, footprintCorners(existing))) errors.push(`build collides with object: ${existing.id}`);
  }
  return Array.from(new Set(errors));
}

export function validateSnapshot(snapshot: SpatialSnapshot): string[] {
  const errors: string[] = [];
  if (snapshot.schemaVersion !== 'spatial-1') errors.push('unsupported schemaVersion');
  if (snapshot.coordinateSystem.unit !== 'mm') errors.push('canonical unit must be mm');
  const ids = new Set<string>();
  for (const object of snapshot.objects) {
    if (ids.has(object.id)) errors.push(`duplicate object id: ${object.id}`);
    ids.add(object.id);
    if (object.dimensions.width <= 0 || object.dimensions.height <= 0 || object.dimensions.depth <= 0) {
      errors.push(`invalid dimensions: ${object.id}`);
    }
  }
  return errors;
}

export function physicalDimensionsEqual(a: SpatialObject, b: SpatialObject, epsilonMm = 0.001): boolean {
  return Math.abs(a.dimensions.width - b.dimensions.width) <= epsilonMm
    && Math.abs(a.dimensions.height - b.dimensions.height) <= epsilonMm
    && Math.abs(a.dimensions.depth - b.dimensions.depth) <= epsilonMm;
}

function floorCollisionPairs(snapshot: SpatialSnapshot): string[] {
  const pairs: string[] = [];
  for (let i = 0; i < snapshot.objects.length; i += 1) {
    for (let j = i + 1; j < snapshot.objects.length; j += 1) {
      const a = snapshot.objects[i]!;
      const b = snapshot.objects[j]!;
      if (polygonsOverlap(footprintCorners(a), footprintCorners(b))) {
        pairs.push([a.id, b.id].sort().join(' <> '));
      }
    }
  }
  return pairs.sort();
}

function footprintCorners(object: SpatialObject) {
  const halfW = object.dimensions.width / 2;
  const halfD = object.dimensions.depth / 2;
  const q = object.transform.rotation;
  const yaw = Math.atan2(2 * (q.w * q.y + q.x * q.z), 1 - 2 * (q.y * q.y + q.z * q.z));
  const cos = Math.cos(yaw);
  const sin = Math.sin(yaw);
  return [
    { x: -halfW, z: -halfD },
    { x: halfW, z: -halfD },
    { x: halfW, z: halfD },
    { x: -halfW, z: halfD },
  ].map((point) => ({
    x: object.transform.translation.x + point.x * cos - point.z * sin,
    z: object.transform.translation.z + point.x * sin + point.z * cos,
  }));
}

function polygonsOverlap(a: Array<{ x: number; z: number }>, b: Array<{ x: number; z: number }>) {
  const epsilon = 0.001;
  for (const polygon of [a, b]) {
    for (let i = 0; i < polygon.length; i += 1) {
      const p1 = polygon[i]!;
      const p2 = polygon[(i + 1) % polygon.length]!;
      const axis = { x: -(p2.z - p1.z), z: p2.x - p1.x };
      const aProjection = a.map((point) => point.x * axis.x + point.z * axis.z);
      const bProjection = b.map((point) => point.x * axis.x + point.z * axis.z);
      if (Math.max(...aProjection) <= Math.min(...bProjection) + epsilon
        || Math.max(...bProjection) <= Math.min(...aProjection) + epsilon) return false;
    }
  }
  return true;
}

function pointInPolygon(point: { x: number; z: number }, polygon: Array<{ x: number; z: number }>) {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i, i += 1) {
    const a = polygon[i]!;
    const b = polygon[j]!;
    if (pointOnSegment(point, a, b)) return true;
    const intersects = ((a.z > point.z) !== (b.z > point.z))
      && point.x < ((b.x - a.x) * (point.z - a.z)) / (b.z - a.z) + a.x;
    if (intersects) inside = !inside;
  }
  return inside;
}

function pointOnSegment(point: { x: number; z: number }, a: { x: number; z: number }, b: { x: number; z: number }) {
  const cross = (point.z - a.z) * (b.x - a.x) - (point.x - a.x) * (b.z - a.z);
  if (Math.abs(cross) > 0.001) return false;
  const dot = (point.x - a.x) * (b.x - a.x) + (point.z - a.z) * (b.z - a.z);
  if (dot < -0.001) return false;
  const squaredLength = (b.x - a.x) ** 2 + (b.z - a.z) ** 2;
  return dot <= squaredLength + 0.001;
}

function cloneObject(value: SpatialObject): SpatialObject {
  return {
    ...value,
    dimensions: { ...value.dimensions },
    transform: {
      translation: { ...value.transform.translation },
      rotation: { ...value.transform.rotation },
    },
  };
}
