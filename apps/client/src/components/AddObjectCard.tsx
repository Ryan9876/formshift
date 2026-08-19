import { inchesToMm } from '@formshift/domain';
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { tokens } from '../theme/tokens';

type EvidenceMode = 'measured' | 'estimated';

export function AddObjectCard({
  busy,
  onAdd,
}: {
  busy: boolean;
  onAdd: (value: { label: string; category?: string; widthMm: number; depthMm: number; heightMm: number; evidence: EvidenceMode }) => Promise<void>;
}) {
  const [label, setLabel] = useState('');
  const [category, setCategory] = useState('');
  const [width, setWidth] = useState('');
  const [depth, setDepth] = useState('');
  const [height, setHeight] = useState('');
  const [evidence, setEvidence] = useState<EvidenceMode>('measured');
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setError(null);
    try {
      const widthMm = parseInches(width, 'Width');
      const depthMm = parseInches(depth, 'Depth');
      const heightMm = parseInches(height, 'Height');
      await onAdd({ label, category: category.trim() || undefined, widthMm, depthMm, heightMm, evidence });
      setLabel('');
      setCategory('');
      setWidth('');
      setDepth('');
      setHeight('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'The object could not be added.');
    }
  };

  return (
    <View style={styles.card}>
      <Text style={styles.eyebrow}>ADD OBJECT</Text>
      <Text style={styles.title}>Put real furniture on the plan.</Text>
      <Text style={styles.body}>Enter the physical dimensions. FormShift stores them as evidence and keeps them fixed when the object moves.</Text>

      <TextInput value={label} onChangeText={setLabel} placeholder="Name — e.g. Desk" style={styles.textInput} />
      <TextInput value={category} onChangeText={setCategory} placeholder="Category — optional" style={styles.textInput} />

      <View style={styles.dimensionRow}>
        <DimensionInput label="W" value={width} onChange={setWidth} placeholder="60" />
        <DimensionInput label="D" value={depth} onChange={setDepth} placeholder="30" />
        <DimensionInput label="H" value={height} onChange={setHeight} placeholder="30" />
      </View>

      <View style={styles.switchRow}>
        <Pressable onPress={() => setEvidence('measured')} style={[styles.switchButton, evidence === 'measured' && styles.switchActive]}>
          <Text style={[styles.switchText, evidence === 'measured' && styles.switchTextActive]}>Measured</Text>
        </Pressable>
        <Pressable onPress={() => setEvidence('estimated')} style={[styles.switchButton, evidence === 'estimated' && styles.switchActive]}>
          <Text style={[styles.switchText, evidence === 'estimated' && styles.switchTextActive]}>Approx.</Text>
        </Pressable>
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Pressable disabled={busy} onPress={() => void submit()} style={[styles.primary, busy && styles.disabled]}>
        <Text style={styles.primaryText}>{busy ? 'Adding…' : 'Add to room'}</Text>
      </Pressable>
    </View>
  );
}

function DimensionInput({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (value: string) => void; placeholder: string }) {
  return (
    <View style={styles.dimensionInput}>
      <Text style={styles.dimensionLabel}>{label}</Text>
      <TextInput value={value} onChangeText={onChange} placeholder={placeholder} keyboardType="decimal-pad" style={styles.numberInput} />
      <Text style={styles.unit}>in</Text>
    </View>
  );
}

function parseInches(value: string, label: string) {
  const inches = Number(value);
  if (!Number.isFinite(inches) || inches <= 0) throw new Error(`${label} must be a number greater than zero.`);
  return inchesToMm(inches);
}

const styles = StyleSheet.create({
  card: { padding: 18, borderRadius: 22, backgroundColor: tokens.color.surface, borderWidth: 1, borderColor: 'rgba(255,255,255,.78)', shadowColor: tokens.color.shadow, shadowOpacity: .08, shadowRadius: 14, shadowOffset: { width: 0, height: 6 } },
  eyebrow: { fontSize: 9, fontWeight: '800', letterSpacing: 1.1, color: tokens.color.peach },
  title: { marginTop: 7, fontSize: 16, fontWeight: '700', color: tokens.color.text },
  body: { marginTop: 6, fontSize: 10, lineHeight: 15, color: tokens.color.muted },
  textInput: { marginTop: 10, minHeight: 40, borderWidth: 1, borderColor: tokens.color.line, borderRadius: 12, backgroundColor: 'rgba(255,255,255,.72)', paddingHorizontal: 11, color: tokens.color.text, fontSize: 11, outlineStyle: 'none' } as any,
  dimensionRow: { flexDirection: 'row', gap: 6, marginTop: 10 },
  dimensionInput: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: tokens.color.line, borderRadius: 12, backgroundColor: 'rgba(255,255,255,.72)', paddingHorizontal: 7 },
  dimensionLabel: { fontSize: 9, fontWeight: '800', color: tokens.color.peach },
  numberInput: { flex: 1, minWidth: 32, minHeight: 38, textAlign: 'center', color: tokens.color.text, fontSize: 11, outlineStyle: 'none' } as any,
  unit: { fontSize: 8, color: tokens.color.muted },
  switchRow: { flexDirection: 'row', alignSelf: 'flex-start', gap: 4, marginTop: 10, padding: 3, borderRadius: 11, backgroundColor: 'rgba(233,230,221,.72)' },
  switchButton: { paddingVertical: 5, paddingHorizontal: 9, borderRadius: 8 },
  switchActive: { backgroundColor: 'rgba(255,255,255,.92)' },
  switchText: { fontSize: 9, fontWeight: '700', color: tokens.color.muted },
  switchTextActive: { color: tokens.color.blue },
  primary: { marginTop: 12, backgroundColor: tokens.color.blue, paddingVertical: 10, paddingHorizontal: 12, borderRadius: 12, alignItems: 'center' },
  primaryText: { color: '#fff', fontSize: 10, fontWeight: '800' },
  disabled: { opacity: .55 },
  error: { marginTop: 9, fontSize: 9, lineHeight: 14, color: '#A84545' },
});
