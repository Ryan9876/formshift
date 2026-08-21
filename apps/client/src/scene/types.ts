export type SceneConfidence = 'unknown' | 'estimated' | 'calibrated' | 'measured';

export type ScenePoint = { x: number; y: number };

export type SceneDepthArtifact = {
  provider: string;
  model: string;
  modelVersion: string;
  generatedAt: string;
  width: number;
  height: number;
  depthDataUrl: string;
  confidence: SceneConfidence;
  processingMs: number;
};

export type SceneSupportSurface = {
  id: string;
  kind: 'floor' | 'wall' | 'tabletop' | 'shelf' | 'unknown';
  imagePolygon: ScenePoint[];
  confidence: SceneConfidence;
  source: 'model' | 'device' | 'user_confirmed';
};

export type SceneObjectEvidence = {
  id: string;
  semanticType?: string;
  approximateDepth?: number;
  supportSurfaceId?: string;
  confidence: SceneConfidence;
};

export type SceneAnalysis = {
  schemaVersion: 'scene-analysis-1';
  sourcePhotoUrl: string;
  sourceCaptureId?: string;
  generatedAt: string;
  depth?: SceneDepthArtifact;
  surfaces: SceneSupportSurface[];
  objects: SceneObjectEvidence[];
  confidence: SceneConfidence;
  notes: string[];
};

export type DepthEstimate = {
  width: number;
  height: number;
  normalized: Uint8ClampedArray;
  dataUrl: string;
  provider: string;
  model: string;
  modelVersion: string;
  processingMs: number;
};
