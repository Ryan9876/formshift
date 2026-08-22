import type { SpatialSnapshot } from '@formshift/domain';
import React from 'react';
import { Text, View } from 'react-native';
import { tokens } from '../theme/tokens';

export function PreparedSceneEditor(_props: { photoUrl?: string | null; snapshot: SpatialSnapshot; projectId?: string; spaceId?: string }) {
  return (
    <View style={{ minHeight: 360, padding: 28, alignItems: 'center', justifyContent: 'center', borderRadius: 22, borderWidth: 1, borderColor: tokens.color.line, backgroundColor: 'rgba(255,255,255,.72)' }}>
      <Text style={{ fontSize: 16, fontWeight: '800', color: tokens.color.text }}>Prepared Scene preview is web-first.</Text>
      <Text style={{ marginTop: 6, maxWidth: 430, textAlign: 'center', fontSize: 11, lineHeight: 16, color: tokens.color.muted }}>The native iOS path will consume the same Prepared Scene contract after the browser pipeline is validated.</Text>
    </View>
  );
}
