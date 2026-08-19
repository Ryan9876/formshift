import type { Mode } from '@formshift/domain';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { tokens } from '../theme/tokens';

const labels: Array<{ key: Mode; helper: string }> = [
  { key: 'organize', helper: 'Improve this space' },
  { key: 'arrange', helper: 'Move and add' },
  { key: 'build', helper: 'Design for the space' },
];

export function ModeSwitch({ value, onChange }: { value: Mode; onChange: (mode: Mode) => void }) {
  return (
    <View style={styles.wrap}>
      {labels.map((item) => {
        const active = item.key === value;
        return (
          <Pressable key={item.key} accessibilityRole="tab" accessibilityState={{ selected: active }} onPress={() => onChange(item.key)} style={[styles.item, active && styles.active]}>
            <Text style={[styles.label, active && styles.labelActive]}>{item.key[0]!.toUpperCase() + item.key.slice(1)}</Text>
            <Text numberOfLines={1} style={styles.helper}>{item.helper}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}
const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', padding: 5, gap: 4, backgroundColor: 'rgba(239,236,227,.86)', borderRadius: 18, borderWidth: 1, borderColor: 'rgba(35,42,44,.08)' },
  item: { minWidth: 88, flexGrow: 1, paddingVertical: 9, paddingHorizontal: 10, borderRadius: 14 },
  active: { backgroundColor: 'rgba(255,255,255,.92)', shadowColor: tokens.color.shadow, shadowOpacity: .22, shadowRadius: 12, shadowOffset: { width: 0, height: 5 } },
  label: { fontSize: 13, fontWeight: '700', color: tokens.color.muted },
  labelActive: { color: tokens.color.text },
  helper: { marginTop: 2, fontSize: 10, color: tokens.color.peach }
});
