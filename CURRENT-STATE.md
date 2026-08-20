# FormShift Current State

**Revision:** 0.8.1  
**Date:** 2026-08-20  
**Milestone:** Photo Arrange v2.0.1 automatic AI-repair trigger fix deployed; first real AI-repair visual validation pending

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
- object-centered local inference materially improved guitar isolation enough to shift the primary bottleneck from gesture design to rendering quality

The experience remains prototype-quality. Removed-object reconstruction, edge realism, contact, occlusion, perspective, and lighting remain the dominant quality constraints.

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

## Photo Arrange v2.0 — scene-rendering layer

Functional runtime baseline: `1a5c609f5bbebd17c1177974f6cbe8dd8c887ef9`

Implemented:
- web-only `PhotoArrangeEditorV20` wraps the validated v1.9 selector
- lifted cutouts receive a restrained local edge/contrast treatment
- a subtle illustrative contact-shadow treatment is rendered beneath lifted objects
- the existing authenticated background-repair action is surfaced as the higher-quality reconstruction path
- an explicit **AI repair after lift** switch is available and remains **off by default**
- enabling it displays an explicit privacy notice that the current scene and accepted repair mask will be sent to the configured image provider
- v1.9 selection, refinement, movement, scale/rotation, persistence, and source-photo integrity remain unchanged

## User A/B evidence and v2.0 diagnosis

The user compared two production screenshots:
- **AI repair Off**
- **AI repair On**

The two outputs were nearly identical and the large synthetic removed-object artifact remained.

Production diagnosis showed this was **not a weak AI inpainting result**. The automatic AI-repair request never executed:
- production Vercel API logs contained no matching repair request for the test
- `public.ai_runs` contained **zero** rows with `task_name = 'photo-background-repair'`
- the v2.0 wrapper set its per-lift handled flag as soon as lifted-state text appeared, before the rendered AI-repair button necessarily existed
- when the button appeared in a later DOM update, the wrapper believed that lift had already been handled and skipped the automatic request

Therefore the first v2.0 A/B comparison does **not** validate or invalidate `openai/gpt-image-2` reconstruction quality. It compared local reconstruction against another local reconstruction while the UI incorrectly implied automatic AI repair was enabled.

## Photo Arrange v2.0.1 — repair-trigger observability hotfix

Functional runtime baseline: `c1ddc2cbda44d9a5d5b1eedfc1fc2069a4a750f9`

Implemented:
- automatic repair no longer marks a lift as handled until the actual enabled repair control exists
- after an opted-in lift, the wrapper waits for the repair action to be rendered and only then schedules the request
- removed the fragile mutation of the repair button's visible React text; accessibility labeling is applied without rewriting the rendered control contents
- added explicit visible repair states:
  - **AI repair queued**
  - **Sending for AI repair…**
  - **AI background repaired**
  - **AI repair did not complete**
- pointer/UI rendering, segmentation, persistence, database schema, and API endpoint contract are unchanged
- automatic repair remains explicit opt-in and off by default

### Deployment evidence

- isolated branch: `repair-v201`
- exact preview deployment `dpl_2RoTrnXT4RXAvZAir6S5KVzSySgs` — READY on `c1ddc2cbda44d9a5d5b1eedfc1fc2069a4a750f9`
- preview Expo export completed successfully and included `/arrange`
- branch comparison against `main` was a clean one-commit fast-forward changing only `apps/client/src/components/PhotoArrangeEditorV20.web.tsx`
- production deployment `dpl_E8YpNCYg4uBD8GADLdPPhbZNLqEv` — READY on the exact runtime baseline and serving `formshift-web.vercel.app`
- live production `/arrange` — HTTP 200 smoke-verified

## Accuracy and privacy boundaries

- segmentation/refinement remain local in the browser
- contact shadow and edge treatment are illustrative rendering aids, not measured floor contact or calibrated lighting
- automatic AI repair occurs only after explicit user opt-in and remains disabled by default
- the configured image-edit provider path is not claimed to be zero-data-retention
- deterministic local removed-object reconstruction is not claimed to be photorealistic
- pixel movement does not implicitly alter canonical physical dimensions, room geometry, or measurement provenance
- perspective, depth, floor/wall contact, occlusion, relighting, and physical scale remain uncalibrated for free-form photographed-object movement

## Next validation

In production:
1. hard refresh and open **Arrange**
2. enable **AI repair after lift** before selecting/lifting the guitar
3. select and choose **Lift object**
4. confirm the scene-rendering bar visibly progresses through **AI repair queued** and **Sending for AI repair…**
5. wait for **AI background repaired** or a visible failure state
6. after completion, confirm Supabase receives a `photo-background-repair` `ai_runs` row and compare the reconstructed old location against the local preview
7. only after a confirmed completed run judge whether the current image model/prompt/mask produces materially better reconstruction

## Next implementation decision

If a confirmed AI run materially improves the old location, keep the authenticated provider path and then proceed toward scene intelligence: floor/wall understanding, depth assistance, occlusion, perspective-aware scale, and lighting/contact treatment.

If a confirmed completed AI run still leaves the removed-object area visibly synthetic, stop tuning the wrapper and improve the reconstruction pipeline itself: repair-mask construction, model/prompt/provider strategy, and result compositing. Depth work should not precede acceptable background reconstruction.

## Not yet claimed

A successful production `photo-background-repair` run after the v2.0.1 trigger fix, materially improved AI inpainting quality on the user's room, photorealistic local reconstruction, calibrated contact shadow, depth-aware occlusion, perspective-aware physical scaling, calibrated relighting, native iOS continuous photo manipulation, or dedicated persisted blueprint PDF.

## Authoritative record impact

- `CURRENT-STATE.md`: updated for the diagnosed v2.0 false A/B result and deployed v2.0.1 automatic-repair trigger/observability fix
- `DESIGN-SYSTEM.md`: unchanged; no durable interaction rule changed
- `ARCHITECTURE.md`: unchanged; the intended authenticated repair boundary remains the same and this patch fixes invocation reliability rather than architecture
- `PROJECT-CONSTITUTION.md`: unchanged; existing source-integrity, privacy, and photo-first rules continue to govern the release
