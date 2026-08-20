import type { SpatialObject, SpatialSnapshot } from './types.js';

export function validateBuildObjectPlacement(snapshot: SpatialSnapshot, object: SpatialObject): string[] {
  const errors: string[] = [];
  const epsilon = 0.001;

  if (snapshot.objects.some((candidate) => candidate.id === object.id)) errors.push(`duplicate object id: ${object.id}`);
  if (object.dimensions.width <= 0 || object.dimensions.height <= 0 || object.dimensions.depth <= 0) {
    errors.push(`invalid dimensions: ${object.id}`);
    return errors;
  }
  if (Math.abs(object.transform.translation.y - object.dimensions.height / 2) > 1) {
    errors.push(`build object must sit on the floor plane: ${object.id}`);
  }
  if (snapshot.boundary.ceilingHeightMm != null
    && object.transform.translation.y + object.dimensions.height / 2 > snapshot.boundary.ceilingHeightMm + epsilon) {
    errors.push(`build exceeds room ceiling height: ${object.id}`);
  }

  const footprint = footprintCorners(object);
  if (snapshot.boundary.floorPolygon.length >= 3
    && footprint.some((point) => !pointInPolygon(point, snapshot.boundary.floorPolygon))) {
    errors.push(`build leaves room floor polygon: ${object.id}`);
  }

  for (const existing of snapshot.objects) {
    if (polygonsOverlap(footprint, footprintCorners(existing))) {
      errors.push(`build collides with object: ${existing.id}`);
    }
  }

  return Array.from(new Set(errors));
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
