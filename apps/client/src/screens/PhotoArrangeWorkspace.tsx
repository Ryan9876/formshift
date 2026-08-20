import { router } from 'expo-router';
import React from 'react';
import { ActivityIndicator, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { BrandMark } from '../components/BrandMark';
import { PhotoArrangeEditor } from '../components/PhotoArrangeEditor';
import { useRoomWorkspace } from '../data/useRoomWorkspace';
import { tokens } from '../theme/tokens';

export function PhotoArrangeWorkspace() {
  const workspace = useRoomWorkspace();

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
            <Text style={styles.sub}>Tap a photographed object to isolate its real pixels, lift it, and rearrange it directly in the room photo.</Text>
          </View>
          <Pressable style={styles.back} onPress={() => router.replace('/')}><Text style={styles.backText}>Back to Studio</Text></Pressable>
        </View>

        {workspace.loading ? (
          <View style={styles.state}><ActivityIndicator color={tokens.color.blue}/><Text style={styles.stateText}>Loading room photo…</Text></View>
        ) : !workspace.workingSnapshot ? (
          <View style={styles.state}><Text style={styles.stateTitle}>Create the room first.</Text><Text style={styles.stateText}>Arrange keeps the photo primary, but the room still needs a canonical spatial version underneath it.</Text></View>
        ) : (
          <PhotoArrangeEditor
            photoUrl={workspace.photoUrl}
            snapshot={workspace.workingSnapshot}
            onSnapshotChange={workspace.setWorkingSnapshot}
            projectId={workspace.project?.id}
            spaceId={workspace.space?.id}
          />
        )}

        <View style={styles.note}>
          <Text style={styles.noteStrong}>Current slice</Text>
          <Text style={styles.noteText}>Web/iPhone Safari first. Object selection is local/on-device. Background cleanup can use the configured image model. Scene edits are preview-only until the next persistence release.</Text>
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
  kicker: { fontSize: 8, fontWeight: '800', letterSpacing: 1.15, color: tokens.color.peach },
  headerCopy: { flex: 1, minWidth: 260 },
  h1: { fontSize: 24, fontWeight: '800', color: tokens.color.text },
  sub: { marginTop: 4, fontSize: 10, lineHeight: 15, color: tokens.color.muted },
  back: { minHeight: 38, paddingHorizontal: 12, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff', borderWidth: 1, borderColor: tokens.color.line },
  backText: { fontSize: 9, fontWeight: '800', color: tokens.color.text },
  state: { minHeight: 420, padding: 30, borderRadius: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,.72)', borderWidth: 1, borderColor: tokens.color.line },
  stateTitle: { fontSize: 19, fontWeight: '800', color: tokens.color.text },
  stateText: { marginTop: 8, maxWidth: 520, textAlign: 'center', fontSize: 10, lineHeight: 15, color: tokens.color.muted },
  note: { padding: 12, borderRadius: 14, backgroundColor: 'rgba(250,249,246,.9)', borderWidth: 1, borderColor: tokens.color.line },
  noteStrong: { fontSize: 9, fontWeight: '800', color: tokens.color.text },
  noteText: { marginTop: 3, fontSize: 8, lineHeight: 12, color: tokens.color.muted },
});
