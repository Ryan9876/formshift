import type { SpatialSnapshot } from '@formshift/domain';
import React, { useEffect, useRef, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { PhotoArrangeEditorV19 } from './PhotoArrangeEditorV19';
import { tokens } from '../theme/tokens';

const STYLE_ID = 'formshift-photo-arrange-v20';

type Props = {
  photoUrl?: string | null;
  snapshot: SpatialSnapshot;
  onSnapshotChange?: (snapshot: SpatialSnapshot) => void;
  projectId?: string;
  spaceId?: string;
  baseSpatialVersionId?: string | null;
};

export function PhotoArrangeEditorV20(props: Props) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [autoRepair, setAutoRepair] = useState(false);
  const autoRepairRef = useRef(false);
  const liftedRef = useRef(false);

  useEffect(() => { autoRepairRef.current = autoRepair; }, [autoRepair]);

  useEffect(() => {
    let style = document.getElementById(STYLE_ID) as HTMLStyleElement | null;
    if (!style) {
      style = document.createElement('style');
      style.id = STYLE_ID;
      style.textContent = `
        [data-formshift-arrange-v20] { position: relative; }
        [data-formshift-arrange-v20] div[style*="rgba(40, 199, 232"] { overflow: visible !important; }
        [data-formshift-arrange-v20] div[style*="rgba(40, 199, 232"] > img {
          filter: drop-shadow(0 1px 1px rgba(255,255,255,.16)) drop-shadow(0 5px 7px rgba(0,0,0,.10)) saturate(.985) contrast(.99) !important;
        }
        [data-formshift-arrange-v20] div[style*="rgba(40, 199, 232"]::after {
          content: '';
          position: absolute;
          z-index: -1;
          left: 16%;
          right: 16%;
          bottom: -2.5%;
          height: 7%;
          min-height: 3px;
          border-radius: 50%;
          background: rgba(18,20,20,.24);
          filter: blur(7px);
          transform: scaleX(1.12);
          opacity: .72;
        }
        [data-formshift-arrange-v20] [data-formshift-ai-repair='true'] {
          background: rgba(13,116,150,.10) !important;
          border-color: rgba(13,116,150,.34) !important;
          box-shadow: 0 5px 16px rgba(13,116,150,.08);
        }
      `;
      document.head.appendChild(style);
    }
  }, []);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const sync = () => {
      const text = root.textContent ?? '';
      const isLifted = text.includes('Arrange object') || text.includes('Object lifted.');
      const buttons = Array.from(root.querySelectorAll('[role="button"],button')) as HTMLElement[];
      const aiButton = buttons.find((button) => {
        const label = (button.textContent ?? '').trim();
        return label === 'AI repair' || label === 'Repairing…' || label === 'Improve background';
      });

      if (aiButton) {
        aiButton.setAttribute('data-formshift-ai-repair', 'true');
        if ((aiButton.textContent ?? '').trim() === 'AI repair') aiButton.textContent = 'Improve background';
      }

      if (isLifted && !liftedRef.current) {
        liftedRef.current = true;
        if (autoRepairRef.current && aiButton && !aiButton.hasAttribute('disabled')) {
          window.setTimeout(() => aiButton.click(), 90);
        }
      } else if (!isLifted) {
        liftedRef.current = false;
      }
    };

    sync();
    const observer = new MutationObserver(sync);
    observer.observe(root, { childList: true, subtree: true, characterData: true, attributes: true });
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={rootRef} data-formshift-arrange-v20="true">
      <View style={styles.renderBar}>
        <View style={styles.renderCopy}>
          <Text style={styles.renderTitle}>Scene rendering</Text>
          <Text style={styles.renderText}>A subtle contact shadow and edge blend are applied locally. Better reconstruction can run automatically after lift if you opt in.</Text>
        </View>
        <Pressable
          accessibilityRole="switch"
          accessibilityState={{ checked: autoRepair }}
          style={[styles.toggle, autoRepair && styles.toggleOn]}
          onPress={() => setAutoRepair((value) => !value)}
        >
          <Text style={[styles.toggleText, autoRepair && styles.toggleTextOn]}>{autoRepair ? 'AI repair after lift: On' : 'AI repair after lift: Off'}</Text>
        </Pressable>
      </View>
      {autoRepair ? (
        <View style={styles.privacyNote}>
          <Text style={styles.privacyText}>Opt-in enabled: after you press Lift object, FormShift will send the current scene and accepted repair mask to the configured image provider to reconstruct the old location. Turn this off to keep lift/reconstruction local.</Text>
        </View>
      ) : null}
      <PhotoArrangeEditorV19 {...props} />
    </div>
  );
}

const styles = {
  renderBar: {
    marginBottom: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: tokens.color.line,
    backgroundColor: 'rgba(250,249,246,.92)',
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    gap: 10,
    flexWrap: 'wrap' as const,
  },
  renderCopy: { flex: 1, minWidth: 210 },
  renderTitle: { fontSize: 10, fontWeight: '800' as const, color: tokens.color.text },
  renderText: { marginTop: 2, fontSize: 8, lineHeight: 12, color: tokens.color.muted },
  toggle: {
    minHeight: 38,
    paddingHorizontal: 12,
    borderRadius: 11,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    borderWidth: 1,
    borderColor: tokens.color.line,
    backgroundColor: '#fff',
  },
  toggleOn: { borderColor: 'rgba(13,116,150,.42)', backgroundColor: 'rgba(207,229,236,.72)' },
  toggleText: { fontSize: 8, fontWeight: '800' as const, color: tokens.color.text },
  toggleTextOn: { color: tokens.color.blue },
  privacyNote: {
    marginBottom: 8,
    paddingHorizontal: 11,
    paddingVertical: 8,
    borderRadius: 11,
    backgroundColor: 'rgba(205,181,151,.14)',
    borderWidth: 1,
    borderColor: 'rgba(189,128,106,.22)',
  },
  privacyText: { fontSize: 8, lineHeight: 12, color: tokens.color.muted },
};
