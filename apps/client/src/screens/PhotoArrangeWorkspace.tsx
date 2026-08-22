import { router } from 'expo-router';
import React from 'react';
import { ActivityIndicator, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { BrandMark } from '../components/BrandMark';
import { PhotoArrangeEditor } from '../components/PhotoArrangeEditor';
import { PreparedSceneEditor } from '../components/PreparedSceneEditor';
import { useRoomWorkspace } from '../data/useRoomWorkspace';
import { SceneIntelligencePanel } from '../scene/SceneIntelligencePanel';
import { preparedSceneQueryEnabled, sceneFeatureFlags } from '../scene/featureFlags';
import { tokens } from '../theme/tokens';

export function PhotoArrangeWorkspace() {
  const workspace = useRoomWorkspace();
  const flags = sceneFeatureFlags();
  const [queryPrepared, setQueryPrepared] = React.useState<boolean | null>(flags.preparedSceneV1 ? true : null);

  React.useEffect(() => {
    if (flags.preparedSceneV1) {
      setQueryPrepared(true);
      return;
    }
    setQueryPrepared(preparedSceneQueryEnabled());
  }, [flags.preparedSceneV1]);

  const editorChoiceResolved = flags.preparedSceneV1 || queryPrepared !== null;
  const preparedSceneEnabled = flags.preparedSceneV1 || queryPrepared === true;

  return (
    <SafeAreaView style={styles.page}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <View style={styles.brandRow}>
            <BrandMark size={38} />
            <View><Text style={styles.brand}>FormShift</Text><Text style={styles.kicker}>PHOTO ARRANGE</Text></View>
          </View>
          <View style={styles.headerCopy}>
            <Text style={styles.h1}>Move what is actually in the room.</Text>
            <Text style={styles.sub}>{preparedSceneEnabled ? 'FormShift prepares recognized objects as independent photo layers while the room loads, so you can tap and move them without repeating the lift workflow.' : 'Tap a photographed object to isolate its real pixels, review the focused selection, lift it, and rearrange it directly in the room photo.'}</Text>
          </View>
          <Pressable style={styles.back} onPress={() => router.replace('/')}><Text style={styles.backText}>Back to Studio</Text></Pressable>
        </View>

        {workspace.loading || !editorChoiceResolved ? (
          <View style={styles.state}><ActivityIndicator color={tokens.color.blue}/><Text style={styles.stateText}>{workspace.loading ? 'Loading room photo…' : 'Opening Arrange…'}</Text></View>
        ) : !workspace.workingSnapshot ? (
          <View style={styles.state}><Text style={styles.stateTitle}>Create the room first.</Text><Text style={styles.stateText}>Arrange keeps the photo primary, but the room still needs a canonical spatial version underneath it.</Text></View>
        ) : preparedSceneEnabled ? (
          <PreparedSceneEditor
            photoUrl={workspace.photoUrl}
            snapshot={workspace.workingSnapshot}
            projectId={workspace.project?.id}
            spaceId={workspace.space?.id}
          />
        ) : (
          <>
            <PhotoArrangeEditor
              photoUrl={workspace.photoUrl}
              snapshot={workspace.workingSnapshot}
              onSnapshotChange={workspace.setWorkingSnapshot}
              projectId={workspace.project?.id}
              spaceId={workspace.space?.id}
              baseSpatialVersionId={workspace.activeVersionId}
            />
            <SceneIntelligencePanel
              photoUrl={workspace.photoUrl}
              projectId={workspace.project?.id}
              spaceId={workspace.space?.id}
            />
          </>
        )}

        <View style={styles.note}>
          <Text style={styles.noteStrong}>{preparedSceneEnabled ? 'Prepared Scene v1 · Automatic object layers + shared clean background' : 'Photo Arrange v2.2 · Canonical editor + isolated scene foundation'}</Text>
          <Text style={styles.noteText}>{preparedSceneEnabled ? 'This preview analyzes the source photo locally, prepares recognized moveable objects, builds one derived clean background plate, and enriches object evidence with relative depth after interaction becomes available. Missed objects can still be added by tapping them. The source photo and canonical measurements remain unchanged.' : 'The validated v2.2 interaction core is preserved behind one canonical PhotoArrangeEditor boundary. Object-centered segmentation and visual treatment are now composed without the active V19/V20 DOM-observer wrapper chain. Scene Intelligence v1 remains feature-flagged and cannot mutate canonical measurements.'}</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#EEEAE1' },
  content: { padding: 10, gap: 12, minHeight: '100%' },
  header: { borderRadius: 24, paddingHorizontal: 18, paddingVertical: 14, backgroundColor: 'rgba(250,249,246,.94)', borderWidth: 1, borderColor: tokens.color.line, flexDirection: 'row', alignItems: 'center', gap: 18, flexWrap: 'wrap' },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  brand: { fontSize: 17, fontWeight: '800', color: tokens.color.text },
  kicker: { fontSize: 9, fontWeight: '800', letterSpacing: 1.15, color: tokens.color.peach },
  headerCopy: { flex: 1, minWidth: 260 },
  h1: { fontSize: 24, fontWeight: '800', color: tokens.color.text },
  sub: { marginTop: 4, fontSize: 12, lineHeight: 17, color: tokens.color.muted },
  back: { minHeight: 44, paddingHorizontal: 13, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff', borderWidth: 1, borderColor: tokens.color.line },
  backText: { fontSize: 11, fontWeight: '800', color: tokens.color.text },
  state: { minHeight: 420, padding: 30, borderRadius: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,.72)', borderWidth: 1, borderColor: tokens.color.line },
  stateTitle: { fontSize: 19, fontWeight: '800', color: tokens.color.text },
  stateText: { marginTop: 8, maxWidth: 520, textAlign: 'center', fontSize: 12, lineHeight: 17, color: tokens.color.muted },
  note: { padding: 12, borderRadius: 14, backgroundColor: 'rgba(250,249,246,.9)', borderWidth: 1, borderColor: tokens.color.line },
  noteStrong: { fontSize: 11, fontWeight: '800', color: tokens.color.text },
  noteText: { marginTop: 3, fontSize: 10, lineHeight: 15, color: tokens.color.muted },
});
