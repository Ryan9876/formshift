import type { Mode } from '@formshift/domain';
import { isRoomPlanSupported } from '@formshift/formshift-roomplan';
import React, { useEffect, useState } from 'react';
import { Platform, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { BrandMark } from '../components/BrandMark';
import { ModeSwitch } from '../components/ModeSwitch';
import { PlanCanvas } from '../components/PlanCanvas';
import { tokens } from '../theme/tokens';
import { useAuth } from '../auth/AuthProvider';

export function FormShiftHome() {
  const [mode, setMode] = useState<Mode>('organize');
  const [lidar, setLidar] = useState(false);
  const { width } = useWindowDimensions();
  const compact = width < 780;
  const auth = useAuth();
  useEffect(() => { isRoomPlanSupported().then(setLidar).catch(() => setLidar(false)); }, []);

  return (
    <SafeAreaView style={styles.page}>
      <View style={styles.hazeA} /><View style={styles.hazeB} />
      <View style={[styles.shell, compact && styles.shellCompact]}>
        <View style={[styles.nav, compact && styles.navCompact]}>
          <View style={styles.brandRow}><BrandMark /><View><Text style={styles.brand}>FormShift</Text><Text style={styles.tagline}>Shape the space around you.</Text></View></View>
          {!compact && <View style={styles.navList}><NavItem active label="Studio" meta="Current room"/><NavItem label="Projects" meta="Saved spaces"/><NavItem label="Measurements" meta="Verified + estimated"/><NavItem label="Exports" meta="Plans & materials"/></View>}
          {!compact && <View style={styles.statusCard}>
            <Text style={styles.statusTitle}>Capture capability</Text>
            <Text style={styles.statusValue}>{Platform.OS === 'ios' && lidar ? 'LiDAR / RoomPlan ready' : 'Photo + manual measurement'}</Text>
            <Text style={styles.statusHint}>LiDAR enhances capture; it is never required.</Text>
          </View>}
        </View>

        <ScrollView contentContainerStyle={styles.content} style={styles.workspace}>
          <View style={[styles.top, compact && styles.topCompact]}>
            <View><Text style={styles.eyebrow}>HOME OFFICE · BASELINE</Text><Text style={styles.title}>Make the room work better.</Text><Text style={styles.subtitle}>{copyFor(mode)}</Text>{compact ? <Text style={styles.mobileCapability}>{Platform.OS === 'ios' && lidar ? 'LiDAR / RoomPlan ready' : 'Photo + manual measurement'}</Text> : null}</View>
            <ModeSwitch value={mode} onChange={setMode} />
          </View>

          <View style={[styles.mainGrid, compact && styles.mainGridCompact]}>
            <View style={styles.canvasCard}><PlanCanvas editable={mode === 'arrange'} /></View>
            <View style={styles.sideRail}>
              {mode === 'organize' && <OrganizePanel />}
              {mode === 'arrange' && <ArrangePanel />}
              {mode === 'build' && <BuildPanel />}
              <View style={styles.confidenceCard}><Text style={styles.cardEyebrow}>MEASUREMENT STATE</Text><Text style={styles.metric}>Measured</Text><Text style={styles.cardBody}>Room boundary captured with mixed evidence. Build-critical dimensions still require confirmation.</Text></View>
            </View>
          </View>

          <View style={styles.footerRow}>
            <Text style={styles.footerText}>Milestone 0 · shared spatial state</Text>
            <Text style={styles.footerText}>{auth.configured ? `Auth: ${auth.session ? auth.access : 'ready'}` : 'Auth: awaiting Supabase project'}</Text>
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}
function NavItem({ label, meta, active = false }: { label: string; meta: string; active?: boolean }) { return <View style={[styles.navItem, active && styles.navItemActive]}><Text style={styles.navLabel}>{label}</Text><Text style={styles.navMeta}>{meta}</Text></View>; }
function OrganizePanel(){return <View style={styles.glassCard}><Text style={styles.cardEyebrow}>TOP OPPORTUNITY</Text><Text style={styles.cardTitle}>Open the entry path</Text><Text style={styles.cardBody}>Move storage beside the desk and group office supplies together. The proposal preserves the measured cabinet footprint.</Text><View style={styles.benefit}><Text style={styles.benefitText}>+ clearer circulation</Text></View><Pressable style={styles.primary}><Text style={styles.primaryText}>Preview result</Text></Pressable></View>}
function ArrangePanel(){return <View style={styles.glassCard}><Text style={styles.cardEyebrow}>ARRANGE</Text><Text style={styles.cardTitle}>Drag without dimension drift</Text><Text style={styles.cardBody}>Select an object on the plan and drag it. Translation changes; its physical width, depth, and height remain canonical.</Text><View style={styles.benefit}><Text style={styles.benefitText}>Skia precision editor spike</Text></View></View>}
function BuildPanel(){return <View style={styles.glassCard}><Text style={styles.cardEyebrow}>BUILD BRIEF</Text><Text style={styles.cardTitle}>Describe what the room needs</Text><Text style={styles.cardBody}>“Build a 72-inch wall shelf over the desk with adjustable storage below.” AI converts the brief to structured requirements; deterministic geometry decides what fits.</Text><Pressable style={styles.primary}><Text style={styles.primaryText}>Start a build</Text></Pressable></View>}
function copyFor(mode: Mode) { if(mode==='organize') return 'FormShift is already looking for better placement, access, grouping, and use of the available space.'; if(mode==='arrange') return 'Move and add objects directly while the spatial model protects their measured dimensions.'; return 'Describe an item to build. FormShift will design, place, dimension, price, and estimate the effort.'; }
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
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 24 }, topCompact: { flexDirection: 'column' }, eyebrow: { fontSize: 9, fontWeight: '800', letterSpacing: 1.4, color: tokens.color.peach }, title: { fontSize: 30, fontWeight: '700', letterSpacing: -1, color: tokens.color.text, marginTop: 8 }, subtitle: { maxWidth: 620, fontSize: 12, lineHeight: 18, color: tokens.color.muted, marginTop: 7 }, mobileCapability: { marginTop: 9, fontSize: 9, fontWeight: '700', color: tokens.color.peach },
  mainGrid: { flexDirection: 'row', gap: 18, alignItems: 'flex-start' }, mainGridCompact: { flexDirection: 'column' }, canvasCard: { flex: 1, minWidth: 0 }, sideRail: { width: 290, maxWidth: '100%', gap: 14 },
  glassCard: { padding: 20, borderRadius: 24, backgroundColor: tokens.color.surface, borderWidth: 1, borderColor: 'rgba(255,255,255,.78)', shadowColor: tokens.color.shadow, shadowOpacity: .10, shadowRadius: 18, shadowOffset: { width: 0, height: 8 } }, confidenceCard: { padding: 18, borderRadius: 22, backgroundColor: 'rgba(224,225,210,.55)', borderWidth: 1, borderColor: tokens.color.line }, cardEyebrow: { fontSize: 9, fontWeight: '800', letterSpacing: 1.1, color: tokens.color.peach }, cardTitle: { fontSize: 18, fontWeight: '700', color: tokens.color.text, marginTop: 8 }, cardBody: { fontSize: 11, lineHeight: 17, color: tokens.color.muted, marginTop: 8 }, metric: { fontSize: 20, color: tokens.color.success, fontWeight: '800', marginTop: 7 }, benefit: { alignSelf: 'flex-start', backgroundColor: 'rgba(207,229,236,.72)', paddingVertical: 6, paddingHorizontal: 10, borderRadius: 12, marginTop: 13 }, benefitText: { fontSize: 9, fontWeight: '700', color: tokens.color.blue }, primary: { marginTop: 16, backgroundColor: tokens.color.blue, paddingVertical: 11, paddingHorizontal: 14, borderRadius: 14, alignItems: 'center' }, primaryText: { color: 'white', fontSize: 11, fontWeight: '800' },
  footerRow: { marginTop: 'auto', paddingTop: 8, flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: tokens.color.line }, footerText: { fontSize: 9, color: tokens.color.muted }
});
