import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { WithSkiaWeb } from '@shopify/react-native-skia/lib/module/web';
import type { SpatialSnapshot } from '@formshift/domain';
import { tokens } from '../theme/tokens';

export function PlanCanvas(props: { snapshot?: SpatialSnapshot; editable?: boolean; onSnapshotChange?: (snapshot: SpatialSnapshot) => void }) {
  return (
    <WithSkiaWeb
      getComponent={() => import('./PlanCanvasSkia')}
      fallback={
        <View style={{ minHeight: 320, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={tokens.color.blue} />
        </View>
      }
      {...props}
    />
  );
}
