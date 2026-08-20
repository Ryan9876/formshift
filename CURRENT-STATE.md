# FormShift Current State

**Revision:** 0.8.0  
**Date:** 2026-08-20  
**Milestone:** Photo Arrange v2.0 scene-rendering layer deployed; real-device visual validation pending

FormShift is a **photo-first spatial augmentation product**. The real captured room image is the primary canvas; structured geometry remains the hidden authority. Plan/rectangle views are secondary technical verification surfaces.

## Validated Photo Arrange baseline

Authenticated browser/iPhone testing has established that:
- a normal tap reaches FormShift rather than Safari's native image-selection UI
- local interactive segmentation can isolate a photographed object
- a photographed object such as the guitar can be lifted and moved using its real pixels
- room pinch-zoom/pan improves small-object targeting
- candidate review/refinement and lifted-object manipulation are meaningfully separated
- immutable source room imagery remains preserved in private FormShift storage
- persisted derived photo arrangements restore after refresh

The experience remains prototype-quality. Selection has improved materially, while removed-object reconstruction and scene realism remain the dominant quality constraints.

## Retained Arrange foundations

Photo Arrange v1.5–v1.9 retain:
- candidate selection preview before pixels are lifted
- explicit Add / Remove refinement with continuous strokes and Undo / Redo
- explicit Pan/review mode and two-finger room zoom
- one-finger object movement plus two-finger scale/rotation
- private immutable photo-arrangement persistence with parent lineage
- explicit asynchronous AI background repair
- iPhone Safari gesture/safe-area hardening
- prewarmed local segmentation and cached first semantic mask
- object-centered local inference around the tap for higher effective object resolution
- candidate review defaults to Pan rather than Add
- explicit **Lift object** transition before photographed pixels become movable
- restrained silhouette emphasis instead of a rectangular sticker outline

Persistence/security baseline remains:
- Supabase private bucket `formshift-private`
- 26/26 public application tables RLS-enabled
- anonymous has no `photo_arrangements` table privileges; authenticated has SELECT + INSERT only
- pixel edits never overwrite the immutable source photo

## Latest user evidence

The latest iPhone screenshot after v1.9 showed the guitar substantially cleaner and the user described the result as **getting closer**. That is sufficient to stop spending the next cycle on more threshold/crop tuning.

The visible remaining defects are now primarily rendering defects:
- the removed-object location can still look synthetic
- the moved object can still read as composited rather than naturally grounded in the room
- contact, lighting, occlusion, perspective-aware scale, and depth are not calibrated

## Photo Arrange v2.0 — scene-rendering layer

Functional runtime baseline: `1a5c609f5bbebd17c1177974f6cbe8dd8c887ef9`

Implemented:
- new web-only `PhotoArrangeEditorV20` wraps the validated v1.9 selector rather than rebuilding selection
- lifted cutouts receive a restrained local edge/contrast treatment intended to reduce the sticker-like appearance
- a subtle contact-shadow treatment is rendered beneath lifted objects to visually ground them
- the existing AI background repair action is elevated to **Improve background** after lift
- a new explicit **AI repair after lift** switch can automatically trigger the existing authenticated inpainting path after the user accepts a selection
- that switch is **off by default**
- enabling it displays an explicit privacy notice that the current scene and accepted repair mask will be sent to the configured image provider
- when disabled, lift/reconstruction remains on the existing local preview path until the user explicitly chooses Improve background
- v1.9 selection, refinement, movement, scale/rotation, persistence, and source-photo integrity remain unchanged
- native/non-web resolution continues to use the established fallback
- no database schema, RLS, persistence contract, canonical geometry, or API route changed

### Deployment evidence

- isolated branch: `photo-arrange-v2-scene-rendering`
- exact branch preview `dpl_HU1kR91rdtQWajCUjuDkuXKBx3ho` — READY on `1a5c609f5bbebd17c1177974f6cbe8dd8c887ef9`
- branch comparison against then-current `main` was a clean three-commit fast-forward containing only:
  - `apps/client/src/components/PhotoArrangeEditorV20.web.tsx`
  - `apps/client/src/components/PhotoArrangeEditorV20.tsx`
  - `apps/client/src/screens/PhotoArrangeWorkspace.tsx`
- production web deployment `dpl_UMGW1eoLmpHg1hXXwaEABaXViWZt` — READY on the exact runtime baseline and serving `formshift-web.vercel.app`
- live production `/arrange` — HTTP 200 smoke-verified after deployment

## Accuracy and privacy boundaries

- segmentation/refinement remain local in the browser
- contact shadow and edge treatment are **illustrative rendering aids**, not measured floor contact or calibrated lighting
- automatic AI repair occurs only after the user explicitly enables the switch; it is disabled by default
- the configured image-edit provider path is not claimed to be zero-data-retention
- the existing deterministic local removed-object preview is still not claimed to be photorealistic
- pixel movement does not implicitly alter canonical physical dimensions, room geometry, or measurement provenance
- perspective, depth, floor/wall contact, occlusion, relighting, and physical scale remain uncalibrated for free-form photographed-object movement

## Next validation

In the production browser/iPhone Safari:
1. hard refresh and open **Arrange**
2. select the guitar using the v1.9 focused selector
3. leave **AI repair after lift** off and lift the object; inspect whether the new contact/edge treatment makes the moved guitar look less like a sticker
4. move the guitar and inspect the local removed-object preview
5. reset/reselect, explicitly enable **AI repair after lift**, then lift the guitar
6. confirm the repair starts automatically only after that explicit opt-in
7. compare the AI-repaired old location with the local preview
8. confirm object drag/scale/rotation and Keep placement still work

## Next implementation decision

If the contact/edge treatment is useful and AI reconstruction materially improves the old location, retain this scene-rendering layer and proceed to **scene intelligence**: camera/floor/wall calibration, depth assistance, perspective-aware scale, contact constraints, occlusion and lighting treatment.

If AI repair still produces visibly poor old-location reconstruction, improve or replace the image-reconstruction provider/prompt before investing deeply in scene calibration. A depth model cannot compensate for obviously synthetic missing-background pixels.

## Not yet claimed

Photorealistic local inpainting, validated v2.0 visual improvement on the user's device, calibrated contact shadow, depth-aware occlusion, perspective-aware physical scaling, calibrated relighting, native iOS continuous photo manipulation, or dedicated persisted blueprint PDF.

## Authoritative record impact

- `CURRENT-STATE.md`: updated for the deployed Photo Arrange v2.0 scene-rendering release and pending real-device visual validation
- `DESIGN-SYSTEM.md`: unchanged; contact shadow, photo-first composition, restrained object treatment, and explicit AI reconstruction were already part of the durable design contract
- `ARCHITECTURE.md`: unchanged; v2.0 layers rendering and explicit user-controlled invocation over the existing local-selection / authenticated-repair architecture without changing persistence or service boundaries
- `PROJECT-CONSTITUTION.md`: unchanged; existing source-integrity, privacy, and photo-first rules continue to govern the release
