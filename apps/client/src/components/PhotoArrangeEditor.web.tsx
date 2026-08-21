import type { SpatialSnapshot } from '@formshift/domain';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { prepareObjectCenteredSelectionEngine } from '../vision/MediaPipeObjectSegmenter.web';
import { tokens } from '../theme/tokens';
import { PhotoArrangeEditorV17 } from './PhotoArrangeEditorV17';

const STYLE_ID = 'formshift-photo-arrange-canonical';

type Props = {
  photoUrl?: string | null;
  snapshot: SpatialSnapshot;
  onSnapshotChange?: (snapshot: SpatialSnapshot) => void;
  projectId?: string;
  spaceId?: string;
  baseSpatialVersionId?: string | null;
};

/**
 * Canonical Photo Arrange web boundary.
 *
 * The v2.2 gesture/editing implementation remains frozen behind this component
 * while provider preparation and visual treatment are composed explicitly.
 * There is no MutationObserver, UI-text scraping, or programmatic button click.
 */
export function PhotoArrangeEditor(props: Props) {
  const [ready, setReady] = useState(false);
  const [engineError, setEngineError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void prepareObjectCenteredSelectionEngine()
      .then(() => { if (!cancelled) setReady(true); })
      .catch((error) => {
        if (!cancelled) {
          setEngineError(error instanceof Error ? error.message : 'Could not prepare precision selection.');
          setReady(true);
        }
      });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let style = document.getElementById(STYLE_ID) as HTMLStyleElement | null;
    if (!style) {
      style = document.createElement('style');
      style.id = STYLE_ID;
      style.textContent = `
        [data-formshift-photo-arrange='canonical'] [aria-label='Move selected object'] + div {
          overflow: visible !important;
          box-shadow: none !important;
        }
        [data-formshift-photo-arrange='canonical'] [aria-label='Move selected object'] + div > img {
          filter: drop-shadow(0 0 1.5px rgba(40,199,232,.82)) drop-shadow(0 7px 10px rgba(0,0,0,.13));
        }
        [data-formshift-photo-arrange='canonical'] [aria-label='Move selected object'] + div::after {
          content: '';
          position: absolute;
          z-index: -1;
          left: 17%;
          right: 17%;
          bottom: -2.5%;
          height: 7%;
          min-height: 3px;
          border-radius: 50%;
          background: rgba(18,20,20,.22);
          filter: blur(7px);
          opacity: .68;
        }

        /*
         * Mobile Safari can drop pointer capture when the transparent object
         * handle is repositioned every frame. While the drag is active, expand
         * that same handle over the complete photo stage. The pointer therefore
         * remains on the original React target even if Safari releases capture,
         * while outside-stage gestures remain unchanged because expansion only
         * begins after the user starts directly on the selected object.
         */
        [data-formshift-photo-arrange='canonical'] [aria-label='Move selected object']:active {
          inset: 0 !important;
          width: auto !important;
          height: auto !important;
          z-index: 9 !important;
        }
      `;
      document.head.appendChild(style);
    }
  }, []);

  if (!ready) {
    return (
      <View style={loadingStyle}>
        <ActivityIndicator color={tokens.color.blue} />
        <Text style={loadingTitle}>Preparing precision selection…</Text>
        <Text style={loadingBody}>The local object-selection model is loading before the editable room surface starts.</Text>
      </View>
    );
  }

  return (
    <div data-formshift-photo-arrange="canonical">
      {engineError ? (
        <div style={{ padding: '9px 12px', fontSize: 11, lineHeight: '16px', color: '#A84C4C', background: 'rgba(168,76,76,.06)' }}>
          Precision selection could not preload. The standard local selector remains available. {engineError}
        </div>
      ) : null}
      <PhotoArrangeEditorV17 {...props} />
    </div>
  );
}

const loadingStyle = {
  minHeight: 420,
  alignItems: 'center' as const,
  justifyContent: 'center' as const,
  gap: 10,
  borderRadius: 24,
  backgroundColor: 'rgba(255,255,255,.72)',
  borderWidth: 1,
  borderColor: tokens.color.line,
};
const loadingTitle = { fontSize: 14, fontWeight: '800' as const, color: tokens.color.text };
const loadingBody = { maxWidth: 380, textAlign: 'center' as const, fontSize: 11, lineHeight: 16, color: tokens.color.muted };
