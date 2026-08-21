import type { ViewStyle } from 'react-native';

declare module 'react-native' {
  namespace StyleSheet {
    const absoluteFillObject: ViewStyle;
  }
}
