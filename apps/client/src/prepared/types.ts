export type PreparedObjectMobility = 'movable' | 'conditional' | 'fixed';
export type PreparedSupportKind = 'floor' | 'wall' | 'surface' | 'unknown';

export type PreparedBox = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type PreparedSceneObject = {
  id: string;
  label: string;
  detectionScore: number;
  mobility: PreparedObjectMobility;
  expectedSupport: PreparedSupportKind;
  bbox: PreparedBox;
  maskDataUrl: string;
  cutoutDataUrl: string;
  position: { x: number; y: number };
  scale: number;
  rotationDeg: number;
  approximateDepth?: number;
  source: 'automatic' | 'user_added';
};

export type ObjectDetectionCandidate = {
  label: string;
  score: number;
  box: { xmin: number; ymin: number; xmax: number; ymax: number };
};

export type PreparedScene = {
  schemaVersion: 'prepared-scene-1';
  sourcePhotoUrl: string;
  generatedAt: string;
  imageWidth: number;
  imageHeight: number;
  cleanBackgroundDataUrl: string;
  objects: PreparedSceneObject[];
  detector: { provider: string; model: string; modelVersion: string; processingMs: number };
  depth?: { provider: string; model: string; modelVersion: string; processingMs: number };
  notes: string[];
};
