# FormShift Current State

**Revision:** 0.8.2  
**Date:** 2026-08-20  
**Milestone:** Photo Arrange v2.0.1 AI background repair validated in production; scene-placement realism is now the primary Arrange quality target

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
- the authenticated AI background-repair path now executes successfully after explicit opt-in and materially improves the removed-object location compared with the deterministic local fallback

The experience remains prototype-quality. The dominant remaining quality constraints are now placement realism: depth, occlusion, perspective-aware scale, contact, edge integration, and lighting.

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

## Photo Arrange v2.0.1 — repair-trigger observability hotfix

Functional runtime baseline: `c1ddc2cbda44d9a5d5b1eedfc1fc2069a4a750f9`

Implemented:
- automatic repair no longer marks a lift as handled until the actual enabled repair control exists
- after an opted-in lift, the wrapper waits for the repair action to be rendered and only then schedules the request
- removed the fragile mutation of the repair button's visible React text; accessibility labeling is applied without rewriting rendered control contents
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

## Validated AI background repair

A real production iPhone test after v2.0.1 showed the removed guitar location reconstructed as continuous room background instead of the faceted deterministic fallback. The user assessed the result as **not bad**, which is sufficient to retain the current authenticated AI repair path for the prototype baseline.

Server-side evidence for that exact test:
- `public.ai_runs.task_name = 'photo-background-repair'`
- status: `completed`
- provider model: `openai/gpt-image-2`
- latency: `24,880 ms`
- error class: none
- created at: `2026-08-20 17:16:28.707697+00`

This validates that the v2.0.1 trigger fix executes the intended provider request and that the current model/prompt/mask can produce a materially improved removed-object reconstruction on the user's real room.

## Accuracy and privacy boundaries

- segmentation/refinement remain local in the browser
- contact shadow and edge treatment are illustrative rendering aids, not measured floor contact or calibrated lighting
- automatic AI repair occurs only after explicit user opt-in and remains disabled by default
- the configured image-edit provider path is not claimed to be zero-data-retention
- deterministic local removed-object reconstruction remains a fast fallback and is not claimed to be photorealistic
- pixel movement does not implicitly alter canonical physical dimensions, room geometry, or measurement provenance
- perspective, depth, floor/wall contact, occlusion, relighting, and physical scale remain uncalibrated for free-form photographed-object movement

## Next implementation target

Retain `openai/gpt-image-2` background reconstruction for the prototype baseline and shift development effort to **scene-placement realism**:
1. estimate floor/wall/support surfaces and a coarse depth field
2. make apparent object scale respond to placement depth/perspective rather than manual 2D scaling alone
3. introduce depth-aware occlusion so real furniture can correctly pass in front of or behind the moved object
4. anchor a contact point and generate scene-aware contact shadow rather than a generic shadow ellipse
5. improve edge matting/color spill so the moved cutout inherits nearby scene tone more naturally
6. preserve all scene-intelligence outputs as estimates with confidence, never as measured geometry unless calibrated

## Not yet claimed

Photorealistic local reconstruction without AI, calibrated contact shadow, depth-aware occlusion, perspective-aware physical scaling, calibrated relighting, native iOS continuous photo manipulation, or dedicated persisted blueprint PDF.

## Authoritative record impact

- `CURRENT-STATE.md`: updated for the validated production AI background-repair result and next scene-placement priority
- `DESIGN-SYSTEM.md`: unchanged; no durable interaction rule changed
- `ARCHITECTURE.md`: unchanged; the authenticated repair boundary and provider strategy remain as previously defined
- `PROJECT-CONSTITUTION.md`: unchanged; existing source-integrity, privacy, and photo-first rules continue to govern the release
