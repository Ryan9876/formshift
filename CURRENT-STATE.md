# FormShift Current State

**Revision:** 0.7.1  
**Date:** 2026-08-20  
**Milestone:** Photo Arrange v1.9 object-centered precision selection deployed; browser quality validation pending

FormShift is a **photo-first spatial augmentation product**. The real captured room image is the primary canvas; structured geometry remains the hidden authority. Plan/rectangle views are secondary technical verification surfaces.

## Validated Photo Arrange baseline

Authenticated browser/iPhone testing has established that:
- a normal tap reaches FormShift rather than Safari's native image-selection UI
- local MediaPipe interactive segmentation can isolate a photographed object
- a real photographed object such as the guitar can be lifted and moved using its photographed pixels
- room pinch-zoom and pan materially improve small-object targeting
- room-navigation gestures and lifted-object manipulation are meaningfully separated
- immutable source room imagery remains preserved in private FormShift storage

The overall Photo Arrange experience is still prototype-quality. Segmentation precision, background reconstruction, and scene realism remain the main quality constraints.

## Retained Arrange foundations

Photo Arrange v1.5–v1.8 retain:
- candidate selection preview before pixels are lifted
- explicit Add / Remove mask refinement
- continuous finger-painted refinement with Undo / Redo
- explicit Pan/review mode and two-finger room zoom
- one-finger lifted-object movement plus two-finger scale/rotation
- local removed-object preview plus explicit asynchronous AI background repair
- immutable persisted photo arrangements with private scene/mask/cutout/background assets and parent lineage
- latest saved derived scene restoration
- iPhone Safari safe-area/pointer-interruption polish
- prewarmed local selection model and cached semantic first mask
- local Add/Remove corrections without a new model inference after every stroke

Persistence/security baseline remains:
- Supabase private bucket `formshift-private`
- 26/26 public application tables RLS-enabled
- anonymous has no `photo_arrangements` table privileges; authenticated has SELECT + INSERT only
- pixel edits never overwrite the immutable source photo

## User evidence leading to v1.9

The latest production screenshot showed meaningful progress but still exposed two dominant defects:
- the guitar body was isolated reasonably well while the neck remained fused to a large white/cloth/background region
- the removed-object location remained visibly synthetic and faceted after local reconstruction

The lifted guitar also still read visually like a rectangular sticker because of the cyan rectangular selection treatment.

This evidence indicates the current bottleneck is no longer gesture design. It is the **selection/rendering pixel pipeline**.

## Photo Arrange v1.9 — object-centered precision selection

Functional runtime baseline: `8a9cbc7704283ed0bb5ea787d87584b66274004a`

Implemented:
- new web-only `PhotoArrangeEditorV19` wrapper preserves the earlier v1.7/v1.8 editor paths for low-risk rollback
- the local segmentation model is still prewarmed before editing
- instead of segmenting the entire room image, the first inference now runs on an **object-centered crop around the user's tap**
- the crop uses approximately 58% of source width and 72% of source height, capped to an 820 px model-working dimension
- the tap seed is remapped into the crop before inference
- the crop mask is projected back into a full-scene working mask at up to a 1000 px maximum dimension
- confidence values are tightened again during projection so uncertain wall/cloth pixels are penalized before the existing seeded connected-component cleanup
- manual Add/Remove refinement remains local and reuses the cached semantic mask
- candidate review still defaults to Pan/review rather than Add, preserving the no-accidental-blue-paint behavior
- the candidate acceptance action remains the explicit **Lift object** transition
- the lifted-object rectangular cyan sticker outline is suppressed on web and replaced with a subtle silhouette/drop-shadow emphasis around the transparent cutout
- no API, database schema, persistence, or AI-repair contract changed
- native/non-web resolution continues to use the existing fallback; v1.9 specifically targets the browser/iPhone-Safari path

### Deployment evidence

- isolated branch: `photo-arrange-v19-coarse-fine`
- exact final branch preview `dpl_CoUVq1uujTjnwPq8hjnazMP5BKNh` — READY on `8a9cbc7704283ed0bb5ea787d87584b66274004a`
- preview Expo export completed successfully and explicitly included `/arrange`
- branch comparison against `main` was a clean three-commit fast-forward containing only:
  - `apps/client/src/components/PhotoArrangeEditorV19.web.tsx`
  - `apps/client/src/components/PhotoArrangeEditorV19.tsx`
  - `apps/client/src/screens/PhotoArrangeWorkspace.tsx`
- production web deployment `dpl_AUJYjYU5HWoAhY9KGiuCRYdLBbhp` — READY on the exact runtime baseline and serving `formshift-web.vercel.app`
- live production `/arrange` — HTTP 200 smoke-verified

## Accuracy and privacy boundaries

- segmentation and mask refinement remain local in the browser
- focused cropping is an inference-quality/performance technique; it does not make the resulting mask authoritative geometry
- the tighter mask may intentionally omit uncertain edge pixels; users can restore them with Add
- AI repair remains explicit and sends the current scene plus accepted mask only when chosen
- the configured image-edit provider path is not claimed to be zero-data-retention
- the local removed-object reconstruction is still illustrative and is not claimed to be photorealistic
- pixel movement does not implicitly alter canonical physical dimensions, room geometry, or measurement provenance
- perspective, depth, floor/wall contact, occlusion, relighting, and physical scale remain uncalibrated for free-form photographed-object movement

## Next validation

In the production browser:
1. hard refresh and open **Arrange**
2. allow **Preparing precision selection…** to finish
3. zoom to the guitar and tap near the guitar body/neck junction
4. compare tap-to-mask time with v1.8
5. inspect whether the neck is separated from the white/cloth background more cleanly
6. confirm candidate review opens in Pan/review and does not paint blue unless Add/Remove is explicitly selected
7. use Add/Remove only if needed, then choose **Lift object**
8. confirm the lifted object no longer has the prominent rectangular cyan sticker outline
9. move the object and inspect both edge quality and the old-location reconstruction
10. verify existing scale/rotate, optional AI repair, Keep placement, and refresh persistence still work

## Decision after v1.9 validation

If the focused-crop inference materially improves narrow/irregular object isolation, retain MediaPipe for the fast local first pass and next improve **background reconstruction/rendering**.

If the guitar neck or similarly complex objects still remain materially fused to background, stop tuning thresholds/crop sizes and replace or augment MediaPipe with a stronger segmentation/refinement pipeline. Additional gesture controls, depth, or perspective work should not precede a reliable source mask.

Once segmentation is practically reliable, the next major phase is **Photo Arrange v2 scene intelligence**: camera/floor/wall calibration, depth assistance, perspective-aware physical scaling, contact constraints, occlusion, contact shadow/lighting treatment, photo-object-to-spatial-ID binding, and reuse in Organize and Build.

## Not yet claimed

Measured reduction in selection latency from v1.9 on the user's browser, materially improved guitar-neck precision in real use, production-quality segmentation or inpainting, photorealistic removed-object reconstruction, calibrated perspective/occlusion/relighting, native iOS continuous photo manipulation, or dedicated persisted blueprint PDF.

## Authoritative record impact

- `CURRENT-STATE.md`: updated for the deployed Photo Arrange v1.9 precision-selection release and pending browser validation
- `DESIGN-SYSTEM.md`: unchanged; v1.9 implements the existing restrained selected-object treatment and candidate-review contract without changing the durable interaction language
- `ARCHITECTURE.md`: unchanged; focused local inference remains within the established browser segmentation boundary and does not change persistence or services
- `PROJECT-CONSTITUTION.md`: unchanged; the existing photo-first/source-integrity rules continue to govern the release
