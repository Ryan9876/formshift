import { type OpenShelvingPlanDraft, type SpatialSnapshot } from '@formshift/domain';
import React, { useMemo, useState } from 'react';
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
  const [frame, setFrame] = useState({ width: 0, height: 0 });
  const projection = useMemo(() => plan ? projectBuild(snapshot, plan, frame.width, frame.height) : null, [snapshot, plan, frame]);

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
        <View style={styles.photoStage} onLayout={(event) => setFrame(event.nativeEvent.layout)}>
          <Image source={{ uri: photoUrl }} resizeMode="cover" style={styles.photo} />
          {view === 'augmented' && projection && plan ? (
            <View
              pointerEvents="none"
              style={[
                styles.overlay,
                {
                  left: projection.left,
                  top: projection.top,
                  width: projection.width,
                  height: projection.height,
                  transform: [{ perspective: 900 }, { rotateY: `${projection.rotateY}deg` }],
                },
              ]}
            >
              <ShelvingRender plan={plan} />
              <View style={styles.contactShadow} />
            </View>
          ) : null}
          <View style={styles.photoLegend}>
            <Text style={styles.photoLegendTitle}>{view === 'before' ? 'Source capture' : 'Estimated augmentation'}</Text>
            <Text style={styles.photoLegendText}>
              {view === 'before'
                ? 'Original private room photo.'
                : 'Visual projection from validated dimensions and placement. Use Plan for exact fit and clearance.'}
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

function projectBuild(snapshot: SpatialSnapshot, plan: OpenShelvingPlanDraft, frameWidth: number, frameHeight: number) {
  if (!frameWidth || !frameHeight) return null;
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
  const perspectiveScale = 1 - zNorm * 0.28;
  const width = clamp((plan.geometry.widthMm / roomWidth) * frameWidth * 1.45 * perspectiveScale, 90, frameWidth * 0.72);
  const height = clamp((plan.geometry.heightMm / ceiling) * frameHeight * 0.74 * perspectiveScale, 120, frameHeight * 0.78);
  const centerX = frameWidth * (0.12 + xNorm * 0.76);
  const floorY = frameHeight * (0.9 - zNorm * 0.24);
  return {
    width,
    height,
    left: clamp(centerX - width / 2, 8, frameWidth - width - 8),
    top: clamp(floorY - height, 8, frameHeight - height - 8),
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
  photo: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, width: '100%', height: '100%' },
  overlay: { position: 'absolute', zIndex: 4 },
  shelfOuter: { flex: 1, position: 'relative', shadowColor: '#1A1712', shadowOpacity: .36, shadowRadius: 15, shadowOffset: { width: 7, height: 10 } },
  shelfBack: { position: 'absolute', left: '7%', right: '7%', top: '4%', bottom: '4%', backgroundColor: 'rgba(168,125,78,.50)', borderRadius: 2 },
  woodPanel: { position: 'absolute', backgroundColor: '#B9824D', borderColor: '#8F6037', borderWidth: 1 },
  sideLeft: { left: 0, top: 0, bottom: 0, width: '8%' },
  sideRight: { right: 0, top: 0, bottom: 0, width: '8%', backgroundColor: '#9D6D40' },
  topPanel: { left: 0, right: 0, top: 0, height: '4.8%' },
  bottomPanel: { left: 0, right: 0, bottom: 0, height: '5.2%', backgroundColor: '#A97243' },
  woodShelf: { position: 'absolute', left: '7%', right: '7%', backgroundColor: '#BC8753', borderTopWidth: 1, borderTopColor: '#D7AD7A', borderBottomWidth: 1, borderBottomColor: '#84562F', zIndex: 3 },
  edgeHighlight: { position: 'absolute', left: '8%', top: '5%', bottom: '5%', width: 1, backgroundColor: 'rgba(255,235,205,.55)' },
  contactShadow: { position: 'absolute', left: '7%', right: '-8%', bottom: '-4%', height: '7%', borderRadius: 999, backgroundColor: 'rgba(30,24,18,.22)', transform: [{ scaleX: 1.12 }] },
  dimensionWidth: { position: 'absolute', bottom: -23, alignSelf: 'center', backgroundColor: 'rgba(255,255,255,.94)', paddingHorizontal: 7, paddingVertical: 3, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(13,116,150,.35)' },
  dimensionHeight: { position: 'absolute', right: -42, top: '44%', backgroundColor: 'rgba(255,255,255,.94)', paddingHorizontal: 7, paddingVertical: 3, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(13,116,150,.35)' },
  dimensionText: { color: tokens.color.blue, fontSize: 8, fontWeight: '800' },
  photoLegend: { position: 'absolute', left: 14, bottom: 14, maxWidth: 340, paddingHorizontal: 12, paddingVertical: 9, borderRadius: 13, backgroundColor: 'rgba(250,249,246,.88)', borderWidth: 1, borderColor: 'rgba(255,255,255,.7)' },
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
