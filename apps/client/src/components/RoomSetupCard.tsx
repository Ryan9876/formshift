import { inchesToMm } from '@formshift/domain';
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { tokens } from '../theme/tokens';

type EvidenceMode = 'measured' | 'estimated';

export function RoomSetupCard({
  busy,
  onCreate,
}: {
  busy: boolean;
  onCreate: (value: { widthMm: number; depthMm: number; ceilingHeightMm: number; evidence: EvidenceMode }) => Promise<void>;
}) {
  const [widthFt, setWidthFt] = useState('');
  const [widthIn, setWidthIn] = useState('');
  const [depthFt, setDepthFt] = useState('');
  const [depthIn, setDepthIn] = useState('');
  const [heightFt, setHeightFt] = useState('');
  const [heightIn, setHeightIn] = useState('');
  const [evidence, setEvidence] = useState<EvidenceMode>('measured');
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setError(null);
    try {
      const widthMm = parseFeetInches(widthFt, widthIn, 'Room width');
      const depthMm = parseFeetInches(depthFt, depthIn, 'Room depth');
      const ceilingHeightMm = parseFeetInches(heightFt, heightIn, 'Ceiling height');
      await onCreate({ widthMm, depthMm, ceilingHeightMm, evidence });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Room dimensions could not be saved.');
    }
  };

  return (
    <View style={styles.card}>
      <Text style={styles.eyebrow}>MEASURE THE ROOM</Text>
      <Text style={styles.title}>Turn the photo into a real plan.</Text>
      <Text style={styles.body}>
        The photo is visual evidence only. Enter the room dimensions so Arrange can use authoritative geometry instead of a guessed scale.
      </Text>

      <EvidenceSwitch value={evidence} onChange={setEvidence} />
      <Text style={styles.hint}>
        Measured means you used a tape, laser, or trusted scan. Approximate stays marked as estimated and will not qualify as dimension-verified.
      </Text>

      <DimensionRow label="Room width" feet={widthFt} inches={widthIn} onFeet={setWidthFt} onInches={setWidthIn} feetPlaceholder="14" inchesPlaceholder="0" />
      <DimensionRow label="Room depth" feet={depthFt} inches={depthIn} onFeet={setDepthFt} onInches={setDepthIn} feetPlaceholder="11" inchesPlaceholder="0" />
      <DimensionRow label="Ceiling height" feet={heightFt} inches={heightIn} onFeet={setHeightFt} onInches={setHeightIn} feetPlaceholder="8" inchesPlaceholder="0" />

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Pressable disabled={busy} onPress={() => void submit()} style={[styles.primary, busy && styles.disabled]}>
        <Text style={styles.primaryText}>{busy ? 'Saving room…' : 'Create measured room'}</Text>
      </Pressable>
    </View>
  );
}

function EvidenceSwitch({ value, onChange }: { value: EvidenceMode; onChange: (value: EvidenceMode) => void }) {
  return (
    <View style={styles.switchRow}>
      <Pressable onPress={() => onChange('measured')} style={[styles.switchButton, value === 'measured' && styles.switchActive]}>
        <Text style={[styles.switchText, value === 'measured' && styles.switchTextActive]}>Measured</Text>
      </Pressable>
      <Pressable onPress={() => onChange('estimated')} style={[styles.switchButton, value === 'estimated' && styles.switchActive]}>
        <Text style={[styles.switchText, value === 'estimated' && styles.switchTextActive]}>Approximate</Text>
      </Pressable>
    </View>
  );
}

function DimensionRow({
  label,
  feet,
  inches,
  onFeet,
  onInches,
  feetPlaceholder,
  inchesPlaceholder,
}: {
  label: string;
  feet: string;
  inches: string;
  onFeet: (value: string) => void;
  onInches: (value: string) => void;
  feetPlaceholder: string;
  inchesPlaceholder: string;
}) {
  return (
    <View style={styles.dimensionBlock}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.inputRow}>
        <View style={styles.inputShell}>
          <TextInput value={feet} onChangeText={onFeet} placeholder={feetPlaceholder} keyboardType="decimal-pad" style={styles.input} />
          <Text style={styles.unit}>ft</Text>
        </View>
        <View style={styles.inputShell}>
          <TextInput value={inches} onChangeText={onInches} placeholder={inchesPlaceholder} keyboardType="decimal-pad" style={styles.input} />
          <Text style={styles.unit}>in</Text>
        </View>
      </View>
    </View>
  );
}

function parseFeetInches(feetText: string, inchesText: string, label: string) {
  const feet = feetText.trim() ? Number(feetText) : 0;
  const inches = inchesText.trim() ? Number(inchesText) : 0;
  if (!Number.isFinite(feet) || !Number.isFinite(inches) || feet < 0 || inches < 0 || inches >= 12) {
    throw new Error(`${label} must use valid feet and inches (inches from 0 to under 12).`);
  }
  const totalInches = feet * 12 + inches;
  if (totalInches <= 0) throw new Error(`${label} must be greater than zero.`);
  return inchesToMm(totalInches);
}

const styles = StyleSheet.create({
  card: { minHeight: 430, padding: 28, borderRadius: 26, backgroundColor: 'rgba(255,255,255,.74)', borderWidth: 1, borderColor: tokens.color.line },
  eyebrow: { fontSize: 9, fontWeight: '800', letterSpacing: 1.4, color: tokens.color.peach },
  title: { marginTop: 8, fontSize: 26, fontWeight: '700', color: tokens.color.text, letterSpacing: -.8 },
  body: { marginTop: 8, maxWidth: 620, fontSize: 12, lineHeight: 18, color: tokens.color.muted },
  hint: { marginTop: 8, fontSize: 9, lineHeight: 14, color: tokens.color.muted },
  switchRow: { flexDirection: 'row', alignSelf: 'flex-start', gap: 6, marginTop: 18, padding: 4, borderRadius: 14, backgroundColor: 'rgba(233,230,221,.72)' },
  switchButton: { paddingVertical: 7, paddingHorizontal: 12, borderRadius: 10 },
  switchActive: { backgroundColor: 'rgba(255,255,255,.92)' },
  switchText: { fontSize: 10, fontWeight: '700', color: tokens.color.muted },
  switchTextActive: { color: tokens.color.blue },
  dimensionBlock: { marginTop: 18 },
  label: { fontSize: 10, fontWeight: '800', color: tokens.color.text, marginBottom: 7 },
  inputRow: { flexDirection: 'row', gap: 10 },
  inputShell: { flex: 1, minWidth: 96, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: tokens.color.line, borderRadius: 14, backgroundColor: 'rgba(255,255,255,.78)', paddingHorizontal: 12 },
  input: { flex: 1, minHeight: 42, color: tokens.color.text, fontSize: 14, outlineStyle: 'none' } as any,
  unit: { fontSize: 10, fontWeight: '700', color: tokens.color.peach },
  primary: { marginTop: 22, alignSelf: 'flex-start', backgroundColor: tokens.color.blue, paddingVertical: 12, paddingHorizontal: 18, borderRadius: 14 },
  primaryText: { color: '#fff', fontSize: 11, fontWeight: '800' },
  disabled: { opacity: .55 },
  error: { marginTop: 14, fontSize: 10, lineHeight: 15, color: '#A84545' },
});
