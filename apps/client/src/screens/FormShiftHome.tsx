import type { Mode, SpatialSnapshot } from '@formshift/domain';
import { isRoomPlanSupported } from '@formshift/formshift-roomplan';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Platform, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { AddObjectCard } from '../components/AddObjectCard';
import { BrandMark } from '../components/BrandMark';
import { BuildIntelligenceCard } from '../components/BuildIntelligenceCard';
import { CaptureSpace } from '../components/CaptureSpace';
import { ModeSwitch } from '../components/ModeSwitch';
import { OrganizeIntelligenceCard } from '../components/OrganizeIntelligenceCard';
import { PlanCanvas } from '../components/PlanCanvas';
import { RoomSetupCard } from '../components/RoomSetupCard';
import { useRoomWorkspace } from '../data/useRoomWorkspace';
import { tokens } from '../theme/tokens';
import { useAuth } from '../auth/AuthProvider';

export function FormShiftHome() {
  const [mode, setMode] = useState<Mode>('organize');
  const [lidar, setLidar] = useState(false);
  const [organizePreview, setOrganizePreview] = useState<SpatialSnapshot | null>(null);
  const [buildPreview, setBuildPreview] = useState<SpatialSnapshot | null>(null);
  const { width } = useWindowDimensions();
  const compact = width < 780;
  const auth = useAuth();
  const workspace = useRoomWorkspace();

  useEffect(() => { isRoomPlanSupported().then(setLidar).catch(() => setLidar(false)); }, []);
  useEffect(() => {
    setOrganizePreview(null);
    setBuildPreview(null);
  }, [mode, workspace.activeVersionId]);

  const titleContext = workspace.project && workspace.space
    ? `${workspace.project.name.toUpperCase()} · ${workspace.space.name.toUpperCase()}`
    : 'NEW SPACE';
  const buildPreviewObjectId = buildPreview?.objects.find(
    (object) => !workspace.workingSnapshot?.objects.some((base) => base.id === object.id),
  )?.id;
  const canvasSnapshot = mode === 'organize' && organizePreview
    ? organizePreview
    : mode === 'build' && buildPreview
      ? buildPreview
      : workspace.workingSnapshot;
  const canvasEditable = mode === 'arrange'
    || (mode === 'organize' && !!organizePreview)
    || (mode === 'build' && !!buildPreviewObjectId);
  const canvasChange = mode === 'organize' && organizePreview
    ? setOrganizePreview
    : mode === 'build' && buildPreview
      ? setBuildPreview
      : workspace.setWorkingSnapshot;

  return (
    <SafeAreaView style={styles.page}>
      <View style={styles.hazeA} /><View style={styles.hazeB} />
      <View style={[styles.shell, compact && styles.shellCompact]}>
        <View style={[styles.nav, compact && styles.navCompact]}>
          <View style={styles.brandRow}><BrandMark /><View><Text style={styles.brand}>FormShift</Text><Text style={styles.tagline}>Shape the space around you.</Text></View></View>
          {!compact && <View style={styles.navList}><NavItem active label="Studio" meta={workspace.space?.name ?? 'Capture a room'}/><NavItem label="Projects" meta={workspace.project?.name ?? 'No project yet'}/><NavItem label="Measurements" meta={measurementLabel(workspace.measurementSummary)}/><NavItem label="Exports" meta="Plans & materials"/></View>}
          {!compact && <View style={styles.statusCard}>
            <Text style={styles.statusTitle}>Capture capability</Text>
            <Text style={styles.statusValue}>{Platform.OS === 'ios' && lidar ? 'LiDAR / RoomPlan ready' : 'Photo + manual measurement'}</Text>
            <Text style={styles.statusHint}>Photos provide visual evidence. Measured geometry remains authoritative.</Text>
          </View>}
        </View>

        <ScrollView contentContainerStyle={styles.content} style={styles.workspace}>
          <View style={[styles.top, compact && styles.topCompact]}>
            <View>
              <Text style={styles.eyebrow}>{titleContext}</Text>
              <Text style={styles.title}>{workspace.space ? `Make ${workspace.space.name} work better.` : 'Capture a room to begin.'}</Text>
              <Text style={styles.subtitle}>{copyFor(mode, !!workspace.workingSnapshot, workspace.workingSnapshot?.objects.length ?? 0)}</Text>
              {compact ? <Text style={styles.mobileCapability}>{Platform.OS === 'ios' && lidar ? 'LiDAR / RoomPlan ready' : 'Photo + manual measurement'}</Text> : null}
            </View>
            <View style={styles.topActions}>
              <CaptureSpace
                lidarAvailable={Platform.OS === 'ios' && lidar}
                projectId={workspace.project?.id}
                spaceId={workspace.space?.id}
                onSaved={() => { void workspace.refresh(); }}
              />
              <ModeSwitch value={mode} onChange={setMode} />
            </View>
          </View>

          {workspace.error ? <View style={styles.errorBanner}><Text style={styles.errorText}>{workspace.error}</Text><Pressable onPress={() => void workspace.refresh()}><Text style={styles.errorAction}>Retry</Text></Pressable></View> : null}

          <View style={[styles.mainGrid, compact && styles.mainGridCompact]}>
            <View style={styles.canvasCard}>
              {workspace.loading ? <LoadingCard /> : null}
              {!workspace.loading && !workspace.space ? <EmptyRoomCard /> : null}
              {!workspace.loading && workspace.space && !workspace.workingSnapshot ? (
                <RoomSetupCard busy={workspace.busy} onCreate={workspace.initializeRoom} />
              ) : null}
              {!workspace.loading && canvasSnapshot ? (
                <PlanCanvas
                  snapshot={canvasSnapshot}
                  editable={canvasEditable}
                  editableObjectIds={mode === 'build' && buildPreviewObjectId ? [buildPreviewObjectId] : undefined}
                  onSnapshotChange={canvasChange}
                />
              ) : null}
            </View>

            <View style={styles.sideRail}>
              {workspace.photoUrl ? <PhotoCard url={workspace.photoUrl} /> : null}
              {mode === 'organize' && (
                <OrganizeIntelligenceCard
                  projectId={workspace.project?.id}
                  spaceId={workspace.space?.id}
                  activeVersionId={workspace.activeVersionId}
                  snapshot={workspace.workingSnapshot}
                  previewSnapshot={organizePreview}
                  busy={workspace.busy}
                  onAccept={workspace.acceptOrganizeProposal}
                  onPreviewChange={setOrganizePreview}
                />
              )}
              {mode === 'arrange' && <ArrangePanel hasPlan={!!workspace.workingSnapshot} dirty={workspace.dirty} busy={workspace.busy} onSave={workspace.saveArrangement} onDiscard={workspace.discardArrangement} />}
              {mode === 'arrange' && workspace.workingSnapshot ? <AddObjectCard busy={workspace.busy} onAdd={workspace.addObject} /> : null}
              {mode === 'build' && (
                <BuildIntelligenceCard
                  projectId={workspace.project?.id}
                  spaceId={workspace.space?.id}
                  activeVersionId={workspace.activeVersionId}
                  snapshot={workspace.workingSnapshot}
                  previewSnapshot={buildPreview}
                  measurementSummary={workspace.measurementSummary}
                  onPreviewChange={setBuildPreview}
                  onAccepted={workspace.refresh}
                />
              )}
              <MeasurementCard summary={workspace.measurementSummary} />
            </View>
          </View>

          <View style={styles.footerRow}>
            <Text style={styles.footerText}>Phase 3 · Build Intelligence</Text>
            <Text style={styles.footerText}>{auth.configured ? `Auth: ${auth.session ? auth.access : 'ready'}` : 'Auth: awaiting Supabase project'}</Text>
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

function NavItem({ label, meta, active = false }: { label: string; meta: string; active?: boolean }) {
  return <View style={[styles.navItem, active && styles.navItemActive]}><Text style={styles.navLabel}>{label}</Text><Text style={styles.navMeta}>{meta}</Text></View>;
}

function LoadingCard() {
  return <View style={styles.stateCard}><ActivityIndicator color={tokens.color.blue}/><Text style={styles.stateTitle}>Loading your room…</Text><Text style={styles.stateBody}>FormShift is restoring the latest captured room and committed spatial version.</Text></View>;
}

function EmptyRoomCard() {
  return <View style={styles.stateCard}><Text style={styles.cardEyebrow}>START HERE</Text><Text style={styles.stateTitle}>Capture your first room.</Text><Text style={styles.stateBody}>Use Capture Space above. After the photo is saved, enter measured dimensions to create the room's authoritative geometry.</Text></View>;
}

function PhotoCard({ url }: { url: string }) {
  return <View style={styles.photoCard}><Text style={styles.cardEyebrow}>ROOM PHOTO</Text><Image source={{ uri: url }} resizeMode="cover" style={styles.photo}/><Text style={styles.photoHint}>Private source image · visual evidence, not automatic scale</Text></View>;
}

function ArrangePanel({ hasPlan, dirty, busy, onSave, onDiscard }: { hasPlan: boolean; dirty: boolean; busy: boolean; onSave: () => Promise<void>; onDiscard: () => void }) {
  if (!hasPlan) return <View style={styles.glassCard}><Text style={styles.cardEyebrow}>ARRANGE</Text><Text style={styles.cardTitle}>Room dimensions required</Text><Text style={styles.cardBody}>Create the room boundary first. Arrange will then preserve dimensions while you move real objects.</Text></View>;
  return <View style={styles.glassCard}><Text style={styles.cardEyebrow}>ARRANGE</Text><Text style={styles.cardTitle}>Move objects without dimension drift</Text><Text style={styles.cardBody}>Drag an object directly. The working layout changes locally until you save it as a new immutable spatial version.</Text><View style={styles.benefit}><Text style={styles.benefitText}>{dirty ? 'unsaved layout changes' : 'latest layout saved'}</Text></View>{dirty ? <View style={styles.actionRow}><Pressable disabled={busy} style={[styles.primary, styles.actionGrow, busy && styles.disabled]} onPress={() => void onSave()}><Text style={styles.primaryText}>{busy ? 'Saving…' : 'Save arrangement'}</Text></Pressable><Pressable disabled={busy} style={styles.secondaryButton} onPress={onDiscard}><Text style={styles.secondaryText}>Discard</Text></Pressable></View> : null}</View>;
}

function MeasurementCard({ summary }: { summary: 'needs_dimensions' | 'estimated' | 'measured' | 'mixed' }) {
  return <View style={styles.confidenceCard}><Text style={styles.cardEyebrow}>ROOM GEOMETRY</Text><Text style={[styles.metric, summary !== 'measured' && styles.metricNeutral]}>{measurementLabel(summary)}</Text><Text style={styles.cardBody}>{summary === 'measured' ? 'The room boundary comes from user-confirmed measurements. Photos remain supporting evidence.' : summary === 'estimated' ? 'The current room boundary is explicitly estimated. Measure it before relying on exact fit.' : summary === 'mixed' ? 'The room uses mixed measurement states. Exact-fit outputs remain gated.' : 'Capture a photo, then enter room dimensions to create the spatial model.'}</Text></View>;
}

function measurementLabel(summary: 'needs_dimensions' | 'estimated' | 'measured' | 'mixed') {
  if (summary === 'measured') return 'Measured';
  if (summary === 'estimated') return 'Estimated';
  if (summary === 'mixed') return 'Mixed evidence';
  return 'Needs dimensions';
}

function copyFor(mode: Mode, hasPlan: boolean, objectCount: number) {
  if (!hasPlan) return 'Capture the room, then enter dimensions. FormShift will not infer authoritative geometry from a photo alone.';
  if (mode === 'organize') return objectCount > 0 ? 'Ask FormShift for practical layout options, then preview and drag the proposed boxes to fine-tune a validated draft before accepting it.' : 'Add the furniture and storage you want FormShift to reason about.';
  if (mode === 'arrange') return 'Move real objects directly, then save the layout as a new immutable spatial version.';
  return 'Describe a freestanding shelving/storage build, adjust exact dimensions, preview it in the room, and accept a deterministic plan with cut list, materials, cost allowance, and effort.';
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: tokens.color.canvasA },
  hazeA: { position: 'absolute', width: 520, height: 520, borderRadius: 520, backgroundColor: 'rgba(204,211,177,.22)', top: -200, right: -120 },
  hazeB: { position: 'absolute', width: 420, height: 420, borderRadius: 420, backgroundColor: 'rgba(205,181,151,.18)', bottom: -150, left: 180 },
  shell: { flex: 1, flexDirection: 'row', padding: 12, gap: 0 }, shellCompact: { padding: 6, flexDirection: 'column' },
  nav: { width: 230, padding: 22, borderTopLeftRadius: 32, borderBottomLeftRadius: 32, borderTopRightRadius: 10, borderBottomRightRadius: 10, backgroundColor: tokens.color.nav, borderWidth: 1, borderColor: 'rgba(38,43,42,.08)', shadowColor: '#6B6254', shadowOpacity: .12, shadowRadius: 26, shadowOffset: { width: 8, height: 0 }, zIndex: 1 },
  navCompact: { width: '100%', minHeight: 92, padding: 14, borderRadius: 24, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 10 }, brand: { fontSize: 18, fontWeight: '800', letterSpacing: -.4, color: tokens.color.text }, tagline: { fontSize: 9, color: tokens.color.peach, marginTop: 1 },
  navList: { gap: 8, marginTop: 36 }, navItem: { padding: 12, borderRadius: 16 }, navItemActive: { backgroundColor: 'rgba(255,255,255,.55)' }, navLabel: { fontWeight: '700', color: tokens.color.text, fontSize: 12 }, navMeta: { fontSize: 9, color: tokens.color.muted, marginTop: 3 },
  statusCard: { marginTop: 'auto', borderTopWidth: 1, borderTopColor: tokens.color.line, paddingTop: 16, maxWidth: 210 }, statusTitle: { fontSize: 9, color: tokens.color.peach, fontWeight: '800' }, statusValue: { fontSize: 11, fontWeight: '700', color: tokens.color.text, marginTop: 5 }, statusHint: { fontSize: 9, lineHeight: 13, color: tokens.color.muted, marginTop: 4 },
  workspace: { flex: 1, marginLeft: -6, borderTopRightRadius: 34, borderBottomRightRadius: 34, borderTopLeftRadius: 28, borderBottomLeftRadius: 28, backgroundColor: 'rgba(249,247,242,.72)', shadowColor: '#8B7D69', shadowOpacity: .18, shadowRadius: 30, shadowOffset: { width: -4, height: 8 } }, content: { padding: 28, gap: 24, minHeight: '100%' },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 24 }, topActions: { gap: 10, alignItems: 'flex-end' }, topCompact: { flexDirection: 'column' }, eyebrow: { fontSize: 9, fontWeight: '800', letterSpacing: 1.4, color: tokens.color.peach }, title: { fontSize: 30, fontWeight: '700', letterSpacing: -1, color: tokens.color.text, marginTop: 8 }, subtitle: { maxWidth: 620, fontSize: 12, lineHeight: 18, color: tokens.color.muted, marginTop: 7 }, mobileCapability: { marginTop: 9, fontSize: 9, fontWeight: '700', color: tokens.color.peach },
  mainGrid: { flexDirection: 'row', gap: 18, alignItems: 'flex-start' }, mainGridCompact: { flexDirection: 'column' }, canvasCard: { flex: 1, minWidth: 0 }, sideRail: { width: 290, maxWidth: '100%', gap: 14 },
  stateCard: { minHeight: 430, padding: 28, borderRadius: 26, backgroundColor: 'rgba(255,255,255,.74)', borderWidth: 1, borderColor: tokens.color.line, justifyContent: 'center', alignItems: 'flex-start' }, stateTitle: { marginTop: 10, fontSize: 24, fontWeight: '700', color: tokens.color.text }, stateBody: { marginTop: 8, maxWidth: 520, fontSize: 11, lineHeight: 17, color: tokens.color.muted },
  photoCard: { padding: 12, borderRadius: 22, backgroundColor: tokens.color.surface, borderWidth: 1, borderColor: 'rgba(255,255,255,.78)' }, photo: { width: '100%', height: 168, marginTop: 9, borderRadius: 16, backgroundColor: '#E9E6DD' }, photoHint: { marginTop: 7, fontSize: 8, lineHeight: 12, color: tokens.color.muted },
  glassCard: { padding: 20, borderRadius: 24, backgroundColor: tokens.color.surface, borderWidth: 1, borderColor: 'rgba(255,255,255,.78)', shadowColor: tokens.color.shadow, shadowOpacity: .10, shadowRadius: 18, shadowOffset: { width: 0, height: 8 } }, confidenceCard: { padding: 18, borderRadius: 22, backgroundColor: 'rgba(224,225,210,.55)', borderWidth: 1, borderColor: tokens.color.line }, cardEyebrow: { fontSize: 9, fontWeight: '800', letterSpacing: 1.1, color: tokens.color.peach }, cardTitle: { fontSize: 18, fontWeight: '700', color: tokens.color.text, marginTop: 8 }, cardBody: { fontSize: 11, lineHeight: 17, color: tokens.color.muted, marginTop: 8 }, metric: { fontSize: 20, color: tokens.color.success, fontWeight: '800', marginTop: 7 }, metricNeutral: { color: tokens.color.text }, benefit: { alignSelf: 'flex-start', backgroundColor: 'rgba(207,229,236,.72)', paddingVertical: 6, paddingHorizontal: 10, borderRadius: 12, marginTop: 13 }, benefitText: { fontSize: 9, fontWeight: '700', color: tokens.color.blue }, primary: { marginTop: 16, backgroundColor: tokens.color.blue, paddingVertical: 11, paddingHorizontal: 14, borderRadius: 14, alignItems: 'center' }, primaryText: { color: 'white', fontSize: 11, fontWeight: '800' },
  actionRow: { flexDirection: 'row', alignItems: 'center', gap: 8 }, actionGrow: { flex: 1 }, secondaryButton: { marginTop: 16, borderWidth: 1, borderColor: tokens.color.line, paddingVertical: 11, paddingHorizontal: 12, borderRadius: 14 }, secondaryText: { fontSize: 10, fontWeight: '700', color: tokens.color.muted }, disabled: { opacity: .55 },
  errorBanner: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, padding: 12, borderRadius: 14, backgroundColor: 'rgba(168,69,69,.08)', borderWidth: 1, borderColor: 'rgba(168,69,69,.18)' }, errorText: { flex: 1, fontSize: 10, lineHeight: 15, color: '#8C3E35' }, errorAction: { fontSize: 10, fontWeight: '800', color: tokens.color.blue },
  footerRow: { marginTop: 'auto', paddingTop: 8, flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: tokens.color.line }, footerText: { fontSize: 9, color: tokens.color.muted }
});
