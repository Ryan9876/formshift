import { View, StyleSheet } from 'react-native';
import { tokens } from '../theme/tokens';

export function BrandMark({ size = 36 }: { size?: number }) {
  return (
    <View accessibilityLabel="FormShift" style={[styles.mark, { width: size, height: size }]}> 
      <View style={[styles.back, { width: size * .62, height: size * .70 }]} />
      <View style={[styles.front, { width: size * .62, height: size * .70 }]} />
      <View style={[styles.datum, { width: size * .13, height: size * .13, borderRadius: size }]} />
    </View>
  );
}
const styles = StyleSheet.create({
  mark: { position: 'relative' },
  back: { position: 'absolute', left: 2, top: 3, borderWidth: 2, borderColor: '#7B817D', borderTopLeftRadius: 14, borderBottomLeftRadius: 22, borderRightWidth: 0 },
  front: { position: 'absolute', right: 1, bottom: 2, borderWidth: 2.5, borderColor: tokens.color.blue, borderTopRightRadius: 22, borderBottomRightRadius: 14, borderLeftWidth: 0 },
  datum: { position: 'absolute', backgroundColor: tokens.color.blue, right: 3, top: 3 }
});
