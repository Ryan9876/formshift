import type { SpatialSnapshot } from '@formshift/domain';
import React, { useEffect } from 'react';
import { View } from 'react-native';
import { PhotoArrangeEditorV17 } from './PhotoArrangeEditorV17';

const STYLE_ID = 'formshift-photo-arrange-171';

export function PhotoArrangeEditorV171(props: {
  photoUrl?: string | null;
  snapshot: SpatialSnapshot;
  onSnapshotChange?: (snapshot: SpatialSnapshot) => void;
  projectId?: string;
  spaceId?: string;
  baseSpatialVersionId?: string | null;
}) {
  useEffect(() => {
    let style = document.getElementById(STYLE_ID) as HTMLStyleElement | null;
    if (!style) {
      style = document.createElement('style');
      style.id = STYLE_ID;
      style.textContent = `
        [data-formshift-arrange-171] div[aria-hidden="true"][style*="z-index: 20"] {
          position: fixed !important;
          left: auto !important;
          right: max(14px, env(safe-area-inset-right)) !important;
          top: max(170px, calc(env(safe-area-inset-top) + 112px)) !important;
          width: 64px !important;
          height: 64px !important;
          border-width: 2px !important;
          box-shadow: 0 5px 15px rgba(0,0,0,.18), 0 0 0 2px rgba(255,255,255,.9) !important;
        }

        [data-formshift-arrange-171] {
          padding-bottom: calc(96px + env(safe-area-inset-bottom));
        }
      `;
      document.head.appendChild(style);
    }

    const settlePointer = () => {
      const surface = document.querySelector('[data-formshift-arrange-171] [role="application"]') as HTMLElement | null;
      if (!surface) return;
      try { surface.dispatchEvent(new PointerEvent('pointercancel', { bubbles: true, pointerId: -1 })); } catch { /* older WebKit */ }
    };
    window.addEventListener('blur', settlePointer);
    document.addEventListener('visibilitychange', settlePointer);
    return () => {
      window.removeEventListener('blur', settlePointer);
      document.removeEventListener('visibilitychange', settlePointer);
    };
  }, []);

  return (
    <View style={{ position: 'relative' }}>
      <div data-formshift-arrange-171="true">
        <PhotoArrangeEditorV17 {...props} />
      </div>
    </View>
  );
}
