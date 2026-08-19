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
    if (action.type === 'rotate') objects[index] = { ...current, transform: { ...current.transform, rotation: { ...action.rotation } } };
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
