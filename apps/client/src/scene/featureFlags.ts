export type SceneFeatureFlags = {
  sceneIntelligenceV1: boolean;
  depthDiagnostics: boolean;
};

function enabled(value: string | undefined) {
  return value === '1' || value?.toLowerCase() === 'true';
}

export function sceneFeatureFlags(): SceneFeatureFlags {
  return {
    sceneIntelligenceV1: enabled(process.env.EXPO_PUBLIC_SCENE_INTELLIGENCE_V1),
    depthDiagnostics: enabled(process.env.EXPO_PUBLIC_SCENE_DEPTH_DIAGNOSTICS),
  };
}
