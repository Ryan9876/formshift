import type { DepthEstimate, SceneAnalysis, SceneSupportSurface } from './types';

export function estimatedFloorSurface(): SceneSupportSurface {
  return {
    id: 'estimated-floor-1',
    kind: 'floor',
    imagePolygon: [
      { x: 0, y: 0.64 },
      { x: 1, y: 0.64 },
      { x: 1, y: 1 },
      { x: 0, y: 1 },
    ],
    confidence: 'estimated',
    source: 'model',
  };
}

export function buildSceneAnalysis(sourcePhotoUrl: string, depth: DepthEstimate): SceneAnalysis {
  return {
    schemaVersion: 'scene-analysis-1',
    sourcePhotoUrl,
    generatedAt: new Date().toISOString(),
    depth: {
      provider: depth.provider,
      model: depth.model,
      modelVersion: depth.modelVersion,
      generatedAt: new Date().toISOString(),
      width: depth.width,
      height: depth.height,
      depthDataUrl: depth.dataUrl,
      confidence: 'estimated',
      processingMs: depth.processingMs,
    },
    surfaces: [estimatedFloorSurface()],
    objects: [],
    confidence: 'estimated',
    notes: [
      'Monocular depth is relative scene evidence, not a physical measurement.',
      'The initial floor region is deliberately conservative and requires calibration or user confirmation before physical-fit use.',
    ],
  };
}

export function confirmFloorSurface(analysis: SceneAnalysis): SceneAnalysis {
  return {
    ...analysis,
    surfaces: analysis.surfaces.map((surface) => surface.kind === 'floor'
      ? { ...surface, source: 'user_confirmed', confidence: 'calibrated' }
      : surface),
    confidence: 'calibrated',
    notes: [...analysis.notes, 'The user confirmed the proposed floor/support region.'],
  };
}

export function sampleDepth(depth: DepthEstimate, x: number, y: number) {
  const px = Math.max(0, Math.min(depth.width - 1, Math.round(x * (depth.width - 1))));
  const py = Math.max(0, Math.min(depth.height - 1, Math.round(y * (depth.height - 1))));
  return (depth.normalized[py * depth.width + px] ?? 0) / 255;
}

export function isPointSupported(analysis: SceneAnalysis, x: number, y: number) {
  return analysis.surfaces.some((surface) => surface.kind === 'floor' && pointInPolygon({ x, y }, surface.imagePolygon));
}

export function shouldSourceOccludeObject(sourceDepth: number, objectDepth: number, tolerance = 0.035) {
  return sourceDepth + tolerance < objectDepth;
}

function pointInPolygon(point: { x: number; y: number }, polygon: { x: number; y: number }[]) {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const a = polygon[i]!;
    const b = polygon[j]!;
    const intersects = ((a.y > point.y) !== (b.y > point.y))
      && point.x < ((b.x - a.x) * (point.y - a.y)) / Math.max(b.y - a.y, 1e-9) + a.x;
    if (intersects) inside = !inside;
  }
  return inside;
}
