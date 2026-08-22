export type SceneFeatureFlags = {
  sceneIntelligenceV1: boolean;
  depthDiagnostics: boolean;
  preparedSceneV1: boolean;
};

function enabled(value: string | undefined) {
  return value === '1' || value?.toLowerCase() === 'true';
}

function queryEnabled(name: string) {
  if (typeof window === 'undefined') return false;
  return new URLSearchParams(window.location.search).get(name) === '1';
}

export function sceneFeatureFlags(): SceneFeatureFlags {
  return {
    sceneIntelligenceV1: enabled(process.env.EXPO_PUBLIC_SCENE_INTELLIGENCE_V1),
    depthDiagnostics: enabled(process.env.EXPO_PUBLIC_SCENE_DEPTH_DIAGNOSTICS),
    preparedSceneV1: enabled(process.env.EXPO_PUBLIC_PREPARED_SCENE_V1) || queryEnabled('prepared'),
  };
}
