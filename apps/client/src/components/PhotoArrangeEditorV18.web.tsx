import type { SpatialSnapshot } from '@formshift/domain';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { PhotoArrangeEditorV17 } from './PhotoArrangeEditorV17';
import { tokens } from '../theme/tokens';

const MEDIAPIPE_BUNDLE = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.0.1/vision_bundle.mjs';
const MEDIAPIPE_WASM = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.0.1/wasm';
const MAGIC_TOUCH_MODEL = 'https://storage.googleapis.com/mediapipe-models/interactive_segmenter_v2/magic_touch/int8/1/interactive_segmentation.task';
const MAX_SEGMENTATION_DIMENSION = 896;
const STYLE_ID = 'formshift-photo-arrange-18';

type Point = { x: number; y: number };
type CachedMask = { width: number; height: number; values: Float32Array; seedKey: string };

type SegmenterModule = {
  FilesetResolver: { forVisionTasks(path: string): Promise<unknown> };
  InteractiveSegmenter: { createFromOptions(fileset: unknown, options: unknown): Promise<any> };
  BrushMode?: { POSITIVE?: unknown; NEGATIVE?: unknown; BACKGROUND?: unknown };
};

let enginePromise: Promise<void> | null = null;

function prepareSelectionEngine() {
  if (enginePromise) return enginePromise;
  enginePromise = (async () => {
    const dynamicImport = new Function('url', 'return import(url)') as (url: string) => Promise<SegmenterModule>;
    const module = await dynamicImport(MEDIAPIPE_BUNDLE);
    const fileset = await module.FilesetResolver.forVisionTasks(MEDIAPIPE_WASM);
    const createOriginal = module.InteractiveSegmenter.createFromOptions.bind(module.InteractiveSegmenter);
    const real = await createOriginal(fileset, {
      baseOptions: { modelAssetPath: MAGIC_TOUCH_MODEL },
      outputConfidenceMasks: true,
      outputCategoryMask: false,
    });

    let sourceImage: HTMLCanvasElement | null = null;
    let cached: CachedMask | null = null;

    const proxy: any = {
      __formshiftV18: true,
      setImage(image: HTMLCanvasElement) {
        sourceImage = image;
      },
      segment(strokes: any[]) {
        if (!sourceImage) throw new Error('Selection image is not ready.');
        const seed = firstPoint(strokes);
        if (!seed) throw new Error('Tap the object again.');
        const seedKey = `${Math.round(seed.x * 500)}:${Math.round(seed.y * 500)}`;

        // Refinement strokes are intentionally local in v1.8. Reusing the first
        // semantic mask avoids an expensive model inference after every finger stroke.
        if (cached && cached.seedKey === seedKey) return fakeResult(cached);

        const inferenceCanvas = downscaleCanvas(sourceImage, MAX_SEGMENTATION_DIMENSION);
        real.setImage(inferenceCanvas);
        const positive = module.BrushMode?.POSITIVE ?? 1;
        const result = real.segment([{ brushMode: positive, point: [seed], isCompleted: true }]);
        const mask = result?.confidenceMasks?.[0] ?? result;
        if (!mask?.getAsFloat32Array) return result;

        const raw = mask.getAsFloat32Array() as Float32Array;
        const sharpened = new Float32Array(raw.length);
        // Raise the effective confidence threshold used by the existing seeded
        // connected-component cleanup. This favors a tighter first mask; missed
        // edges can be painted back instantly with Add.
        for (let i = 0; i < raw.length; i += 1) {
          sharpened[i] = clamp((raw[i]! - 0.32) / 0.46, 0, 1);
        }
        cached = { width: mask.width as number, height: mask.height as number, values: sharpened, seedKey };
        mask.close?.();
        return fakeResult(cached);
      },
      close() {
        cached = null;
        real.close?.();
      },
    };

    // The v1.7 editor dynamically imports the same module. Returning the warmed
    // proxy lets it reuse the already-loaded model and the cached first mask.
    module.InteractiveSegmenter.createFromOptions = async () => proxy;
  })().catch((error) => {
    enginePromise = null;
    throw error;
  });
  return enginePromise;
}

function fakeResult(mask: CachedMask) {
  return {
    confidenceMasks: [{
      width: mask.width,
      height: mask.height,
      getAsFloat32Array: () => new Float32Array(mask.values),
      close: () => undefined,
    }],
  };
}

function firstPoint(strokes: any[]): Point | null {
  if (!Array.isArray(strokes)) return null;
  for (const stroke of strokes) {
    const point = stroke?.point?.[0];
    if (point && Number.isFinite(point.x) && Number.isFinite(point.y)) return { x: point.x, y: point.y };
  }
  return null;
}

function downscaleCanvas(source: HTMLCanvasElement, maxDimension: number) {
  const scale = Math.min(1, maxDimension / Math.max(source.width, source.height));
  if (scale >= 0.999) return source;
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(source.width * scale));
  canvas.height = Math.max(1, Math.round(source.height * scale));
  canvas.getContext('2d', { willReadFrequently: true })!.drawImage(source, 0, 0, canvas.width, canvas.height);
  return canvas;
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

export function PhotoArrangeEditorV18(props: {
  photoUrl?: string | null;
  snapshot: SpatialSnapshot;
  onSnapshotChange?: (snapshot: SpatialSnapshot) => void;
  projectId?: string;
  spaceId?: string;
  baseSpatialVersionId?: string | null;
}) {
  const [ready, setReady] = useState(false);
  const [engineError, setEngineError] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const candidateVisibleRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    void prepareSelectionEngine().then(() => {
      if (!cancelled) setReady(true);
    }).catch((error) => {
      if (!cancelled) {
        setEngineError(error instanceof Error ? error.message : 'Could not prepare object selection.');
        // Keep the existing editor available as a fallback rather than blocking Arrange.
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
        [data-formshift-arrange-18] div[aria-hidden="true"][style*="z-index: 20"] {
          position: fixed !important;
          left: auto !important;
          right: max(14px, env(safe-area-inset-right)) !important;
          top: max(170px, calc(env(safe-area-inset-top) + 112px)) !important;
          width: 58px !important;
          height: 58px !important;
          border-width: 2px !important;
          box-shadow: 0 5px 15px rgba(0,0,0,.16), 0 0 0 2px rgba(255,255,255,.9) !important;
        }
        [data-formshift-arrange-18] { padding-bottom: calc(108px + env(safe-area-inset-bottom)); }
        [data-formshift-arrange-18][data-selection-review="true"]::before {
          content: 'Selection ready — review the mask, then choose Lift object to move it. Use Add or Remove only when the mask needs correction.';
          display: block;
          margin: 0;
          padding: 10px 12px;
          border-bottom: 1px solid rgba(42,61,66,.14);
          background: rgba(220,236,241,.72);
          color: #253034;
          font: 700 12px/1.35 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;
        }
        [data-formshift-arrange-18] [aria-label="Lift object"] > * { display: none !important; }
        [data-formshift-arrange-18] [aria-label="Lift object"]::after {
          content: 'Lift object';
          color: #fff;
          font-size: 9px;
          font-weight: 800;
        }
      `;
      document.head.appendChild(style);
    }
  }, []);

  useEffect(() => {
    if (!ready || !rootRef.current) return;
    const root = rootRef.current;

    const makeReviewModeDefault = () => {
      const text = root.textContent ?? '';
      const candidateVisible = text.includes('Refine selection');
      root.setAttribute('data-selection-review', candidateVisible ? 'true' : 'false');
      if (candidateVisible && !candidateVisibleRef.current) {
        candidateVisibleRef.current = true;
        const buttons = Array.from(root.querySelectorAll('[role="button"],button')) as HTMLElement[];
        const pan = buttons.find((button) => (button.textContent ?? '').includes('Pan'));
        pan?.click();

        const useSelection = buttons.find((button) => (button.textContent ?? '').includes('Use selection'));
        if (useSelection) useSelection.setAttribute('aria-label', 'Lift object');
      } else if (!candidateVisible) {
        candidateVisibleRef.current = false;
      }
    };

    makeReviewModeDefault();
    const observer = new MutationObserver(makeReviewModeDefault);
    observer.observe(root, { childList: true, subtree: true, characterData: true });

    const settlePointer = () => {
      const surface = root.querySelector('[role="application"]') as HTMLElement | null;
      if (!surface) return;
      try { surface.dispatchEvent(new PointerEvent('pointercancel', { bubbles: true, pointerId: -1 })); } catch { /* older WebKit */ }
    };
    window.addEventListener('blur', settlePointer);
    document.addEventListener('visibilitychange', settlePointer);
    return () => {
      observer.disconnect();
      root.removeAttribute('data-selection-review');
      window.removeEventListener('blur', settlePointer);
      document.removeEventListener('visibilitychange', settlePointer);
    };
  }, [ready]);

  if (!ready) {
    return (
      <View style={{ minHeight: 420, alignItems: 'center', justifyContent: 'center', gap: 10, borderRadius: 24, backgroundColor: 'rgba(255,255,255,.72)', borderWidth: 1, borderColor: tokens.color.line }}>
        <ActivityIndicator color={tokens.color.blue} />
        <Text style={{ fontSize: 13, fontWeight: '800', color: tokens.color.text }}>Preparing object selection…</Text>
        <Text style={{ maxWidth: 320, textAlign: 'center', fontSize: 10, lineHeight: 15, color: tokens.color.muted }}>Loading the local selection model now so the first object tap is faster.</Text>
      </View>
    );
  }

  return (
    <div ref={rootRef} data-formshift-arrange-18="true">
      {engineError ? <div style={{ padding: '8px 12px', fontSize: 12, color: '#A84C4C', background: 'rgba(168,76,76,.06)' }}>{engineError} Using the standard selection path.</div> : null}
      <PhotoArrangeEditorV17 {...props} />
    </div>
  );
}
