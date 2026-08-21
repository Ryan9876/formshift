import React from 'react';
import { View, Text } from 'react-native';
import { sceneFeatureFlags } from './featureFlags';

export function SceneIntelligencePanel(_props: {
  photoUrl?: string | null;
  projectId?: string;
  spaceId?: string;
}) {
  if (!sceneFeatureFlags().sceneIntelligenceV1) return null;
  return (
    <View style={{ padding: 12, borderRadius: 14, backgroundColor: 'rgba(250,249,246,.92)' }}>
      <Text style={{ fontSize: 12, fontWeight: '700' }}>Scene intelligence preview</Text>
      <Text style={{ marginTop: 4, fontSize: 11, lineHeight: 16 }}>Local Depth Anything inference is enabled on web first. iOS will use the same scene contract through the native RoomPlan/RealityKit path in a later cycle.</Text>
    </View>
  );
}
