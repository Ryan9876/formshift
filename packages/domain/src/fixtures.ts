import type { SpatialObject, SpatialSnapshot } from './types.js';
import { canonicalCoordinateSystem } from './spatial.js';
import { feetAndInchesToMm, inchesToMm } from './units.js';

export const demoDesk: SpatialObject = {
  id: 'desk-1',
  label: 'Desk',
  category: 'desk',
  movable: true,
  measurementState: 'user_confirmed',
  dimensions: { width: inchesToMm(60), height: inchesToMm(30), depth: inchesToMm(30) },
  transform: { translation: { x: 1300, y: 381, z: 650 }, rotation: { x: 0, y: 0, z: 0, w: 1 } },
};

export const demoCabinet: SpatialObject = {
  id: 'cabinet-1',
  label: 'Storage',
  category: 'cabinet',
  movable: true,
  measurementState: 'measured',
  dimensions: { width: inchesToMm(42), height: inchesToMm(72), depth: inchesToMm(18) },
  transform: { translation: { x: 3200, y: 914.4, z: 700 }, rotation: { x: 0, y: 0, z: 0, w: 1 } },
};

export const demoSnapshot: SpatialSnapshot = {
  schemaVersion: 'spatial-1',
  coordinateSystem: canonicalCoordinateSystem,
  spaceId: 'demo-room',
  boundary: {
    ceilingHeightMm: inchesToMm(96),
    floorPolygon: [
      { x: 0, z: 0 },
      { x: feetAndInchesToMm(14, 0), z: 0 },
      { x: feetAndInchesToMm(14, 0), z: feetAndInchesToMm(11, 0) },
      { x: 0, z: feetAndInchesToMm(11, 0) },
    ],
  },
  objects: [demoDesk, demoCabinet],
  openings: [],
  constraints: [],
  measurementRefs: ['room-width', 'room-depth', 'desk-width', 'cabinet-width'],
};
