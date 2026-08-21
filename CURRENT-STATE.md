# FormShift Current State

**Revision:** 0.9.1  
**Date:** 2026-08-21  
**Milestone:** Photo Arrange v2.1 placement assist rolled back after a selection regression; last validated selection/repair runtime restored in production

FormShift is a **photo-first spatial augmentation product**. The real captured room image is the primary canvas; structured geometry remains the hidden authority. Plan/rectangle views are secondary technical verification surfaces.

## Validated Photo Arrange baseline

Authenticated browser/iPhone testing established that the pre-v2.1 Arrange runtime can:
- receive normal object taps without Safari taking over the gesture
- isolate a photographed object with local object-centered segmentation
- preview/refine a candidate mask before pixels are lifted
- lift and move the real photographed pixels
- zoom/pan the room independently from object manipulation
- persist derived arrangements without overwriting the immutable source photo
- run explicit authenticated AI background reconstruction through `openai/gpt-image-2`

The validated AI repair production test completed successfully with `openai/gpt-image-2` in 24,880 ms and materially improved the removed guitar location compared with the deterministic local fallback.

## v2.1 regression and rollback

Photo Arrange v2.1 introduced an optional image-space perspective/contact assist. The deployment built successfully and `/arrange` returned HTTP 200, but real-device testing immediately revealed a critical regression: **the user could no longer select any object**.

Because selection is a foundational Arrange capability, the v2.1 runtime was not retained while debugging the placement feature.

Rollback action:
- branch: `hotfix-restore-selection-v21`
- rollback commit: `c9402bce2e15ba1e45fb683295dc6eddccca7fd4`
- restored the three runtime files changed by v2.1 to their last selection-validated contents from commit `30c9d84b5f2bfe3a72fe552b7951b6c64a84f342`
- preview deployment `dpl_Baw5fPqwi4ZfYvztKY9qsRj2ymL4` — READY on the exact rollback commit
- branch comparison was a clean one-commit fast-forward changing only:
  - `apps/client/src/components/PhotoArrangeEditorV17.web.tsx`
  - `apps/client/src/components/PhotoArrangeEditorV20.web.tsx`
  - `apps/client/src/data/photoArrangementPersistence.ts`
- production deployment `dpl_A9jKNGoEQc9zXTYxALggV86shb3o` — READY on the exact rollback commit and serving `formshift-web.vercel.app`
- production `/arrange` — HTTP 200 smoke-verified

The rollback restores the previously validated implementation in code, but **selection is not yet re-confirmed on the user's device after this rollback**.

## Current Arrange capabilities

The active production runtime retains:
- object-centered local segmentation around the tap
- candidate mask preview
- continuous Add / Remove refinement with Undo / Redo
- explicit Pan/review mode and two-finger room zoom
- explicit **Lift object** transition
- one-finger object movement and two-finger scale/rotation
- opt-in AI background repair with visible queued/sending/completed/failed state
- private immutable `photo_arrangements` persistence
- source-photo integrity and parent lineage
- iPhone Safari gesture/safe-area hardening

The v2.1 screen-Y perspective scaling, dynamic contact ellipse/guide, and v2.1 transform metadata are **not active in the production runtime after the rollback**.

## Persistence/security baseline

- Supabase private bucket `formshift-private`
- 26/26 public application tables RLS-enabled
- anonymous has no `photo_arrangements` table privileges; authenticated has SELECT + INSERT only
- pixel edits never overwrite the immutable source photo
- AI background repair remains explicit opt-in and the configured image-provider path is not claimed to be zero-data-retention

## Accuracy boundaries

- segmentation/refinement are image-based and remain prototype quality
- deterministic local removed-object reconstruction is a fast fallback and is not photorealistic
- free-form photo movement does not establish measured depth, floor contact, perspective, occlusion, relighting, or physical scale
- canonical room/object dimensions and measurement provenance are not changed by pixel movement

## Next validation

On the user's iPhone/browser after a hard refresh:
1. open **Arrange**
2. zoom to the guitar or another distinct object
3. short-tap the object
4. confirm the candidate selection mask appears again
5. confirm refinement, Lift object, movement, and AI repair still work

## Next implementation decision

Only after selection is re-confirmed should placement realism return. Reintroduce it behind a separate rendering/scene-assist boundary rather than modifying the validated selection/gesture core directly. The next placement implementation should be independently switchable/rollbackable and must pass selection regression testing before production promotion.

Longer term, prefer a real scene model—floor/support planes, coarse depth, occlusion and camera-aware projection—over accumulating additional screen-space heuristics.

## Not yet claimed

Post-rollback device confirmation of selection, calibrated floor snapping, real scene depth, depth-aware occlusion, perspective-aware physical scaling, physically correct contact shadow, calibrated relighting, native iOS continuous photo manipulation, or dedicated persisted blueprint PDF.

## Authoritative record impact

- `CURRENT-STATE.md`: updated for the production rollback and the required selection re-validation
- `DESIGN-SYSTEM.md`: unchanged; the optional/reversible estimated-assist rule remains a durable design constraint for any future reimplementation, not a statement that the feature is currently deployed
- `ARCHITECTURE.md`: unchanged
- `PROJECT-CONSTITUTION.md`: unchanged
