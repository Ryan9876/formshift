import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '../auth/AuthProvider';
import { tokens } from '../theme/tokens';
import { buildSceneAnalysis, confirmFloorSurface } from './analysis';
import { sceneFeatureFlags } from './featureFlags';
import { persistSceneAnalysis } from './persistence';
import { createDepthProvider } from './providers/DepthAnythingV2Small';
import type { SceneAnalysis } from './types';

export function SceneIntelligencePanel({
  photoUrl,
  projectId,
  spaceId,
}: {
  photoUrl?: string | null;
  projectId?: string;
  spaceId?: string;
}) {
  const flags = sceneFeatureFlags();
  const auth = useAuth();
  const provider = useMemo(() => createDepthProvider(), []);
  const [analysis, setAnalysis] = useState<SceneAnalysis | null>(null);
  const [state, setState] = useState<'idle' | 'loading' | 'ready' | 'saving' | 'saved' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);

  if (!flags.sceneIntelligenceV1) return null;

  const analyze = async () => {
    if (!photoUrl || !provider.isSupported()) return;
    setState('loading');
    setError(null);
    try {
      const depth = await provider.estimate(photoUrl);
      setAnalysis(buildSceneAnalysis(photoUrl, depth));
      setState('ready');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Scene analysis failed.');
      setState('error');
    }
  };

  const confirmFloor = () => {
    if (!analysis) return;
    setAnalysis(confirmFloorSurface(analysis));
    if (state === 'saved') setState('ready');
  };

  const save = async () => {
    if (!analysis || !projectId || !spaceId || !auth.session?.user.id) return;
    setState('saving');
    setError(null);
    try {
      await persistSceneAnalysis({ projectId, spaceId, userId: auth.session.user.id, analysis });
      setState('saved');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Scene analysis could not be saved.');
      setState('error');
    }
  };

  const floor = analysis?.surfaces.find((surface) => surface.kind === 'floor');

  return (
    <View style={styles.card}>
      <View style={styles.headingRow}>
        <View style={styles.copy}>
          <Text style={styles.eyebrow}>SCENE INTELLIGENCE V1</Text>
          <Text style={styles.title}>Understand depth without changing room measurements.</Text>
          <Text style={styles.body}>Depth Anything V2 Small runs locally in this browser. Its relative depth and support hints are derived evidence only; canonical dimensions remain untouched.</Text>
        </View>
        <View style={styles.badge}><Text style={styles.badgeText}>Estimated augmentation</Text></View>
      </View>

      {!analysis ? (
        <Pressable disabled={!photoUrl || state === 'loading'} style={[styles.primary, (!photoUrl || state === 'loading') && styles.disabled]} onPress={() => void analyze()}>
          {state === 'loading' ? <ActivityIndicator color="#fff" size="small" /> : null}
          <Text style={styles.primaryText}>{state === 'loading' ? 'Analyzing locally…' : 'Analyze scene locally'}</Text>
        </Pressable>
      ) : (
        <>
          <View style={styles.metrics}>
            <Metric label="Depth model" value="Depth Anything V2 Small" />
            <Metric label="Processing" value={`${analysis.depth?.processingMs ?? 0} ms`} />
            <Metric label="Support" value={floor?.source === 'user_confirmed' ? 'Floor confirmed' : 'Floor candidate'} />
          </View>

          {flags.depthDiagnostics && analysis.depth?.depthDataUrl ? (
            <View style={styles.diagnostic}>
              <Image source={{ uri: analysis.depth.depthDataUrl }} resizeMode="cover" style={styles.depthImage} />
              <Text style={styles.diagnosticText}>Diagnostic relative-depth map. Brighter/darker values are model-relative and are not physical distance.</Text>
            </View>
          ) : null}

          <View style={styles.actionRow}>
            {floor?.source !== 'user_confirmed' ? (
              <Pressable style={styles.secondary} onPress={confirmFloor}><Text style={styles.secondaryText}>Confirm floor region</Text></Pressable>
            ) : null}
            <Pressable disabled={state === 'saving' || state === 'saved' || !projectId || !spaceId || !auth.session} style={[styles.primarySmall, (state === 'saving' || state === 'saved' || !projectId || !spaceId || !auth.session) && styles.disabled]} onPress={() => void save()}>
              <Text style={styles.primaryText}>{state === 'saving' ? 'Saving…' : state === 'saved' ? 'Scene saved' : 'Save derived scene'}</Text>
            </Pressable>
            <Pressable style={styles.tertiary} onPress={() => { setAnalysis(null); setState('idle'); setError(null); }}><Text style={styles.tertiaryText}>Re-run</Text></Pressable>
          </View>
        </>
      )}

      {state === 'loading' ? <Text style={styles.note}>The first run downloads the pinned model weights. The room image is processed in-browser; model weights are fetched separately.</Text> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return <View style={styles.metric}><Text style={styles.metricLabel}>{label}</Text><Text style={styles.metricValue}>{value}</Text></View>;
}

const styles = StyleSheet.create({
  card: { padding: 14, borderRadius: 18, backgroundColor: 'rgba(250,249,246,.94)', borderWidth: 1, borderColor: tokens.color.line, gap: 10 },
  headingRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' },
  copy: { flex: 1, minWidth: 240 },
  eyebrow: { fontSize: 9, fontWeight: '800', letterSpacing: 1.1, color: tokens.color.peach },
  title: { marginTop: 5, fontSize: 14, fontWeight: '800', color: tokens.color.text },
  body: { marginTop: 4, fontSize: 11, lineHeight: 16, color: tokens.color.muted },
  badge: { paddingHorizontal: 9, paddingVertical: 6, borderRadius: 999, backgroundColor: 'rgba(154,107,50,.10)', borderWidth: 1, borderColor: 'rgba(154,107,50,.22)' },
  badgeText: { fontSize: 9, fontWeight: '800', color: '#865B2A' },
  primary: { minHeight: 44, paddingHorizontal: 14, borderRadius: 12, backgroundColor: tokens.color.blue, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  primarySmall: { minHeight: 44, paddingHorizontal: 13, borderRadius: 12, backgroundColor: tokens.color.blue, alignItems: 'center', justifyContent: 'center' },
  primaryText: { color: '#fff', fontSize: 11, fontWeight: '800' },
  secondary: { minHeight: 44, paddingHorizontal: 13, borderRadius: 12, borderWidth: 1, borderColor: tokens.color.line, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  secondaryText: { fontSize: 11, fontWeight: '800', color: tokens.color.text },
  tertiary: { minHeight: 44, paddingHorizontal: 10, alignItems: 'center', justifyContent: 'center' },
  tertiaryText: { fontSize: 11, fontWeight: '800', color: tokens.color.blue },
  actionRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', alignItems: 'center' },
  metrics: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  metric: { minWidth: 135, flex: 1, padding: 10, borderRadius: 12, backgroundColor: 'rgba(255,255,255,.68)', borderWidth: 1, borderColor: tokens.color.line },
  metricLabel: { fontSize: 9, fontWeight: '700', color: tokens.color.muted },
  metricValue: { marginTop: 3, fontSize: 11, fontWeight: '800', color: tokens.color.text },
  diagnostic: { gap: 5 },
  depthImage: { width: '100%', aspectRatio: 16 / 9, borderRadius: 12, backgroundColor: '#DADADA' },
  diagnosticText: { fontSize: 9, lineHeight: 13, color: tokens.color.muted },
  note: { fontSize: 9, lineHeight: 13, color: tokens.color.muted },
  error: { fontSize: 10, lineHeight: 15, color: '#A84C4C' },
  disabled: { opacity: .5 },
});
