import type { SpatialSnapshot } from '@formshift/domain';
import { router } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { formatBuildInches, useBuildPlanner } from '../data/useBuildPlanner';
import { tokens } from '../theme/tokens';

export function BuildIntelligenceCard({
  projectId,
  spaceId,
  activeVersionId,
  snapshot,
  previewSnapshot,
  measurementSummary,
  onPreviewChange,
  onAccepted,
}: {
  projectId?: string;
  spaceId?: string;
  activeVersionId?: string | null;
  snapshot?: SpatialSnapshot | null;
  previewSnapshot: SpatialSnapshot | null;
  measurementSummary: 'needs_dimensions' | 'estimated' | 'measured' | 'mixed';
  onPreviewChange: (snapshot: SpatialSnapshot | null) => void;
  onAccepted: () => Promise<void>;
}) {
  const planner = useBuildPlanner({
    projectId,
    spaceId,
    activeVersionId,
    snapshot,
    previewSnapshot,
    onPreviewChange,
    onAccepted,
  });

  if (!snapshot) {
    return (
      <View style={styles.card}>
        <Text style={styles.eyebrow}>BUILD INTELLIGENCE</Text>
        <Text style={styles.title}>Measure the room first.</Text>
        <Text style={styles.body}>Build placement requires committed room geometry.</Text>
      </View>
    );
  }

  const plan = planner.currentPlan;

  return (
    <View style={styles.card}>
      <View style={styles.topRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.eyebrow}>BUILD INTELLIGENCE · CLASS A</Text>
          <Text style={styles.title}>Make what the space needs.</Text>
        </View>
        <View style={styles.statusDot} />
      </View>
      <Text style={styles.body}>
        Describe a freestanding shelving/storage build. FormShift keeps AI at the brief layer and computes geometry,
        fit, materials, cost and effort deterministically.
      </Text>

      <Pressable style={styles.workspaceButton} onPress={() => router.push('/build')}>
        <Text style={styles.workspaceButtonTitle}>Open full Build workspace</Text>
        <Text style={styles.workspaceButtonMeta}>Room fit · cut list · materials · effort · blueprints</Text>
      </Pressable>

      <View style={styles.divider} />

      <TextInput
        value={planner.brief}
        onChangeText={planner.setBrief}
        multiline
        editable={!planner.accepting}
        style={styles.brief}
        placeholder="Build a freestanding shelving unit..."
        placeholderTextColor="#8B8E88"
      />
      <Pressable
        disabled={planner.normalizing || planner.accepting}
        onPress={() => void planner.normalizeBrief()}
        style={[styles.primary, (planner.normalizing || planner.accepting) && styles.disabled]}
      >
        <Text style={styles.primaryText}>
          {planner.normalizing ? 'Understanding request…' : planner.normalized ? 'Re-read request' : 'Start build plan'}
        </Text>
      </Pressable>

      {planner.savedMessage ? <Text style={styles.success}>{planner.savedMessage}</Text> : null}
      {planner.error ? <Text style={styles.error}>{planner.error}</Text> : null}

      {planner.normalized ? (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{planner.normalized.label || 'Open shelving'}</Text>
            <Text style={styles.classPill}>Class A</Text>
          </View>
          <Text style={styles.body}>{planner.normalized.purpose}</Text>

          {!planner.supported ? (
            <Text style={styles.error}>{planner.unsupportedReason || 'This request is outside the current Build archetype.'}</Text>
          ) : (
            <>
              <DimensionInput label="Width" value={planner.widthIn} onChange={planner.setWidthIn} disabled={planner.accepted} />
              <DimensionInput label="Height" value={planner.heightIn} onChange={planner.setHeightIn} disabled={planner.accepted} />
              <DimensionInput label="Depth" value={planner.depthIn} onChange={planner.setDepthIn} disabled={planner.accepted} />
              <DimensionInput label="Interior shelves" value={planner.interiorShelves} onChange={planner.setInteriorShelves} disabled={planner.accepted} unit="" />
              {!planner.accepted ? (
                <Pressable style={styles.secondary} onPress={planner.generatePlan}>
                  <Text style={styles.secondaryText}>{plan ? 'Update plan' : 'Generate plan & preview'}</Text>
                </Pressable>
              ) : null}
            </>
          )}
        </View>
      ) : null}

      {plan ? (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Plan + placement</Text>
            <Text style={[styles.validationPill, plan.validation.valid ? styles.valid : styles.invalid]}>
              {plan.validation.valid ? 'Fit validated' : 'Needs adjustment'}
            </Text>
          </View>
          <Text style={styles.metric}>
            {formatBuildInches(plan.geometry.widthMm)} × {formatBuildInches(plan.geometry.heightMm)} × {formatBuildInches(plan.geometry.depthMm)} in
          </Text>
          <Text style={styles.body}>
            {plan.geometry.interiorShelves} interior shelves · {plan.geometry.sheetCountPlanning} plywood sheets ·
            ${plan.cost.expectedAmount.toFixed(0)} expected materials · {plan.effort.activeLowHours}–{plan.effort.activeHighHours} active hours
          </Text>
          <Text style={styles.hint}>Drag only the blue Build footprint in the room. Existing room objects stay locked.</Text>
          {plan.validation.errors.map((message) => <Text key={message} style={styles.error}>• {message}</Text>)}

          {planner.accepted ? (
            <View style={styles.acceptedBox}>
              <Text style={styles.acceptedTitle}>Build plan accepted</Text>
              <Text style={styles.body}>The object is now part of the committed room version.</Text>
              <Pressable style={styles.secondary} onPress={planner.startNewBuild}>
                <Text style={styles.secondaryText}>Start another build</Text>
              </Pressable>
            </View>
          ) : (
            <Pressable
              disabled={!plan.validation.valid || planner.accepting}
              onPress={() => void planner.acceptPlan()}
              style={[styles.accept, (!plan.validation.valid || planner.accepting) && styles.disabled]}
            >
              <Text style={styles.acceptText}>{planner.accepting ? 'Accepting plan…' : 'Accept build plan'}</Text>
            </Pressable>
          )}

          <Text style={styles.disclaimer}>
            Planning output only. {measurementSummary === 'measured'
              ? 'Room geometry is measured, but stock/site/as-built conditions still require verification.'
              : 'Room geometry is not fully measured, so exact-fit confidence remains limited.'}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

function DimensionInput({
  label,
  value,
  onChange,
  disabled,
  unit = 'in',
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled: boolean;
  unit?: string;
}) {
  return (
    <View style={styles.inputRow}>
      <Text style={styles.inputLabel}>{label}</Text>
      <View style={styles.inputWrap}>
        <TextInput
          value={value}
          onChangeText={onChange}
          editable={!disabled}
          keyboardType="decimal-pad"
          style={styles.input}
        />
        {unit ? <Text style={styles.unit}>{unit}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 15,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,.74)',
    borderWidth: 1,
    borderColor: tokens.color.line,
    gap: 10,
  },
  topRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  statusDot: { width: 8, height: 8, borderRadius: 8, backgroundColor: tokens.color.blue, marginTop: 4 },
  eyebrow: { fontSize: 8, fontWeight: '800', letterSpacing: 1.2, color: tokens.color.peach },
  title: { marginTop: 4, fontSize: 16, lineHeight: 20, fontWeight: '800', color: tokens.color.text },
  body: { fontSize: 9, lineHeight: 14, color: tokens.color.muted },
  workspaceButton: {
    padding: 11,
    borderRadius: 12,
    backgroundColor: 'rgba(207,229,236,.48)',
    borderWidth: 1,
    borderColor: 'rgba(13,116,150,.18)',
  },
  workspaceButtonTitle: { fontSize: 10, fontWeight: '800', color: tokens.color.blue },
  workspaceButtonMeta: { marginTop: 2, fontSize: 7, lineHeight: 11, color: tokens.color.muted },
  divider: { height: 1, backgroundColor: tokens.color.line },
  brief: {
    minHeight: 78,
    padding: 10,
    borderRadius: 11,
    backgroundColor: 'rgba(250,250,248,.92)',
    borderWidth: 1,
    borderColor: tokens.color.line,
    color: tokens.color.text,
    fontSize: 9,
    lineHeight: 14,
    textAlignVertical: 'top',
  },
  primary: { minHeight: 38, borderRadius: 11, backgroundColor: tokens.color.blue, alignItems: 'center', justifyContent: 'center' },
  primaryText: { color: '#fff', fontSize: 9, fontWeight: '800' },
  disabled: { opacity: .42 },
  success: { fontSize: 8, lineHeight: 12, color: '#356D59' },
  error: { fontSize: 8, lineHeight: 12, color: '#A84C4C' },
  section: { borderTopWidth: 1, borderTopColor: tokens.color.line, paddingTop: 10, gap: 7 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', gap: 8, alignItems: 'center' },
  sectionTitle: { flex: 1, fontSize: 10, fontWeight: '800', color: tokens.color.text },
  classPill: { fontSize: 7, fontWeight: '800', color: '#356D59', backgroundColor: 'rgba(53,109,89,.08)', paddingHorizontal: 7, paddingVertical: 4, borderRadius: 999 },
  validationPill: { fontSize: 7, fontWeight: '800', paddingHorizontal: 7, paddingVertical: 4, borderRadius: 999 },
  valid: { color: '#356D59', backgroundColor: 'rgba(53,109,89,.08)' },
  invalid: { color: '#A84C4C', backgroundColor: 'rgba(168,76,76,.08)' },
  inputRow: { minHeight: 33, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  inputLabel: { flex: 1, fontSize: 8, color: tokens.color.muted },
  inputWrap: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  input: { minWidth: 70, paddingHorizontal: 8, paddingVertical: 6, borderRadius: 9, backgroundColor: 'rgba(246,246,243,.92)', borderWidth: 1, borderColor: tokens.color.line, fontSize: 9, fontWeight: '700', color: tokens.color.text, textAlign: 'right' },
  unit: { width: 15, fontSize: 7, color: tokens.color.muted },
  secondary: { minHeight: 36, borderRadius: 10, borderWidth: 1, borderColor: tokens.color.line, backgroundColor: 'rgba(255,255,255,.62)', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 10 },
  secondaryText: { fontSize: 8, fontWeight: '800', color: tokens.color.text },
  metric: { fontSize: 14, fontWeight: '800', color: tokens.color.blue, fontVariant: ['tabular-nums'] },
  hint: { fontSize: 7, lineHeight: 11, color: tokens.color.muted },
  accept: { minHeight: 39, borderRadius: 11, backgroundColor: tokens.color.blue, alignItems: 'center', justifyContent: 'center' },
  acceptText: { color: '#fff', fontSize: 9, fontWeight: '800' },
  acceptedBox: { padding: 9, borderRadius: 11, backgroundColor: 'rgba(53,109,89,.07)', borderWidth: 1, borderColor: 'rgba(53,109,89,.18)', gap: 6 },
  acceptedTitle: { fontSize: 9, fontWeight: '800', color: '#356D59' },
  disclaimer: { fontSize: 7, lineHeight: 11, color: tokens.color.peach },
});
