import type { SpatialSnapshot } from '@formshift/domain';

export type SpatialImportSchemaVersion = 'spatial-import-1';
export type SpatialImportFormat = 'gltf' | 'glb' | 'roomplan-json' | 'zip-inventory' | 'unknown-json' | 'unsupported';
export type SpatialImportProvider = 'polycam' | 'apple-roomplan' | 'generic-gltf' | 'unknown';
export type SpatialImportConfidence = 'inventory' | 'structural' | 'measured-candidate';

export type BoundsMeters = {
  min: [number, number, number];
  max: [number, number, number];
  size: [number, number, number];
  center: [number, number, number];
};

export type SpatialImportEvidence = {
  schemaVersion: SpatialImportSchemaVersion;
  source: {
    provider: SpatialImportProvider;
    format: SpatialImportFormat;
    fileName: string;
    sizeBytes: number;
    mimeType?: string;
  };
  coordinateSystem: {
    unit: 'm' | 'unknown';
    handedness: 'right' | 'unknown';
    upAxis: 'y' | 'unknown';
  };
  confidence: SpatialImportConfidence;
  canonicalMutationAllowed: false;
  mesh?: {
    assetVersion?: string;
    sceneCount: number;
    nodeCount: number;
    meshCount: number;
    primitiveCount: number;
    positionVertexCount?: number;
    materialCount: number;
    imageCount: number;
    boundsMeters?: BoundsMeters;
    boundsBasis?: 'accessor-minmax-with-node-transforms' | 'accessor-minmax-local-only';
  };
  floorplan?: {
    identifier?: string;
    version?: number;
    story?: number;
    walls: number;
    floors: number;
    doors: number;
    windows: number;
    openings: number;
    objects: number;
    sections: number;
    highConfidenceItems: number;
    mediumConfidenceItems: number;
    lowConfidenceItems: number;
    categories: Record<string, number>;
    boundsMeters?: BoundsMeters;
    floorPolygonPointCount: number;
  };
  archive?: {
    entryCount: number;
    keyframeImageCount: number;
    likelyDepthEntryCount: number;
    likelyConfidenceEntryCount: number;
    likelyCameraEntryCount: number;
    sampleEntries: string[];
  };
  warnings: string[];
  notes: string[];
};

export type SpatialImportComparison = {
  importHasMetricBounds: boolean;
  canonicalHasBoundary: boolean;
  importBoundsMeters?: BoundsMeters;
  canonicalBoundsMeters?: BoundsMeters;
  spanDeltaMeters?: { x: number; y?: number; z: number };
  objectCountDelta?: number;
  openingCountDelta?: number;
  conclusions: string[];
};

export type SpatialImportInspectionInput = {
  fileName: string;
  sizeBytes: number;
  mimeType?: string;
  bytes: Uint8Array;
};

export type SpatialImportInspector = {
  id: string;
  inspect(input: SpatialImportInspectionInput): SpatialImportEvidence;
};

export type SpatialImportBenchmark = {
  evidence: SpatialImportEvidence;
  comparison: SpatialImportComparison | null;
  snapshot?: SpatialSnapshot | null;
};
