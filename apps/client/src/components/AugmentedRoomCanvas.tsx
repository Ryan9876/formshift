import { type OpenShelvingPlanDraft, type SpatialSnapshot } from '@formshift/domain';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { PlanCanvas } from './PlanCanvas';
import { tokens } from '../theme/tokens';

export type SceneView = 'before' | 'augmented' | 'plan';

export function AugmentedRoomCanvas({
  photoUrl,
  snapshot,
  plan,
  editablePlan,
  editableObjectId,
  onSnapshotChange,
}: {
  photoUrl?: string | null;
  snapshot: SpatialSnapshot;
  plan: OpenShelvingPlanDraft | null;
  editablePlan?: boolean;
  editableObjectId?: string;
  onSnapshotChange?: (snapshot: SpatialSnapshot) => void;
}) {
  const [view, setView] = useState<SceneView>(photoUrl ? 'augmented' : 'plan');
  const autoSelected = useRef(false);
  const projection = useMemo(() => plan ? projectBuild(snapshot, plan) : null, [snapshot, plan]);

  useEffect(() => {
    if (photoUrl && plan && !autoSelected.current) {
      autoSelected.current = true;
      setView('augmented');
    }
  }, [photoUrl, plan]);

  return (
    <View style={styles.shell}>
      <View style={styles.toolbar}>
        <View>
          <Text style={styles.eyebrow}>ROOM VIEW</Text>
          <Text style={styles.title}>{view === 'before' ? 'Original photo' : view === 'augmented' ? 'Augmented room' : 'Measured plan'}</Text>
        </View>
        <View style={styles.segmented}>
          <SceneButton label="Before" selected={view === 'before'} disabled={!photoUrl} onPress={() => setView('before')} />
          <SceneButton label="Augmented" selected={view === 'augmented'} disabled={!photoUrl} onPress={() => setView('augmented')} />
          <SceneButton label="Plan" selected={view === 'plan'} onPress={() => setView('plan')} />
        </View>
      </View>

      {view === 'plan' ? (
        <View style={styles.planWrap}>
          <PlanCanvas
            snapshot={snapshot}
            editable={!!editablePlan}
            editableObjectIds={editableObjectId ? [editableObjectId] : undefined}
            onSnapshotChange={onSnapshotChange}
          />
        </View>
      ) : photoUrl ? (
        <View style={styles.photoStage}>
          <Image source={{ uri: photoUrl }} resizeMode="cover" style={styles.photo} />

          {view === 'augmented' && projection && plan ? (
            <View
              pointerEvents="none"
              style={[
                styles.overlay,
                {
                  left: `${projection.leftPct}%`,
                  top: `${projection.topPct}%`,
                  width: `${projection.widthPct}%`,
                  height: `${projection.heightPct}%`,
                  transform: [{ perspective: 900 }, { rotateY: `${projection.rotateY}deg` }],
                },
              ]}
            >
              <View style={styles.augmentationTag}><Text style={styles.augmentationTagText}>PROPOSED BUILD</Text></View>
              <ShelvingRender plan={plan} />
              <View style={styles.contactShadow} />
            </View>
          ) : null}

          {view === 'augmented' && !plan ? (
            <View style={styles.noPlanBanner}>
              <Text style={styles.noPlanTitle}>No build is available to augment yet.</Text>
              <Text style={styles.noPlanText}>Generate a Build plan or load a previously accepted one.</Text>
            </View>
          ) : null}

          <View style={styles.photoLegend}>
            <Text style={styles.photoLegendTitle}>{view === 'before' ? 'Source capture' : 'Estimated augmentation'}</Text>
            <Text style={styles.photoLegendText}>
              {view === 'before'
                ? 'Original private room photo.'
                : plan
                  ? `${plan.object.label} is projected from its validated dimensions and room placement. Use Plan for exact fit and clearance.`
                  : 'The source room is ready. Generate or restore a Build plan to add the augmented object.'}
            </Text>
          </View>
        </View>
      ) : (
        <View style={styles.noPhoto}>
          <Text style={styles.noPhotoTitle}>Add a room photo to use augmentation.</Text>
          <Text style={styles.noPhotoText}>The measured plan remains available until a source photo is captured for this room.</Text>
          <Pressable style={styles.planAction} onPress={() => setView('plan')}><Text style={styles.planActionText}>Open measured plan</Text></Pressable>
        </View>
      )}

      <View style={styles.footer}>
        <Text style={styles.footerStrong}>{view === 'plan' ? 'Geometry authority' : 'Photo-first preview'}</Text>
        <Text style={styles.footerText}>{view === 'plan' ? 'Spatial dimensions and collision rules are authoritative.' : 'Augmented pixels are illustrative until camera calibration is available.'}</Text>
      </View>
    </View>
  );
}

function SceneButton({ label, selected, disabled, onPress }: { label: string; selected: boolean; disabled?: boolean; onPress: () => void }) {
  return (
    <Pressable disabled={disabled} onPress={onPress} style={[styles.sceneButton, selected && styles.sceneButtonActive, disabled && styles.sceneButtonDisabled]}>
      <Text style={[styles.sceneButtonText, selected && styles.sceneButtonTextActive]}>{label}</Text>
    </Pressable>
  );
}

function ShelvingRender({ plan }: { plan: OpenShelvingPlanDraft }) {
  const shelfCount = Math.max(0, plan.geometry.interiorShelves);
  const shelfThicknessPct = Math.max(2, Math.min(4.5, (plan.geometry.panelThicknessMm / plan.geometry.heightMm) * 100 * 4));

  return (
    <View style={styles.shelfOuter}>
      <View style={styles.shelfBack} />
      <View style={[styles.woodPanel, styles.sideLeft]} />
      <View style={[styles.woodPanel, styles.sideRight]} />
      <View style={[styles.woodPanel, styles.topPanel]} />
      <View style={[styles.woodPanel, styles.bottomPanel]} />
      {Array.from({ length: shelfCount }).map((_, index) => {
        const top = ((index + 1) / (shelfCount + 1)) * 100;
        return <View key={index} style={[styles.woodShelf, { top: `${top}%`, height: `${shelfThicknessPct}%` }]} />;
      })}
      <View style={styles.edgeHighlight} />
      <View style={styles.dimensionWidth}><Text style={styles.dimensionText}>{formatInches(plan.geometry.widthMm)} in</Text></View>
      <View style={styles.dimensionHeight}><Text style={styles.dimensionText}>{formatInches(plan.geometry.heightMm)} in</Text></View>
    </View>
  );
}

function projectBuild(snapshot: SpatialSnapshot, plan: OpenShelvingPlanDraft) {
  const polygon = snapshot.boundary.floorPolygon;
  if (!polygon.length) return null;

  const xs = polygon.map((point) => point.x);
  const zs = polygon.map((point) => point.z);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minZ = Math.min(...zs);
  const maxZ = Math.max(...zs);
  const roomWidth = Math.max(1, maxX - minX);
  const roomDepth = Math.max(1, maxZ - minZ);
  const ceiling = snapshot.boundary.ceilingHeightMm ?? 2438.4;

  const xNorm = clamp((plan.object.transform.translation.x - minX) / roomWidth, 0, 1);
  const zNorm = clamp((plan.object.transform.translation.z - minZ) / roomDepth, 0, 1);
  const perspectiveScale = 1 - zNorm * 0.24;
  const widthPct = clamp((plan.geometry.widthMm / roomWidth) * 100 * 1.38 * perspectiveScale, 18, 66);
  const heightPct = clamp((plan.geometry.heightMm / ceiling) * 100 * 0.9 * perspectiveScale, 30, 82);
  const centerXPct = 12 + xNorm * 76;
  const floorYPct = 92 - zNorm * 25;

  return {
    widthPct,
    heightPct,
    leftPct: clamp(centerXPct - widthPct / 2, 2, 98 - widthPct),
    topPct: clamp(floorYPct - heightPct, 2, 96 - heightPct),
    rotateY: (xNorm - 0.5) * -8,
  };
}

function clamp(value: number, min: number, max: number) { return Math.max(min, Math.min(max, value)); }
function formatInches(mm: number) { return (mm / 25.4).toFixed(Math.abs(mm / 25.4 - Math.round(mm / 25.4)) < 0.01 ? 0 : 1); }

const styles = StyleSheet.create({
  shell: { borderRadius: 24, overflow: 'hidden', backgroundColor: 'rgba(255,255,255,.68)', borderWidth: 1, borderColor: tokens.color.line },
  toolbar: { minHeight: 66, paddingHorizontal: 16, paddingVertical: 11, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, backgroundColor: 'rgba(250,249,246,.94)' },
  eyebrow: { fontSize: 8, letterSpacing: 1.1, fontWeight: '800', color: tokens.color.peach },
  title: { marginTop: 3, fontSize: 15, fontWeight: '800', color: tokens.color.text },
  segmented: { flexDirection: 'row', padding: 3, borderRadius: 12, backgroundColor: 'rgba(232,232,225,.8)', borderWidth: 1, borderColor: tokens.color.line },
  sceneButton: { paddingHorizontal: 11, paddingVertical: 7, borderRadius: 9 },
  sceneButtonActive: { backgroundColor: '#fff', shadowColor: '#253034', shadowOpacity: .08, shadowRadius: 7, shadowOffset: { width: 0, height: 2 } },
  sceneButtonDisabled: { opacity: .36 },
  sceneButtonText: { fontSize: 9, fontWeight: '700', color: tokens.color.muted },
  sceneButtonTextActive: { color: tokens.color.blue },
  photoStage: { minHeight: 480, position: 'relative', overflow: 'hidden', backgroundColor: '#D8D5CD' },
  photo: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, width: '100%', height: '100%', zIndex: 1 },
  overlay: { position: 'absolute', zIndex: 10 },
  augmentationTag: { position: 'absolute', top: -24, left: 0, zIndex: 20, borderRadius: 8, paddingHorizontal: 7, paddingVertical: 4, backgroundColor: 'rgba(13,116,150,.92)' },
  augmentationTagText: { color: '#fff', fontSize: 7, fontWeight: '800', letterSpacing: .7 },
  shelfOuter: { flex: 1, position: 'relative', shadowColor: '#1A1712', shadowOpacity: .4, shadowRadius: 16, shadowOffset: { width: 7, height: 10 } },
  shelfBack: { position: 'absolute', left: '7%', right: '7%', top: '4%', bottom: '4%', backgroundColor: 'rgba(168,125,78,.58)', borderRadius: 2 },
  woodPanel: { position: 'absolute', backgroundColor: '#B9824D', borderColor: '#75451F', borderWidth: 1.5 },
  sideLeft: { left: 0, top: 0, bottom: 0, width: '8%' },
  sideRight: { right: 0, top: 0, bottom: 0, width: '8%', backgroundColor: '#9D6D40' },
  topPanel: { left: 0, right: 0, top: 0, height: '4.8%' },
  bottomPanel: { left: 0, right: 0, bottom: 0, height: '5.2%', backgroundColor: '#A97243' },
  woodShelf: { position: 'absolute', left: '7%', right: '7%', backgroundColor: '#BC8753', borderTopWidth: 1, borderTopColor: '#F0C99A', borderBottomWidth: 1, borderBottomColor: '#70451F', zIndex: 3 },
  edgeHighlight: { position: 'absolute', left: '8%', top: '5%', bottom: '5%', width: 2, backgroundColor: 'rgba(255,235,205,.7)' },
  contactShadow: { position: 'absolute', left: '7%', right: '-8%', bottom: '-4%', height: '7%', borderRadius: 999, backgroundColor: 'rgba(30,24,18,.28)', transform: [{ scaleX: 1.12 }] },
  dimensionWidth: { position: 'absolute', bottom: -23, alignSelf: 'center', backgroundColor: 'rgba(255,255,255,.96)', paddingHorizontal: 7, paddingVertical: 3, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(13,116,150,.45)' },
  dimensionHeight: { position: 'absolute', right: -42, top: '44%', backgroundColor: 'rgba(255,255,255,.96)', paddingHorizontal: 7, paddingVertical: 3, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(13,116,150,.45)' },
  dimensionText: { color: tokens.color.blue, fontSize: 8, fontWeight: '800' },
  noPlanBanner: { position: 'absolute', zIndex: 12, top: 18, left: 18, right: 18, padding: 12, borderRadius: 12, backgroundColor: 'rgba(250,249,246,.94)', borderWidth: 1, borderColor: tokens.color.line },
  noPlanTitle: { fontSize: 10, fontWeight: '800', color: tokens.color.text },
  noPlanText: { marginTop: 3, fontSize: 8, lineHeight: 12, color: tokens.color.muted },
  photoLegend: { position: 'absolute', zIndex: 12, left: 14, bottom: 14, maxWidth: 360, paddingHorizontal: 12, paddingVertical: 9, borderRadius: 13, backgroundColor: 'rgba(250,249,246,.9)', borderWidth: 1, borderColor: 'rgba(255,255,255,.75)' },
  photoLegendTitle: { fontSize: 9, fontWeight: '800', color: tokens.color.text },
  photoLegendText: { marginTop: 3, fontSize: 8, lineHeight: 12, color: tokens.color.muted },
  planWrap: { minHeight: 480, backgroundColor: '#F7F6F2' },
  noPhoto: { minHeight: 420, alignItems: 'center', justifyContent: 'center', padding: 32, backgroundColor: '#F3F0E8' },
  noPhotoTitle: { fontSize: 18, fontWeight: '800', color: tokens.color.text, textAlign: 'center' },
  noPhotoText: { marginTop: 8, maxWidth: 460, fontSize: 11, lineHeight: 17, color: tokens.color.muted, textAlign: 'center' },
  planAction: { marginTop: 16, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, backgroundColor: tokens.color.blue },
  planActionText: { color: '#fff', fontSize: 10, fontWeight: '800' },
  footer: { paddingHorizontal: 15, paddingVertical: 10, flexDirection: 'row', flexWrap: 'wrap', gap: 6, backgroundColor: 'rgba(250,249,246,.94)', borderTopWidth: 1, borderTopColor: tokens.color.line },
  footerStrong: { fontSize: 8, fontWeight: '800', color: tokens.color.text },
  footerText: { fontSize: 8, color: tokens.color.muted },
});
