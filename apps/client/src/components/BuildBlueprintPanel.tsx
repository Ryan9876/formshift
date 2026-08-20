import { mmToInches, type OpenShelvingPlanDraft } from '@formshift/domain';
import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { tokens } from '../theme/tokens';

export function BuildBlueprintPanel({ plan }: { plan: OpenShelvingPlanDraft }) {
  const frontWidth = clamp(92, 190, 190 * (plan.geometry.widthMm / plan.geometry.heightMm));
  const sideWidth = clamp(44, 100, 190 * (plan.geometry.depthMm / plan.geometry.heightMm));
  const topHeight = clamp(48, 112, 190 * (plan.geometry.depthMm / plan.geometry.widthMm));
  const shelfLines = Array.from({ length: plan.geometry.interiorShelves }, (_, index) =>
    18 + ((index + 1) / (plan.geometry.interiorShelves + 1)) * 184,
  );

  return (
    <View style={styles.sheet}>
      <View style={styles.titleBlock}>
        <View>
          <Text style={styles.eyebrow}>AUTHORITATIVE PLAN · BUILD-PLAN-1</Text>
          <Text style={styles.title}>{plan.object.label}</Text>
          <Text style={styles.subtitle}>Retained geometry · planning status · dimensions shown are authoritative</Text>
        </View>
        <View style={styles.titleMeta}>
          <Text style={styles.metaLabel}>OVERALL</Text>
          <Text style={styles.metaValue}>{fmt(plan.geometry.widthMm)} W × {fmt(plan.geometry.heightMm)} H × {fmt(plan.geometry.depthMm)} D</Text>
          <Text style={styles.metaLabel}>ARCHETYPE</Text>
          <Text style={styles.metaValue}>Open shelving · {plan.archetypeVersion}</Text>
        </View>
      </View>

      <View style={styles.viewsRow}>
        <DrawingCard title="Front elevation" footer={`${fmt(plan.geometry.widthMm)} × ${fmt(plan.geometry.heightMm)}`}>
          <View style={styles.drawingStage}>
            <View style={[styles.frontFrame, { width: frontWidth }]}>
              {shelfLines.map((top, index) => (
                <View key={index} style={[styles.shelfLine, { top }]} />
              ))}
            </View>
            <Text style={[styles.dimLabel, styles.heightDim]}>{fmt(plan.geometry.heightMm)}</Text>
            <Text style={styles.widthDim}>{fmt(plan.geometry.widthMm)}</Text>
          </View>
        </DrawingCard>

        <DrawingCard title="Side elevation" footer={`${fmt(plan.geometry.depthMm)} deep`}>
          <View style={styles.drawingStage}>
            <View style={[styles.frontFrame, { width: sideWidth }]} />
            <Text style={[styles.dimLabel, styles.heightDim]}>{fmt(plan.geometry.heightMm)}</Text>
            <Text style={styles.widthDim}>{fmt(plan.geometry.depthMm)}</Text>
          </View>
        </DrawingCard>

        <DrawingCard title="Top view" footer="Placement footprint">
          <View style={styles.topStage}>
            <View style={[styles.topFrame, { height: topHeight }]} />
            <Text style={styles.topWidth}>{fmt(plan.geometry.widthMm)}</Text>
            <Text style={styles.topDepth}>{fmt(plan.geometry.depthMm)}</Text>
          </View>
        </DrawingCard>
      </View>

      <View style={styles.notesGrid}>
        <View style={styles.noteCard}>
          <Text style={styles.noteTitle}>Construction notes</Text>
          <Text style={styles.note}>• Nominal 3/4 in plywood ({fmt(plan.geometry.panelThicknessMm)} actual design thickness).</Text>
          <Text style={styles.note}>• {plan.geometry.interiorShelves} interior shelves; clear span {fmt(plan.geometry.interiorSpanMm)}.</Text>
          <Text style={styles.note}>• Two rear stretchers included for basic carcass rigidity.</Text>
          <Text style={styles.note}>• No optimized cut nesting is claimed in this release.</Text>
        </View>
        <View style={styles.noteCard}>
          <Text style={styles.noteTitle}>Verification legend</Text>
          <Legend label="Solid geometry" detail="Deterministic plan geometry" />
          <Legend label="Blue dimensions" detail="Authoritative design dimensions" />
          <Legend label="Planning status" detail="Verify stock, site and as-built conditions before construction" />
        </View>
      </View>
    </View>
  );
}

export function BuildCutListTable({ plan }: { plan: OpenShelvingPlanDraft }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      <View style={styles.table}>
        <View style={[styles.tableRow, styles.tableHeader]}>
          <Text style={[styles.cell, styles.partCell, styles.headerText]}>Part</Text>
          <Text style={[styles.cell, styles.qtyCell, styles.headerText]}>Qty</Text>
          <Text style={[styles.cell, styles.dimensionCell, styles.headerText]}>Dimensions</Text>
          <Text style={[styles.cell, styles.materialCell, styles.headerText]}>Material</Text>
          <Text style={[styles.cell, styles.notesCell, styles.headerText]}>Notes</Text>
        </View>
        {plan.components.map((component) => (
          <View key={component.componentKey} style={styles.tableRow}>
            <Text style={[styles.cell, styles.partCell]}>{component.label}</Text>
            <Text style={[styles.cell, styles.qtyCell]}>{component.quantity}</Text>
            <Text style={[styles.cell, styles.dimensionCell]}>{fmt(component.dimensionsJson.lengthMm)} × {fmt(component.dimensionsJson.widthMm)} × {fmt(component.dimensionsJson.thicknessMm)}</Text>
            <Text style={[styles.cell, styles.materialCell]}>3/4 in plywood</Text>
            <Text style={[styles.cell, styles.notesCell]}>{component.cutNotes}</Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

function DrawingCard({ title, footer, children }: { title: string; footer: string; children: React.ReactNode }) {
  return (
    <View style={styles.drawingCard}>
      <Text style={styles.drawingTitle}>{title}</Text>
      {children}
      <Text style={styles.drawingFooter}>{footer}</Text>
    </View>
  );
}

function Legend({ label, detail }: { label: string; detail: string }) {
  return (
    <View style={styles.legendRow}>
      <View style={styles.legendLine} />
      <View style={{ flex: 1 }}>
        <Text style={styles.legendLabel}>{label}</Text>
        <Text style={styles.legendDetail}>{detail}</Text>
      </View>
    </View>
  );
}

function fmt(mm: number) {
  const inches = mmToInches(mm);
  const rounded = Math.round(inches * 10) / 10;
  return `${rounded}"`;
}
function clamp(min: number, max: number, value: number) {
  return Math.max(min, Math.min(max, value));
}

const styles = StyleSheet.create({
  sheet: {
    backgroundColor: '#FBFAF6',
    borderWidth: 1,
    borderColor: 'rgba(42,61,66,.16)',
    borderRadius: 18,
    padding: 18,
    gap: 18,
  },
  titleBlock: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 18,
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(42,61,66,.16)',
    paddingBottom: 14,
  },
  eyebrow: { fontSize: 9, fontWeight: '800', letterSpacing: 1.3, color: tokens.color.blue },
  title: { marginTop: 5, fontSize: 18, fontWeight: '800', color: tokens.color.text },
  subtitle: { marginTop: 4, fontSize: 10, color: tokens.color.muted },
  titleMeta: { minWidth: 220, gap: 2 },
  metaLabel: { fontSize: 8, fontWeight: '800', color: tokens.color.peach, marginTop: 3 },
  metaValue: { fontSize: 10, fontWeight: '700', color: tokens.color.text },
  viewsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  drawingCard: {
    flexGrow: 1,
    flexBasis: 220,
    minWidth: 210,
    borderWidth: 1,
    borderColor: 'rgba(42,61,66,.12)',
    borderRadius: 14,
    padding: 12,
    backgroundColor: '#FFFDF8',
  },
  drawingTitle: { fontSize: 10, fontWeight: '800', color: tokens.color.text },
  drawingFooter: { marginTop: 8, fontSize: 9, fontWeight: '700', color: tokens.color.muted, textAlign: 'center' },
  drawingStage: { height: 258, justifyContent: 'center', alignItems: 'center', position: 'relative' },
  frontFrame: {
    height: 220,
    borderWidth: 2,
    borderColor: '#26373D',
    position: 'relative',
    backgroundColor: 'rgba(255,255,255,.34)',
  },
  shelfLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: '#26373D',
  },
  dimLabel: {
    position: 'absolute',
    color: tokens.color.blue,
    fontSize: 9,
    fontWeight: '800',
  },
  heightDim: { right: 2, top: 112 },
  widthDim: {
    position: 'absolute',
    bottom: 2,
    color: tokens.color.blue,
    fontSize: 9,
    fontWeight: '800',
  },
  topStage: { height: 258, justifyContent: 'center', alignItems: 'center', position: 'relative' },
  topFrame: {
    width: 190,
    borderWidth: 2,
    borderColor: '#26373D',
    backgroundColor: 'rgba(13,116,150,.06)',
  },
  topWidth: {
    position: 'absolute',
    bottom: 44,
    color: tokens.color.blue,
    fontSize: 9,
    fontWeight: '800',
  },
  topDepth: {
    position: 'absolute',
    right: 4,
    color: tokens.color.blue,
    fontSize: 9,
    fontWeight: '800',
  },
  notesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  noteCard: {
    flex: 1,
    minWidth: 240,
    padding: 12,
    backgroundColor: 'rgba(241,238,231,.55)',
    borderRadius: 12,
    gap: 5,
  },
  noteTitle: { fontSize: 10, fontWeight: '800', color: tokens.color.text, marginBottom: 2 },
  note: { fontSize: 9, lineHeight: 14, color: tokens.color.muted },
  legendRow: { flexDirection: 'row', gap: 9, alignItems: 'center', marginTop: 3 },
  legendLine: { width: 28, height: 2, backgroundColor: tokens.color.blue },
  legendLabel: { fontSize: 9, fontWeight: '800', color: tokens.color.text },
  legendDetail: { fontSize: 8, color: tokens.color.muted, marginTop: 1 },
  table: { minWidth: 840 },
  tableHeader: { backgroundColor: 'rgba(13,116,150,.06)' },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(42,61,66,.10)',
    minHeight: 44,
    alignItems: 'center',
  },
  cell: { paddingHorizontal: 10, paddingVertical: 9, fontSize: 10, color: tokens.color.text },
  headerText: { fontWeight: '800', color: tokens.color.muted },
  partCell: { width: 150, fontWeight: '700' },
  qtyCell: { width: 54, textAlign: 'center' },
  dimensionCell: { width: 220, fontVariant: ['tabular-nums'] },
  materialCell: { width: 150 },
  notesCell: { width: 260, color: tokens.color.muted },
});
