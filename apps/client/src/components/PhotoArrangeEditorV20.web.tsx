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

type RepairState = 'idle' | 'queued' | 'sending' | 'completed' | 'failed';

export function PhotoArrangeEditorV20(props: Props) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [autoRepair, setAutoRepair] = useState(false);
  const [repairState, setRepairState] = useState<RepairState>('idle');
  const autoRepairRef = useRef(false);
  const repairTriggeredForLiftRef = useRef(false);
  const pendingTimerRef = useRef<number | null>(null);

  useEffect(() => { autoRepairRef.current = autoRepair; }, [autoRepair]);

  useEffect(() => {
    return () => {
      if (pendingTimerRef.current !== null) window.clearTimeout(pendingTimerRef.current);
    };
  }, []);

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
        aiButton.setAttribute('aria-label', 'Improve background');
      }

      if (text.includes('Background repaired.')) {
        setRepairState('completed');
      } else if (text.includes('Background repair failed') || text.includes('AI background repair is unavailable')) {
        setRepairState('failed');
      } else if (text.includes('Repairing background…') || text.includes('AI is repairing the old location')) {
        setRepairState('sending');
      }

      if (!isLifted) {
        repairTriggeredForLiftRef.current = false;
        if (pendingTimerRef.current !== null) {
          window.clearTimeout(pendingTimerRef.current);
          pendingTimerRef.current = null;
        }
        if (!text.includes('Background repaired.')) setRepairState('idle');
        return;
      }

      // Important: do not mark this lift as handled until the actual repair
      // control exists. In v2.0 the status text appeared before the button,
      // which caused automatic repair to be silently skipped.
      if (
        autoRepairRef.current &&
        !repairTriggeredForLiftRef.current &&
        aiButton &&
        !aiButton.hasAttribute('disabled')
      ) {
        repairTriggeredForLiftRef.current = true;
        setRepairState('queued');
        pendingTimerRef.current = window.setTimeout(() => {
          pendingTimerRef.current = null;
          if (!aiButton.isConnected || aiButton.hasAttribute('disabled')) {
            repairTriggeredForLiftRef.current = false;
            setRepairState('failed');
            return;
          }
          setRepairState('sending');
          aiButton.click();
        }, 140);
      }
    };

    sync();
    const observer = new MutationObserver(sync);
    observer.observe(root, { childList: true, subtree: true, characterData: true, attributes: true });
    return () => observer.disconnect();
  }, []);

  const repairLabel = repairState === 'queued'
    ? 'AI repair queued'
    : repairState === 'sending'
      ? 'Sending for AI repair…'
      : repairState === 'completed'
        ? 'AI background repaired'
        : repairState === 'failed'
          ? 'AI repair did not complete'
          : null;

  return (
    <div ref={rootRef} data-formshift-arrange-v20="true">
      <View style={styles.renderBar}>
        <View style={styles.renderCopy}>
          <Text style={styles.renderTitle}>Scene rendering</Text>
          <Text style={styles.renderText}>A subtle contact shadow and edge blend are applied locally. Better reconstruction can run automatically after lift if you opt in.</Text>
          {repairLabel ? <Text style={[styles.repairStatus, repairState === 'failed' && styles.repairStatusFailed]}>{repairLabel}</Text> : null}
        </View>
        <Pressable
          accessibilityRole="switch"
          accessibilityState={{ checked: autoRepair }}
          style={[styles.toggle, autoRepair && styles.toggleOn]}
          onPress={() => {
            setAutoRepair((value) => !value);
            setRepairState('idle');
          }}
        >
          <Text style={[styles.toggleText, autoRepair && styles.toggleTextOn]}>{autoRepair ? 'AI repair after lift: On' : 'AI repair after lift: Off'}</Text>
        </Pressable>
      </View>
      {autoRepair ? (
        <View style={styles.privacyNote}>
          <Text style={styles.privacyText}>Opt-in enabled: after you press Lift object, FormShift will send the current scene and accepted repair mask to the configured image provider to reconstruct the old location. The status above confirms whether that request actually starts and completes. Turn this off to keep lift/reconstruction local.</Text>
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
  repairStatus: { marginTop: 5, fontSize: 8, lineHeight: 12, fontWeight: '800' as const, color: tokens.color.blue },
  repairStatusFailed: { color: '#A84C4C' },
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
