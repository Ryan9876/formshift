import { type OpenShelvingPlanDraft, type SpatialSnapshot } from '@formshift/domain';
import { router } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, useWindowDimensions, View } from 'react-native';
import { AugmentedRoomCanvas } from '../components/AugmentedRoomCanvas';
import { BrandMark } from '../components/BrandMark';
import { BuildBlueprintPanel, BuildCutListTable } from '../components/BuildBlueprintPanel';
import { formatBuildInches, useBuildPlanner } from '../data/useBuildPlanner';
import { useRoomWorkspace } from '../data/useRoomWorkspace';
import { tokens } from '../theme/tokens';

type DetailTab = 'cut' | 'materials' | 'effort' | 'blueprint';

export function PhotoBuildWorkspace() {
  const workspace = useRoomWorkspace();
  const [preview, setPreview] = useState<SpatialSnapshot | null>(null);
  const [tab, setTab] = useState<DetailTab>('cut');
  const compact = useWindowDimensions().width < 1020;
  const planner = useBuildPlanner({
    projectId: workspace.project?.id,
    spaceId: workspace.space?.id,
    activeVersionId: workspace.activeVersionId,
    snapshot: workspace.workingSnapshot,
    previewSnapshot: preview,
    onPreviewChange: setPreview,
    onAccepted: workspace.refresh,
  });

  useEffect(() => setPreview(null), [workspace.activeVersionId]);

  const buildObjectId = useMemo(() => {
    if (!preview || !workspace.workingSnapshot) return undefined;
    return preview.objects.find((object) => !workspace.workingSnapshot?.objects.some((base) => base.id === object.id))?.id;
  }, [preview, workspace.workingSnapshot]);

  const plan = planner.currentPlan;
  const scene = preview ?? workspace.workingSnapshot;

  return (
    <SafeAreaView style={styles.page}>
      <ScrollView contentContainerStyle={styles.content}>
        <Header project={workspace.project?.name} room={workspace.space?.name} />

        {workspace.loading ? (
          <View style={styles.loading}><ActivityIndicator color={tokens.color.blue}/><Text style={styles.loadingText}>Loading room…</Text></View>
        ) : !workspace.workingSnapshot ? (
          <View style={styles.empty}><Text style={styles.emptyTitle}>Create room geometry first.</Text><Text style={styles.body}>Build uses measured room geometry behind the photo augmentation.</Text></View>
        ) : (
          <>
            <View style={[styles.mainGrid, compact && styles.stack]}>
              <BuildControls planner={planner} />
              <View style={styles.sceneColumn}>
                {scene ? (
                  <AugmentedRoomCanvas
                    photoUrl={workspace.photoUrl}
                    snapshot={scene}
                    plan={plan}
                    editablePlan={!!buildObjectId && !planner.accepted}
                    editableObjectId={buildObjectId}
                    onSnapshotChange={setPreview}
                  />
                ) : null}
                <Text style={styles.sceneNote}>
                  FormShift is photo-first. The augmented room is the primary experience; Plan is the technical verification view.
                </Text>
              </View>
              <BuildSummary planner={planner} plan={plan} />
            </View>

            <View style={styles.details}>
              <View style={styles.tabs}>
                {(['cut','materials','effort','blueprint'] as DetailTab[]).map((value) => (
                  <Pressable key={value} onPress={() => setTab(value)} style={[styles.tab, tab === value && styles.tabActive]}>
                    <Text style={[styles.tabText, tab === value && styles.tabTextActive]}>{tabLabel(value)}</Text>
                  </Pressable>
                ))}
                {tab === 'blueprint' && Platform.OS === 'web' ? (
                  <Pressable style={styles.printButton} onPress={printPage}><Text style={styles.printText}>Print / save PDF</Text></Pressable>
                ) : null}
              </View>
              {!plan ? (
                <View style={styles.detailEmpty}><Text style={styles.emptyTitle}>Build details will appear after a plan is generated.</Text></View>
              ) : tab === 'cut' ? <BuildCutListTable plan={plan} />
                : tab === 'materials' ? <Materials plan={plan} />
                : tab === 'effort' ? <Effort plan={plan} />
                : <BuildBlueprintPanel plan={plan} />}
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function Header({ project, room }: { project?: string; room?: string }) {
  return (
    <View style={styles.header}>
      <View style={styles.brandRow}>
        <BrandMark size={38}/>
        <View><Text style={styles.brand}>FormShift</Text><Text style={styles.kicker}>PHOTO-FIRST BUILD</Text></View>
      </View>
      <View style={styles.headerCopy}>
        <Text style={styles.h1}>See the build in your room first.</Text>
        <Text style={styles.sub}>Design against real dimensions, but make the decision in the real photograph.</Text>
      </View>
      <View style={styles.headerActions}>
        <View style={styles.roomPill}><Text style={styles.roomPillText}>{project ?? 'Project'} · {room ?? 'Room'}</Text></View>
        <Pressable style={styles.secondaryButton} onPress={() => router.replace('/')}><Text style={styles.secondaryButtonText}>Back to Studio</Text></Pressable>
      </View>
    </View>
  );
}

function BuildControls({ planner }: { planner: ReturnType<typeof useBuildPlanner> }) {
  return (
    <View style={styles.panel}>
      <Text style={styles.kicker}>DESCRIBE</Text>
      <Text style={styles.h2}>{planner.normalized?.label ?? 'What should appear in this room?'}</Text>
      <Text style={styles.body}>Describe the object. AI normalizes intent; FormShift keeps dimensions and fit deterministic.</Text>
      <TextInput value={planner.brief} onChangeText={planner.setBrief} multiline editable={!planner.accepting} style={styles.brief}/>
      <Pressable disabled={planner.normalizing || planner.accepting} onPress={() => void planner.normalizeBrief()} style={[styles.primaryButton, (planner.normalizing || planner.accepting) && styles.disabled]}>
        <Text style={styles.primaryButtonText}>{planner.normalizing ? 'Understanding request…' : planner.normalized ? 'Re-read request' : 'Start build plan'}</Text>
      </Pressable>
      {planner.error ? <Text style={styles.error}>{planner.error}</Text> : null}
      {planner.normalized && planner.supported ? (
        <View style={styles.dimensionForm}>
          <Text style={styles.sectionTitle}>Dimensions</Text>
          <Dimension label="Width" value={planner.widthIn} onChange={planner.setWidthIn} disabled={planner.accepted}/>
          <Dimension label="Height" value={planner.heightIn} onChange={planner.setHeightIn} disabled={planner.accepted}/>
          <Dimension label="Depth" value={planner.depthIn} onChange={planner.setDepthIn} disabled={planner.accepted}/>
          <Dimension label="Interior shelves" value={planner.interiorShelves} onChange={planner.setInteriorShelves} disabled={planner.accepted} unit=""/>
          <Text style={styles.micro}>Current archetype: freestanding open shelving · nominal 3/4 in plywood · 48 in max unsupported span.</Text>
          {!planner.accepted ? (
            <Pressable style={styles.secondaryButton} onPress={planner.generatePlan}><Text style={styles.secondaryButtonText}>{planner.currentPlan ? 'Update augmented preview' : 'Generate augmented preview'}</Text></Pressable>
          ) : null}
        </View>
      ) : null}
      {planner.normalized && !planner.supported ? <Text style={styles.error}>{planner.unsupportedReason}</Text> : null}
    </View>
  );
}

function Dimension({ label, value, onChange, disabled, unit = 'in' }: { label: string; value: string; onChange: (value: string) => void; disabled: boolean; unit?: string }) {
  return (
    <View style={styles.dimensionRow}>
      <Text style={styles.meta}>{label}</Text>
      <View style={styles.dimensionInputWrap}>
        <TextInput value={value} onChangeText={onChange} editable={!disabled} keyboardType="decimal-pad" style={styles.dimensionInput}/>
        {unit ? <Text style={styles.meta}>{unit}</Text> : null}
      </View>
    </View>
  );
}

function BuildSummary({ planner, plan }: { planner: ReturnType<typeof useBuildPlanner>; plan: OpenShelvingPlanDraft | null }) {
  return (
    <View style={styles.summaryCol}>
      <View style={styles.panel}>
        <Text style={styles.kicker}>BUILD SUMMARY</Text>
        <Text style={styles.h2}>{plan?.object.label ?? 'No build yet'}</Text>
        {plan ? (
          <>
            <Text style={styles.dimensions}>{formatBuildInches(plan.geometry.widthMm)} × {formatBuildInches(plan.geometry.heightMm)} × {formatBuildInches(plan.geometry.depthMm)} in</Text>
            <Text style={styles.sectionTitle}>Materials</Text>
            {plan.materials.map((material) => <View key={material.materialKey} style={styles.line}><Text style={styles.body}>{material.description}</Text><Text style={styles.meta}>{material.quantity} {material.unit}</Text></View>)}
            <Text style={styles.sectionTitle}>Planning range</Text>
            <Text style={styles.metric}>${plan.cost.expectedAmount.toFixed(0)}</Text>
            <Text style={styles.meta}>${plan.cost.lowAmount.toFixed(0)}–${plan.cost.highAmount.toFixed(0)} · {plan.effort.activeLowHours}–{plan.effort.activeHighHours} active hours</Text>
          </>
        ) : <Text style={styles.body}>Generate a design to see it augmented into the room.</Text>}
      </View>

      <View style={[styles.acceptPanel, plan?.validation.valid && styles.acceptReady]}>
        <Text style={styles.kicker}>FIT STATE</Text>
        <Text style={styles.h2}>{planner.accepted ? 'Accepted' : plan?.validation.valid ? 'Ready to accept' : plan ? 'Needs adjustment' : 'Waiting for plan'}</Text>
        <Text style={styles.body}>{planner.accepted ? planner.savedMessage : plan?.validation.valid ? 'Validated against authoritative room geometry. The photo projection remains illustrative.' : plan?.validation.errors[0] ?? 'Generate a build first.'}</Text>
        {planner.accepted ? (
          <Pressable style={styles.secondaryButton} onPress={planner.startNewBuild}><Text style={styles.secondaryButtonText}>Start another build</Text></Pressable>
        ) : (
          <Pressable disabled={!plan?.validation.valid || planner.accepting} onPress={() => void planner.acceptPlan()} style={[styles.primaryButton, (!plan?.validation.valid || planner.accepting) && styles.disabled]}>
            <Text style={styles.primaryButtonText}>{planner.accepting ? 'Accepting…' : 'Accept build plan'}</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

function Materials({ plan }: { plan: OpenShelvingPlanDraft }) {
  return <View style={styles.detailGrid}>{plan.materials.map((material) => <View key={material.materialKey} style={styles.detailCard}><Text style={styles.sectionTitle}>{material.description}</Text><Text style={styles.metric}>{material.quantity} {material.unit}</Text><Text style={styles.body}>{material.assumptions.join(' ')}</Text></View>)}</View>;
}
function Effort({ plan }: { plan: OpenShelvingPlanDraft }) {
  return <View style={styles.detailGrid}><View style={styles.detailCard}><Text style={styles.sectionTitle}>Active effort</Text><Text style={styles.metric}>{plan.effort.activeLowHours}–{plan.effort.activeHighHours} hrs</Text><Text style={styles.body}>{plan.effort.assumedSkillLevel} skill assumption</Text></View>{plan.effort.taskBreakdown.map((task) => <View key={task.task} style={styles.detailCard}><Text style={styles.sectionTitle}>{task.task}</Text><Text style={styles.metric}>{task.lowHours}–{task.highHours} hrs</Text></View>)}</View>;
}
function tabLabel(value: DetailTab) { return value === 'cut' ? 'Cut list' : value === 'materials' ? 'Materials & cost' : value === 'effort' ? 'Effort' : 'Blueprint'; }
function printPage() { if (Platform.OS === 'web' && typeof window !== 'undefined') window.print(); }

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#EEEAE1' },
  content: { padding: 10, gap: 12, minHeight: '100%' },
  header: { borderRadius: 24, paddingHorizontal: 18, paddingVertical: 14, backgroundColor: 'rgba(250,249,246,.9)', borderWidth: 1, borderColor: tokens.color.line, flexDirection: 'row', alignItems: 'center', gap: 18, flexWrap: 'wrap' },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  brand: { fontSize: 17, fontWeight: '800', color: tokens.color.text },
  kicker: { fontSize: 8, fontWeight: '800', letterSpacing: 1.15, color: tokens.color.peach },
  headerCopy: { flex: 1, minWidth: 260 },
  h1: { fontSize: 24, fontWeight: '800', color: tokens.color.text },
  sub: { marginTop: 4, fontSize: 10, lineHeight: 15, color: tokens.color.muted },
  headerActions: { flexDirection: 'row', gap: 8, alignItems: 'center', flexWrap: 'wrap' },
  roomPill: { paddingHorizontal: 11, paddingVertical: 8, borderRadius: 999, backgroundColor: '#fff', borderWidth: 1, borderColor: tokens.color.line },
  roomPillText: { fontSize: 9, fontWeight: '700', color: tokens.color.text },
  mainGrid: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  stack: { flexDirection: 'column' },
  panel: { width: 292, padding: 16, borderRadius: 22, backgroundColor: 'rgba(250,249,246,.93)', borderWidth: 1, borderColor: tokens.color.line },
  sceneColumn: { flex: 1, minWidth: 0, gap: 7 },
  sceneNote: { paddingHorizontal: 6, fontSize: 8, lineHeight: 12, color: tokens.color.muted },
  summaryCol: { width: 285, gap: 10 },
  h2: { marginTop: 5, fontSize: 16, fontWeight: '800', color: tokens.color.text },
  body: { marginTop: 5, fontSize: 9, lineHeight: 14, color: tokens.color.muted },
  brief: { marginTop: 12, minHeight: 84, borderWidth: 1, borderColor: tokens.color.line, borderRadius: 13, padding: 10, fontSize: 10, lineHeight: 15, color: tokens.color.text, backgroundColor: '#fff', textAlignVertical: 'top' },
  primaryButton: { marginTop: 11, minHeight: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12, backgroundColor: tokens.color.blue },
  primaryButtonText: { color: '#fff', fontSize: 9, fontWeight: '800' },
  secondaryButton: { marginTop: 9, minHeight: 38, paddingHorizontal: 12, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,.76)', borderWidth: 1, borderColor: tokens.color.line },
  secondaryButtonText: { fontSize: 9, fontWeight: '800', color: tokens.color.text },
  disabled: { opacity: .45 },
  error: { marginTop: 8, fontSize: 9, lineHeight: 13, color: '#A84C4C' },
  dimensionForm: { marginTop: 14, gap: 7 },
  sectionTitle: { marginTop: 8, fontSize: 10, fontWeight: '800', color: tokens.color.text },
  dimensionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  dimensionInputWrap: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  dimensionInput: { width: 72, borderWidth: 1, borderColor: tokens.color.line, borderRadius: 9, paddingHorizontal: 8, paddingVertical: 7, textAlign: 'right', backgroundColor: '#fff', fontSize: 10, color: tokens.color.text },
  meta: { fontSize: 8, lineHeight: 12, color: tokens.color.muted },
  micro: { fontSize: 8, lineHeight: 12, color: tokens.color.peach },
  dimensions: { marginTop: 7, fontSize: 12, fontWeight: '800', color: tokens.color.blue },
  line: { marginTop: 7, paddingBottom: 7, borderBottomWidth: 1, borderBottomColor: tokens.color.line, flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  metric: { marginTop: 5, fontSize: 19, fontWeight: '800', color: tokens.color.text },
  acceptPanel: { padding: 16, borderRadius: 20, backgroundColor: 'rgba(250,249,246,.93)', borderWidth: 1, borderColor: tokens.color.line },
  acceptReady: { backgroundColor: 'rgba(225,239,232,.88)', borderColor: 'rgba(56,116,97,.24)' },
  details: { borderRadius: 22, overflow: 'hidden', backgroundColor: 'rgba(250,249,246,.93)', borderWidth: 1, borderColor: tokens.color.line },
  tabs: { minHeight: 48, paddingHorizontal: 10, flexDirection: 'row', alignItems: 'center', gap: 4, borderBottomWidth: 1, borderBottomColor: tokens.color.line, flexWrap: 'wrap' },
  tab: { paddingHorizontal: 10, paddingVertical: 8, borderRadius: 10 },
  tabActive: { backgroundColor: 'rgba(207,229,236,.7)' },
  tabText: { fontSize: 9, fontWeight: '700', color: tokens.color.muted },
  tabTextActive: { color: tokens.color.blue },
  printButton: { marginLeft: 'auto', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, backgroundColor: tokens.color.blue },
  printText: { color: '#fff', fontSize: 8, fontWeight: '800' },
  detailEmpty: { minHeight: 140, alignItems: 'center', justifyContent: 'center', padding: 24 },
  detailGrid: { padding: 14, flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  detailCard: { flexGrow: 1, flexBasis: 210, padding: 14, borderRadius: 15, backgroundColor: '#fff', borderWidth: 1, borderColor: tokens.color.line },
  loading: { minHeight: 480, alignItems: 'center', justifyContent: 'center', gap: 8 },
  loadingText: { fontSize: 11, color: tokens.color.muted },
  empty: { minHeight: 480, alignItems: 'center', justifyContent: 'center', padding: 28 },
  emptyTitle: { fontSize: 17, fontWeight: '800', color: tokens.color.text, textAlign: 'center' },
});
