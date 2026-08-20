import {
  createOpenShelvingPlan,
  inchesToMm,
  mmToInches,
  previewOpenShelvingPlan,
  repositionOpenShelvingPlan,
  type OpenShelvingPlanDraft,
  type SpatialSnapshot,
} from '@formshift/domain';
import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useAuth } from '../auth/AuthProvider';
import { tokens } from '../theme/tokens';

type NormalizedBrief = {
  label: string;
  archetype: 'shelving' | 'cabinet' | 'storage' | 'desk' | 'bench' | 'other';
  purpose: string;
  targetWidthMm: number | null;
  targetHeightMm: number | null;
  targetDepthMm: number | null;
  interiorShelfCount: number | null;
  installationType: 'freestanding' | 'wall_anchored' | 'built_in' | 'unknown';
  placementIntent: string;
  materialPreferences: string[];
  constraints: string[];
  missingCriticalInformation: string[];
};

type BriefResponse = {
  basisSpatialVersionId?: string;
  supported?: boolean;
  unsupportedReason?: string | null;
  normalizedBrief?: NormalizedBrief;
  error?: string;
  message?: string;
};

type AcceptResponse = {
  status?: string;
  accepted?: { buildRequestId?: string; buildPlanId?: string; spatialVersionId?: string; buildObjectId?: string };
  error?: string;
  message?: string;
  details?: string[];
};

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
  const auth = useAuth();
  const [brief, setBrief] = useState('Build a freestanding open shelving unit for storage.');
  const [normalized, setNormalized] = useState<NormalizedBrief | null>(null);
  const [supported, setSupported] = useState(true);
  const [unsupportedReason, setUnsupportedReason] = useState<string | null>(null);
  const [widthIn, setWidthIn] = useState('');
  const [heightIn, setHeightIn] = useState('');
  const [depthIn, setDepthIn] = useState('');
  const [interiorShelves, setInteriorShelves] = useState('3');
  const [objectId, setObjectId] = useState(() => newBuildObjectId());
  const [plan, setPlan] = useState<OpenShelvingPlanDraft | null>(null);
  const [normalizing, setNormalizing] = useState(false);
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);

  const currentPlan = useMemo(() => {
    if (!plan || !snapshot) return plan;
    const previewObject = previewSnapshot?.objects.find((object) => object.id === plan.object.id);
    if (!previewObject) return plan;
    return repositionOpenShelvingPlan(snapshot, plan, {
      x: previewObject.transform.translation.x,
      z: previewObject.transform.translation.z,
    });
  }, [plan, previewSnapshot, snapshot]);

  const normalizeBrief = async () => {
    setError(null);
    setSavedMessage(null);
    if (!projectId || !spaceId || !activeVersionId || !snapshot) {
      setError('A committed room version is required before Build can start.');
      return;
    }
    if (!auth.session?.access_token) {
      setError('Your FormShift session is not available.');
      return;
    }
    const apiBase = process.env.EXPO_PUBLIC_API_BASE_URL?.replace(/\/$/, '');
    if (!apiBase) {
      setError('FormShift AI API is not configured for this client.');
      return;
    }

    setNormalizing(true);
    setPlan(null);
    onPreviewChange(null);
    try {
      const response = await fetch(`${apiBase}/api/ai/build-brief`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${auth.session.access_token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, spaceId, spatialVersionId: activeVersionId, brief: brief.trim() }),
      });
      const data = await response.json() as BriefResponse;
      if (!response.ok) {
        if (response.status === 409 || data.error === 'stale_spatial_version') {
          throw new Error('The room changed while Build was starting. Refresh and try again.');
        }
        throw new Error(data.message || humanizeError(data.error) || `Build request failed (${response.status}).`);
      }
      const next = data.normalizedBrief;
      if (!next) throw new Error('Build returned no normalized brief.');
      setNormalized(next);
      setSupported(data.supported !== false);
      setUnsupportedReason(data.unsupportedReason ?? null);
      setWidthIn(next.targetWidthMm ? formatInches(next.targetWidthMm) : '');
      setHeightIn(next.targetHeightMm ? formatInches(next.targetHeightMm) : '');
      setDepthIn(next.targetDepthMm ? formatInches(next.targetDepthMm) : '');
      setInteriorShelves(String(next.interiorShelfCount ?? 3));
      setObjectId(newBuildObjectId());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Build could not understand this request.');
    } finally {
      setNormalizing(false);
    }
  };

  const generatePlan = () => {
    setError(null);
    setSavedMessage(null);
    if (!snapshot || !normalized) return;
    try {
      const width = parsePositiveInches(widthIn, 'Width');
      const height = parsePositiveInches(heightIn, 'Height');
      const depth = parsePositiveInches(depthIn, 'Depth');
      const shelfCount = Number(interiorShelves);
      if (!Number.isInteger(shelfCount) || shelfCount < 0 || shelfCount > 12) {
        throw new Error('Interior shelves must be a whole number from 0 to 12.');
      }
      const previousObject = previewSnapshot?.objects.find((object) => object.id === objectId);
      const nextPlan = createOpenShelvingPlan(
        snapshot,
        {
          objectId,
          label: normalized.label.trim() || 'Open shelving',
          widthMm: inchesToMm(width),
          heightMm: inchesToMm(height),
          depthMm: inchesToMm(depth),
          interiorShelves: shelfCount,
        },
        previousObject
          ? { x: previousObject.transform.translation.x, z: previousObject.transform.translation.z }
          : undefined,
      );
      setPlan(nextPlan);
      onPreviewChange(previewOpenShelvingPlan(snapshot, nextPlan));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'The shelving plan could not be generated.');
    }
  };

  const acceptPlan = async () => {
    if (!currentPlan || !currentPlan.validation.valid || !normalized || !projectId || !spaceId || !activeVersionId) return;
    if (!auth.session?.access_token) return;
    const apiBase = process.env.EXPO_PUBLIC_API_BASE_URL?.replace(/\/$/, '');
    if (!apiBase) return;
    setAccepting(true);
    setError(null);
    try {
      const response = await fetch(`${apiBase}/api/build/accept`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${auth.session.access_token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          spaceId,
          spatialVersionId: activeVersionId,
          briefText: brief.trim(),
          normalizedBrief: normalized,
          design: currentPlan.input,
          placement: {
            x: currentPlan.object.transform.translation.x,
            z: currentPlan.object.transform.translation.z,
          },
        }),
      });
      const data = await response.json() as AcceptResponse;
      if (!response.ok) {
        if (response.status === 409 || data.error === 'stale_spatial_version') {
          throw new Error('The room changed before this plan was accepted. Refresh and regenerate the Build plan.');
        }
        const details = data.details?.[0];
        throw new Error(details || data.message || humanizeError(data.error) || `Build acceptance failed (${response.status}).`);
      }
      setSavedMessage('Build plan saved and placed in the room.');
      setPlan(null);
      setNormalized(null);
      onPreviewChange(null);
      await onAccepted();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'The Build plan could not be accepted.');
    } finally {
      setAccepting(false);
    }
  };

  if (!snapshot) {
    return <View style={styles.card}><Text style={styles.eyebrow}>BUILD INTELLIGENCE</Text><Text style={styles.title}>Measure the room first.</Text><Text style={styles.body}>Build placement requires committed room geometry.</Text></View>;
  }

  return (
    <View style={styles.card}>
      <Text style={styles.eyebrow}>BUILD INTELLIGENCE · CLASS A</Text>
      <Text style={styles.title}>Design freestanding open shelving.</Text>
      <Text style={styles.body}>Describe what you want. AI extracts the brief; FormShift computes the geometry, cut list, material quantity, fit, cost allowance, and effort deterministically.</Text>

      <TextInput value={brief} onChangeText={setBrief} multiline style={styles.brief} placeholder="Describe the shelving you want to build." />
      <Pressable disabled={normalizing || accepting} onPress={() => void normalizeBrief()} style={[styles.primary, (normalizing || accepting) && styles.disabled]}>
        <Text style={styles.primaryText}>{normalizing ? 'Understanding request…' : normalized ? 'Re-read request' : 'Start build plan'}</Text>
      </Pressable>

      {savedMessage ? <Text style={styles.success}>{savedMessage}</Text> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}

      {normalized ? (
        <View style={styles.section}>
          <View style={styles.summaryTop}><Text style={styles.sectionTitle}>{normalized.label || 'Open shelving'}</Text><Text style={styles.riskPill}>Class A</Text></View>
          <Text style={styles.summary}>{normalized.purpose}</Text>
          {!supported ? <Text style={styles.error}>{unsupportedReason || 'This request is outside the current Build archetype.'}</Text> : null}
          {normalized.missingCriticalInformation.length > 0 ? (
            <Text style={styles.hint}>Missing from the description: {normalized.missingCriticalInformation.join(' · ')}. Enter the dimensions below.</Text>
          ) : null}

          {supported ? (
            <>
              <View style={styles.inputGrid}>
                <DimensionInput label="Width" value={widthIn} onChange={setWidthIn} />
                <DimensionInput label="Height" value={heightIn} onChange={setHeightIn} />
                <DimensionInput label="Depth" value={depthIn} onChange={setDepthIn} />
                <View style={styles.inputCell}><Text style={styles.inputLabel}>Interior shelves</Text><TextInput value={interiorShelves} onChangeText={setInteriorShelves} keyboardType="number-pad" style={styles.input} /></View>
              </View>
              <Text style={styles.hint}>Material baseline: nominal 3/4 in plywood. Dimensions are editable before the plan is generated.</Text>
              <Pressable onPress={generatePlan} style={styles.secondary}><Text style={styles.secondaryText}>{plan ? 'Update plan' : 'Generate plan & preview'}</Text></Pressable>
            </>
          ) : null}
        </View>
      ) : null}

      {currentPlan ? (
        <View style={styles.section}>
          <View style={styles.summaryTop}>
            <Text style={styles.sectionTitle}>Plan + placement</Text>
            <Text style={[styles.validationPill, currentPlan.validation.valid ? styles.valid : styles.invalid]}>{currentPlan.validation.valid ? 'Fit validated' : 'Needs adjustment'}</Text>
          </View>
          <Text style={styles.metric}>{formatSize(currentPlan)}</Text>
          <Text style={styles.summary}>{currentPlan.geometry.interiorShelves} interior shelves · {currentPlan.geometry.sheetCountPlanning} plywood sheet{currentPlan.geometry.sheetCountPlanning === 1 ? '' : 's'} planning quantity</Text>
          <Text style={styles.summary}>Material allowance: ${currentPlan.cost.lowAmount.toFixed(0)}–${currentPlan.cost.highAmount.toFixed(0)} · expected ${currentPlan.cost.expectedAmount.toFixed(0)}</Text>
          <Text style={styles.summary}>Effort: {currentPlan.effort.activeLowHours}–{currentPlan.effort.activeHighHours} active hours · {currentPlan.effort.difficulty}</Text>
          <Text style={styles.hint}>Drag only the blue Build footprint in the room to refine placement. Existing room objects stay locked in Build mode.</Text>

          {currentPlan.validation.errors.map((message) => <Text key={message} style={styles.validationError}>• {message}</Text>)}

          <View style={styles.cutList}>
            <Text style={styles.cutTitle}>Cut list</Text>
            {currentPlan.components.map((component) => (
              <Text key={component.componentKey} style={styles.cutRow}>
                {component.quantity}× {component.label} · {formatPanel(component.dimensionsJson.lengthMm, component.dimensionsJson.widthMm)}
              </Text>
            ))}
          </View>

          <Pressable disabled={!currentPlan.validation.valid || accepting} onPress={() => void acceptPlan()} style={[styles.accept, (!currentPlan.validation.valid || accepting) && styles.disabled]}>
            <Text style={styles.acceptText}>{accepting ? 'Accepting plan…' : 'Accept build plan'}</Text>
          </Pressable>
          <Text style={styles.disclaimer}>Planning output only. This slice does not design wall anchoring, structural work, electrical changes, or code-sensitive construction. {measurementSummary === 'measured' ? 'Room geometry is measured, but the build remains a planning plan until as-built conditions are verified.' : 'Room geometry is not fully measured, so exact-fit confidence remains limited.'}</Text>
        </View>
      ) : null}
    </View>
  );
}

function DimensionInput({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return <View style={styles.inputCell}><Text style={styles.inputLabel}>{label} (in)</Text><TextInput value={value} onChangeText={onChange} keyboardType="decimal-pad" placeholder="Enter" style={styles.input} /></View>;
}

function parsePositiveInches(value: string, label: string) {
  const number = Number(value.trim());
  if (!Number.isFinite(number) || number <= 0) throw new Error(`${label} must be a positive number of inches.`);
  return number;
}
function formatInches(mm: number) { return (Math.round(mmToInches(mm) * 10) / 10).toString(); }
function formatSize(plan: OpenShelvingPlanDraft) {
  return `${formatInches(plan.geometry.widthMm)} × ${formatInches(plan.geometry.heightMm)} × ${formatInches(plan.geometry.depthMm)} in`;
}
function formatPanel(lengthMm: number, widthMm: number) { return `${formatInches(lengthMm)} × ${formatInches(widthMm)} in`; }
function newBuildObjectId() { return `build-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`; }
function humanizeError(value?: string) {
  if (!value) return null;
  if (value === 'build_brief_failed') return 'FormShift could not understand the Build request.';
  if (value === 'invalid_build_plan') return 'The Build plan failed deterministic validation.';
  if (value === 'build_accept_failed') return 'The Build plan could not be saved.';
  return value.replace(/_/g, ' ');
}

const styles = StyleSheet.create({
  card: { padding: 18, borderRadius: 22, backgroundColor: tokens.color.surface, borderWidth: 1, borderColor: 'rgba(255,255,255,.78)', shadowColor: tokens.color.shadow, shadowOpacity: .08, shadowRadius: 14, shadowOffset: { width: 0, height: 6 } },
  eyebrow: { fontSize: 9, fontWeight: '800', letterSpacing: 1.1, color: tokens.color.peach },
  title: { marginTop: 7, fontSize: 16, fontWeight: '700', color: tokens.color.text },
  body: { marginTop: 6, fontSize: 10, lineHeight: 15, color: tokens.color.muted },
  brief: { marginTop: 12, minHeight: 72, borderWidth: 1, borderColor: tokens.color.line, borderRadius: 12, backgroundColor: 'rgba(255,255,255,.72)', paddingHorizontal: 11, paddingVertical: 9, color: tokens.color.text, fontSize: 10, lineHeight: 15 },
  primary: { marginTop: 10, backgroundColor: tokens.color.blue, paddingVertical: 10, paddingHorizontal: 12, borderRadius: 12, alignItems: 'center' },
  primaryText: { color: '#fff', fontSize: 10, fontWeight: '800' },
  secondary: { marginTop: 10, paddingVertical: 9, paddingHorizontal: 10, borderRadius: 11, borderWidth: 1, borderColor: tokens.color.blue, alignItems: 'center', backgroundColor: 'rgba(207,229,236,.28)' },
  secondaryText: { color: tokens.color.blue, fontSize: 9, fontWeight: '800' },
  accept: { marginTop: 12, paddingVertical: 10, paddingHorizontal: 12, borderRadius: 12, backgroundColor: tokens.color.blue, alignItems: 'center' },
  acceptText: { color: '#fff', fontSize: 10, fontWeight: '800' },
  disabled: { opacity: .48 },
  section: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: tokens.color.line },
  summaryTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  sectionTitle: { flex: 1, fontSize: 11, fontWeight: '800', color: tokens.color.text },
  riskPill: { fontSize: 8, fontWeight: '800', color: tokens.color.blue, backgroundColor: 'rgba(207,229,236,.55)', paddingHorizontal: 7, paddingVertical: 3, borderRadius: 999 },
  validationPill: { fontSize: 8, fontWeight: '800', paddingHorizontal: 7, paddingVertical: 3, borderRadius: 999 },
  valid: { color: tokens.color.success, backgroundColor: 'rgba(53,109,89,.10)' },
  invalid: { color: '#A84545', backgroundColor: 'rgba(168,69,69,.08)' },
  summary: { marginTop: 5, fontSize: 9, lineHeight: 14, color: tokens.color.muted },
  metric: { marginTop: 7, fontSize: 15, fontWeight: '800', color: tokens.color.text },
  hint: { marginTop: 7, fontSize: 8, lineHeight: 12, color: tokens.color.peach },
  inputGrid: { marginTop: 10, flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  inputCell: { width: '48%' },
  inputLabel: { fontSize: 8, fontWeight: '700', color: tokens.color.muted, marginBottom: 4 },
  input: { borderWidth: 1, borderColor: tokens.color.line, borderRadius: 9, backgroundColor: 'rgba(255,255,255,.75)', paddingHorizontal: 8, paddingVertical: 7, fontSize: 9, color: tokens.color.text },
  error: { marginTop: 8, fontSize: 9, lineHeight: 13, color: '#A84545' },
  success: { marginTop: 8, fontSize: 9, lineHeight: 13, color: tokens.color.success },
  validationError: { marginTop: 4, fontSize: 8, lineHeight: 12, color: '#A84545' },
  cutList: { marginTop: 10, padding: 9, borderRadius: 10, backgroundColor: 'rgba(255,255,255,.48)' },
  cutTitle: { fontSize: 8, fontWeight: '800', color: tokens.color.peach, marginBottom: 4 },
  cutRow: { fontSize: 8, lineHeight: 12, color: tokens.color.text },
  disclaimer: { marginTop: 9, fontSize: 8, lineHeight: 12, color: tokens.color.muted },
});
