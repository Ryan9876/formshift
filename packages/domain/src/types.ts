export type Millimeters = number;
export type SpatialSchemaVersion = 'spatial-1';
export type MeasurementState = 'estimated' | 'measured' | 'user_confirmed' | 'invalidated';
export type MeasurementSource =
  | 'manual_verified'
  | 'manual_unverified'
  | 'ios_roomplan'
  | 'scale_reference_derived'
  | 'photo_estimate'
  | 'imported'
  | 'build_derived';

export type Mode = 'organize' | 'arrange' | 'build';

export interface Vector3Mm { x: Millimeters; y: Millimeters; z: Millimeters }
export interface Quaternion { x: number; y: number; z: number; w: number }
export interface TransformMm { translation: Vector3Mm; rotation: Quaternion }
export interface DimensionsMm { width: Millimeters; height: Millimeters; depth: Millimeters }

export interface SpaceBoundary {
  floorPolygon: Array<{ x: Millimeters; z: Millimeters }>;
  ceilingHeightMm?: Millimeters;
}

export interface SpatialObject {
  id: string;
  label: string;
  category: string;
  movable: boolean;
  transform: TransformMm;
  dimensions: DimensionsMm;
  measurementState: MeasurementState;
}

export interface Opening {
  id: string;
  kind: 'door' | 'window' | 'pass_through' | 'other';
  wallId: string;
  widthMm: Millimeters;
  heightMm: Millimeters;
  sillHeightMm?: Millimeters;
  transform: TransformMm;
  swingRadiusMm?: Millimeters;
}

export interface Constraint {
  id: string;
  kind: 'fixed_object' | 'keep_out' | 'minimum_clearance' | 'opening_path' | 'build_envelope' | 'user_preference';
  severity: 'hard' | 'soft' | 'informational';
  entityIds: string[];
  minimumMm?: Millimeters;
  explanation: string;
  origin: 'user' | 'system' | 'ai_proposed';
}

export interface MeasurementObservation {
  id: string;
  entityId?: string;
  dimensionKey: string;
  valueMm: Millimeters;
  source: MeasurementSource;
  toleranceMm?: Millimeters;
  confidence?: number;
  verificationState: MeasurementState;
  supersedesMeasurementId?: string;
}

export interface SpatialSnapshot {
  schemaVersion: SpatialSchemaVersion;
  coordinateSystem: {
    handedness: 'right';
    upAxis: 'y';
    floorPlane: 'xz';
    unit: 'mm';
  };
  spaceId: string;
  boundary: SpaceBoundary;
  objects: SpatialObject[];
  openings: Opening[];
  constraints: Constraint[];
  measurementRefs: string[];
}

export type LayoutAction =
  | { type: 'move'; objectId: string; to: Vector3Mm }
  | { type: 'rotate'; objectId: string; rotation: Quaternion }
  | { type: 'add'; object: SpatialObject }
  | { type: 'remove'; objectId: string };

export interface OrganizeProposal {
  proposalId: string;
  title: string;
  rationale: string;
  actions: LayoutAction[];
  assumptions: string[];
  expectedBenefits: string[];
}
