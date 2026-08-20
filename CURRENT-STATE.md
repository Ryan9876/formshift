# FormShift Current State

**Revision:** 0.7.0  
**Date:** 2026-08-20  
**Milestone:** Photo Arrange v1.8 faster/tighter selection path deployed; browser interaction validation pending

FormShift is a **photo-first spatial augmentation product**. The real captured room image is the primary canvas; structured geometry remains the hidden authority. Plan/rectangle views are secondary technical verification surfaces.

## Validated Photo Arrange baseline

Authenticated browser/iPhone testing has established that:
- a normal tap reaches FormShift rather than Safari's native image-selection UI
- MediaPipe interactive segmentation can isolate a photographed object
- a real photographed object such as the guitar can be lifted and moved using its photographed pixels
- room pinch-zoom and pan materially improve small-object targeting
- room-navigation gestures and lifted-object manipulation are meaningfully separated
- immutable source room imagery remains preserved in private FormShift storage

The overall Photo Arrange experience is still prototype-quality. Segmentation precision, latency, background reconstruction, and scene realism remain the main quality constraints.

## Retained Arrange foundations

Photo Arrange v1.5–v1.7.1 retain:
- candidate selection preview before pixels are lifted
- explicit Add / Remove mask refinement
- continuous finger-painted refinement with Undo / Redo
- explicit Pan mode and two-finger room zoom
- one-finger lifted-object movement plus two-finger scale/rotation
- local removed-object preview plus explicit asynchronous AI background repair
- immutable persisted photo arrangements with private scene/mask/cutout/background assets and parent lineage
- latest saved derived scene restoration
- iPhone Safari safe-area/pointer-interruption polish

Persistence/security baseline remains:
- Supabase private bucket `formshift-private`
- 26/26 public application tables RLS-enabled
- anonymous has no `photo_arrangements` table privileges; authenticated has SELECT + INSERT only
- pixel edits never overwrite the immutable source photo

## User evidence leading to v1.8

The latest web-app test showed the guitar candidate improving but still capturing a substantial portion of the cloth/background behind it. The user also reported:
- object determination remains noticeably slow
- the first automatic mask is not precise enough
- after the candidate appears, clicking/dragging it can draw blue refinement lines instead of behaving like a movable object

The third item was primarily an interaction-state problem: the candidate existed, but the editor remained in Add-refinement mode until **Use selection** was explicitly chosen.

## Photo Arrange v1.8 — faster/tighter selection + clearer state transition

Functional runtime baseline: `43c12e4b4d6438da245d376edf2434d217ddcc2d`

Implemented:
- web-only `PhotoArrangeEditorV18` wrapper preserves the v1.7 editor underneath for low-risk rollback
- MediaPipe model/WASM are **prewarmed before the editing surface opens**, moving model-startup latency out of the first object tap
- semantic inference uses an approximately **896 px maximum-dimension working canvas** instead of the larger editing canvas
- the first confidence mask is sharpened before the existing seeded connected-component cleanup, intentionally favoring a tighter candidate rather than excessive background inclusion
- the first semantic mask is cached by selection seed
- subsequent Add/Remove strokes reuse that semantic base and apply the established local deterministic brush corrections instead of rerunning MediaPipe after every completed stroke
- this keeps manual refinement local and substantially reduces repeated model-inference work
- a newly created candidate now enters **Pan/review mode by default** rather than Add mode, so touching the candidate does not immediately paint blue
- Add and Remove remain explicit correction tools
- candidate review displays explicit guidance that the mask is still a preview
- the acceptance action is presented as **Lift object**, clarifying the transition from mask review to actual movable photographed pixels
- after lift, the established object move/scale/rotate, AI repair, and Keep placement paths remain unchanged
- non-web/native resolution continues to use the existing native fallback; v1.8 specifically targets the browser/iPhone-Safari path
- API, database schema, persistence contracts, and AI repair endpoint were unchanged

### Deployment evidence

- isolated branch: `photo-arrange-v18-speed-state`
- exact final branch preview `dpl_AJv5u215EEukHDpL2mYLt2TVjUSi` — READY on `43c12e4b4d6438da245d376edf2434d217ddcc2d`
- preview Expo export completed successfully and included `/arrange`
- branch comparison against `main` was a clean fast-forward containing only:
  - `apps/client/src/components/PhotoArrangeEditorV18.web.tsx`
  - `apps/client/src/components/PhotoArrangeEditorV18.tsx`
  - `apps/client/src/screens/PhotoArrangeWorkspace.tsx`
- production web deployment `dpl_AEgB8zsK1K3KJhVGprTFXs7j2L9q` — READY on the exact runtime baseline and serving `formshift-web.vercel.app`
- live production `/arrange` — HTTP 200 smoke-verified

## Accuracy and privacy boundaries

- segmentation and mask refinement remain local in the browser
- prewarming/caching changes performance behavior only; they do not make MediaPipe output authoritative geometry
- the tightened first mask may intentionally omit uncertain edge pixels; users can restore them with Add
- AI repair remains explicit and sends the current scene plus accepted mask only when chosen
- the configured image-edit provider path is not claimed to be zero-data-retention
- pixel movement does not implicitly alter canonical physical dimensions, room geometry, or measurement provenance
- perspective, depth, floor/wall contact, occlusion, relighting, and physical scale remain uncalibrated for free-form photographed-object movement

## Next validation

In the production browser:
1. hard refresh and open **Arrange**
2. allow **Preparing object selection…** to finish before editing begins
3. zoom to the guitar and tap near the center
4. compare the time from tap to candidate mask with the prior version
5. inspect whether the first mask is tighter around the guitar and contains less cloth/wall background
6. without choosing Add or Remove, drag/touch the candidate; confirm it stays in review/Pan behavior and does **not** draw blue refinement lines
7. choose **Remove** explicitly and paint one correction; confirm that correction completes much faster than the previous semantic rerun behavior
8. choose **Add** only if the tighter first mask omitted part of the guitar
9. choose **Lift object**; only after that should direct object dragging move the photographed pixels
10. verify scale/rotate, optional AI repair, Keep placement, and refresh persistence still work

## Decision after v1.8 validation

If latency improves materially and the tighter mask is practically usable, stop investing in selection-control UI and move to **Photo Arrange v2 scene intelligence**: camera/floor/wall calibration, depth assistance, perspective-aware physical scaling, contact constraints, occlusion, contact shadow/lighting treatment, photo-object-to-spatial-ID binding, and reuse in Organize and Build.

If the first mask is still materially inaccurate on objects such as the guitar even after tightening and practical Add/Remove correction, the next investment should be a **stronger segmentation/refinement model or pipeline**, not additional buttons or deeper scene intelligence. Depth and perspective cannot compensate for an unreliable source mask.

## Not yet claimed

Measured reduction in selection latency on the user's browser, materially improved guitar-mask precision in real use, production-quality segmentation or inpainting, calibrated perspective/occlusion/relighting, native iOS continuous photo manipulation, or dedicated persisted blueprint PDF.

## Authoritative record impact

- `CURRENT-STATE.md`: updated for the deployed Photo Arrange v1.8 selection-performance/state release and pending browser validation
- `DESIGN-SYSTEM.md`: unchanged; v1.8 clarifies and implements the existing candidate-preview / explicit-accept / object-manipulation contract rather than changing the durable visual language
- `ARCHITECTURE.md`: unchanged; the optimization is contained within the existing local browser segmentation boundary and does not change canonical data flow, persistence, or services
- `PROJECT-CONSTITUTION.md`: unchanged; the existing photo-first and source-integrity rules continue to govern the release
