import type { SpatialSnapshot } from '@formshift/domain';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { PlanCanvas } from './PlanCanvas';
import { tokens } from '../theme/tokens';

export function PhotoArrangeEditor({ snapshot, onSnapshotChange }: { photoUrl?: string | null; snapshot: SpatialSnapshot; onSnapshotChange?: (snapshot: SpatialSnapshot) => void; projectId?: string; spaceId?: string; baseSpatialVersionId?: string | null }) {
  return (
    <View style={styles.shell}>
      <Text style={styles.title}>Photo object editing is available in the web workspace.</Text>
      <Text style={styles.body}>Native iOS segmentation will use the same scene contract in a later release. The measured Plan editor remains available here.</Text>
      <PlanCanvas snapshot={snapshot} editable onSnapshotChange={onSnapshotChange} />
    </View>
  );
}

const styles = StyleSheet.create({ shell: { gap: 8 }, title: { fontSize: 15, fontWeight: '800', color: tokens.color.text }, body: { fontSize: 10, lineHeight: 15, color: tokens.color.muted } });
