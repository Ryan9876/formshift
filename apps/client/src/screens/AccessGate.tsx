import React from 'react';
import { ActivityIndicator, Pressable, SafeAreaView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { BrandMark } from '../components/BrandMark';
import { useAuth } from '../auth/AuthProvider';
import { tokens } from '../theme/tokens';
import { FormShiftHome } from './FormShiftHome';

export function AccessGate() {
  const auth = useAuth();
  const { width } = useWindowDimensions();
  const compact = width < 720;

  if (!auth.configured) {
    return <GateCard compact={compact} eyebrow="SETUP REQUIRED" title="FormShift is ready for its private backend." body="A dedicated Supabase project has not been connected yet. The application intentionally remains gated rather than falling back to an insecure local session." />;
  }
  if (auth.loading) {
    return <GateCard compact={compact} eyebrow="FORMSHIFT" title="Checking your session…" body="Private project access is verified before the workspace opens." loading />;
  }
  if (!auth.session) {
    return (
      <GateCard compact={compact} eyebrow="PRIVATE BETA" title="Shape the space around you." body="Sign in with an approved account. Authentication alone does not grant access; FormShift also checks the private allowlist.">
        <Pressable accessibilityRole="button" onPress={() => { void auth.signInWithGoogle().catch(() => undefined); }} style={styles.primary}><Text style={styles.primaryText}>Continue with Google</Text></Pressable>
        {auth.error ? <Text accessibilityRole="alert" style={styles.error}>{auth.error}</Text> : null}
      </GateCard>
    );
  }
  if (auth.access === 'unknown' || auth.access === 'pending') {
    return <GateCard compact={compact} eyebrow="ACCESS PENDING" title="Your account is signed in." body="This account has not been approved for FormShift yet. Access is controlled separately from Google authentication."><Pressable onPress={() => void auth.signOut()} style={styles.secondary}><Text style={styles.secondaryText}>Sign out</Text></Pressable></GateCard>;
  }
  if (auth.access !== 'active') {
    return <GateCard compact={compact} eyebrow="ACCESS UNAVAILABLE" title="This account cannot open FormShift." body={`Current access state: ${auth.access}. Contact the FormShift owner if this should be changed.`}><Pressable onPress={() => void auth.signOut()} style={styles.secondary}><Text style={styles.secondaryText}>Sign out</Text></Pressable></GateCard>;
  }
  return <FormShiftHome />;
}

function GateCard({ eyebrow, title, body, loading = false, children, compact = false }: { eyebrow: string; title: string; body: string; loading?: boolean; children?: React.ReactNode; compact?: boolean }) {
  return (
    <SafeAreaView style={styles.page}>
      <View style={styles.hazeA} /><View style={styles.hazeB} />
      <View style={[styles.outer, compact && styles.outerCompact]}>
        <View style={[styles.recessedRail, compact && styles.railCompact]}>
          <View style={styles.brandRow}><BrandMark size={42} /><View><Text style={styles.brand}>FormShift</Text><Text style={styles.tagline}>Shape the space around you.</Text></View></View>
          <Text style={styles.railText}>Private spatial planning · web + iOS</Text>
        </View>
        <View style={[styles.card, compact && styles.cardCompact]}>
          <Text style={styles.eyebrow}>{eyebrow}</Text>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.body}>{body}</Text>
          {loading ? <ActivityIndicator color={tokens.color.blue} style={{ marginTop: 24 }} /> : null}
          {children ? <View style={styles.actions}>{children}</View> : null}
          <Text style={styles.privacy}>Room images and spatial data remain private to authorized project members.</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: tokens.color.canvasA },
  hazeA: { position: 'absolute', width: 520, height: 520, borderRadius: 520, backgroundColor: 'rgba(204,211,177,.22)', top: -210, right: -140 },
  hazeB: { position: 'absolute', width: 440, height: 440, borderRadius: 440, backgroundColor: 'rgba(205,181,151,.17)', bottom: -180, left: -80 },
  outer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 22, flexDirection: 'row' },
  outerCompact: { flexDirection: 'column', padding: 12 },
  recessedRail: { width: 250, minHeight: 410, padding: 26, borderTopLeftRadius: 34, borderBottomLeftRadius: 34, borderTopRightRadius: 12, borderBottomRightRadius: 12, backgroundColor: tokens.color.nav, borderWidth: 1, borderColor: 'rgba(38,43,42,.08)', justifyContent: 'space-between' },
  railCompact: { width: '100%', minHeight: 100, borderRadius: 26, padding: 18 },
  card: { width: 500, maxWidth: '72%', minHeight: 450, marginLeft: -8, padding: 42, borderRadius: 34, backgroundColor: 'rgba(250,248,244,.82)', borderWidth: 1, borderColor: 'rgba(255,255,255,.84)', justifyContent: 'center', shadowColor: '#8B7D69', shadowOpacity: .18, shadowRadius: 32, shadowOffset: { width: -5, height: 12 } },
  cardCompact: { width: '100%', maxWidth: '100%', minHeight: 430, marginLeft: 0, marginTop: -5, padding: 28, borderRadius: 28 },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 12 }, brand: { fontSize: 20, fontWeight: '800', color: tokens.color.text }, tagline: { fontSize: 10, color: tokens.color.peach, marginTop: 2 }, railText: { fontSize: 10, lineHeight: 15, color: tokens.color.muted },
  eyebrow: { fontSize: 10, fontWeight: '800', letterSpacing: 1.5, color: tokens.color.peach }, title: { fontSize: 32, lineHeight: 38, fontWeight: '700', letterSpacing: -1.1, color: tokens.color.text, marginTop: 12 }, body: { fontSize: 13, lineHeight: 20, color: tokens.color.muted, marginTop: 12, maxWidth: 410 },
  actions: { marginTop: 28, gap: 10, maxWidth: 310 }, primary: { backgroundColor: tokens.color.blue, paddingHorizontal: 18, paddingVertical: 13, borderRadius: 15, alignItems: 'center' }, primaryText: { color: '#fff', fontWeight: '800', fontSize: 12 }, secondary: { backgroundColor: 'rgba(255,255,255,.70)', borderColor: tokens.color.line, borderWidth: 1, paddingHorizontal: 18, paddingVertical: 13, borderRadius: 15, alignItems: 'center' }, secondaryText: { color: tokens.color.text, fontWeight: '700', fontSize: 12 },
  error: { color: '#8C3E35', fontSize: 10, lineHeight: 15, marginTop: 4 },
  privacy: { marginTop: 30, paddingTop: 16, borderTopWidth: 1, borderTopColor: tokens.color.line, color: tokens.color.peach, fontSize: 9, lineHeight: 14 }
});
