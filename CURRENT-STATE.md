# FormShift Current State

**Revision:** 0.9.2  
**Date:** 2026-08-21  
**Milestone:** Photo Arrange v2.2 editable saved placements deployed; real-device restore-and-drag validation pending

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

Photo Arrange v2.1 introduced an optional image-space perspective/contact assist. Real-device testing revealed a critical regression: the user could no longer select any object. The three v2.1 runtime files were rolled back to the last selection-validated implementation before further Arrange work continued.

Rollback runtime: `c9402bce2e15ba1e45fb683295dc6eddccca7fd4`  
Rollback production deployment: `dpl_A9jKNGoEQc9zXTYxALggV86shb3o` — READY

The v2.1 screen-Y perspective scaling, dynamic contact ellipse/guide, and v2.1 transform metadata remain inactive.

## Photo Arrange v2.2 — editable saved placements

Functional runtime baseline: `5983276ad773ea8abdd1ac03924b67a33b31ccf5`

A subsequent real-device screenshot exposed a separate persistence/interaction problem: the visible guitar was part of a restored **flattened composite**, so it looked like an arranged object but could not be dragged farther down. The runtime had been restoring only `result_asset_id` even though `photo_arrangements` already retained the component assets needed for editing.

Production data confirmed the latest saved guitar arrangement already contained:
- result/composite asset
- accepted mask asset
- photographed-object cutout asset
- object-free background asset
- transform JSON with x/y/scale/rotation/bounding box

No database migration was required.

### Implemented

- `loadLatestPhotoArrangement()` now restores the complete editable asset set rather than only the flattened result image
- the loader signs and returns the result, background, mask, and cutout assets plus parsed transform metadata
- when the complete asset set exists, Arrange opens the saved object directly as the active movable selection over its object-free background
- saved x/y position, scale, rotation, and bounding box are restored without re-segmenting the same object
- incomplete/legacy saved arrangements still fall back to the flattened composite and may require re-selection
- a fresh accepted lift now retains the deterministic local object-free background even when AI repair is not used
- **Keep placement** persists that background, composite result, mask, cutout, transform, and parent lineage
- after **Keep placement**, the object remains active in the current Arrange session instead of immediately collapsing into non-editable pixels
- future saves use renderer version `photo-arrange-2.2`
- restored objects with an already persisted clean background do not offer a redundant background-repair action
- immutable source-room-photo behavior is unchanged
- object-centered MediaPipe selection/refinement code was intentionally left unchanged to avoid repeating the v2.1 selection regression

### Validation and deployment evidence

- isolated branch: `photo-arrange-editable-restore-v22`
- exact preview deployment `dpl_Dbadv9gU9bGEVMPn84BCqS6aT9rT` — READY on `5983276ad773ea8abdd1ac03924b67a33b31ccf5`
- branch comparison against then-current `main` was a clean fast-forward affecting only:
  - `apps/client/src/components/PhotoArrangeEditorV17.web.tsx`
  - `apps/client/src/data/photoArrangementPersistence.ts`
- production deployment `dpl_HgQSnBmuUESfhokvU2uNyfiyBkz3` — READY on the exact functional runtime and serving `formshift-web.vercel.app`
- production `/arrange` — HTTP 200 smoke-verified
- API service, database schema, and RLS policies were unchanged

The deployment is verified; **direct iPhone interaction with the restored editable object is not yet confirmed**.

## Current Arrange capabilities

The active production runtime now retains:
- object-centered local segmentation around a new object tap
- candidate mask preview
- continuous Add / Remove refinement with Undo / Redo
- explicit Pan/review mode and two-finger room zoom
- explicit **Lift object** transition
- one-finger object movement and two-finger scale/rotation
- opt-in AI background repair with visible queued/sending/completed/failed state for a fresh lift
- editable saved photo-placement restoration when background/cutout/mask/transform assets are complete
- private immutable `photo_arrangements` persistence and parent lineage
- source-photo integrity
- iPhone Safari gesture/safe-area hardening

## Persistence/security baseline

- Supabase private bucket `formshift-private`
- 26/26 public application tables RLS-enabled
- anonymous has no `photo_arrangements` table privileges; authenticated has SELECT + INSERT only
- pixel edits never overwrite the immutable source photo
- saved composite images remain history/display artifacts rather than the sole source of editability
- AI background repair remains explicit opt-in and the configured image-provider path is not claimed to be zero-data-retention

## Accuracy boundaries

- segmentation/refinement are image-based and remain prototype quality
- deterministic local removed-object reconstruction is a fast fallback and is not photorealistic
- a restored cutout/transform is editable image state, not measured geometry
- free-form photo movement does not establish measured depth, floor contact, perspective, occlusion, relighting, or physical scale
- canonical room/object dimensions and measurement provenance are not changed by pixel movement

## Next validation

On the user's iPhone/browser after a hard refresh:
1. open **Arrange**
2. confirm the latest saved guitar opens already active with **Arrange object** controls rather than only the idle `Saved arrangement restored` state
3. drag the guitar substantially downward in the photo
4. choose **Keep placement**
5. drag it again immediately and confirm it remains editable after saving
6. refresh/reopen Arrange and confirm the guitar restores as active at its newly saved position
7. optionally change scale/rotation, save, refresh, and confirm those transforms restore
8. for a fresh object, leave AI repair off, lift/save it, refresh, and confirm it still restores editable from the persisted local background

## Next implementation decision

If v2.2 restore-and-drag works reliably, preserve this editable-derived-scene contract and resume scene-realism work behind a separate rendering boundary. Do not modify the validated selection/gesture core to implement future depth/contact/occlusion features.

Longer term, prefer a real scene model—floor/support planes, coarse depth, occlusion and camera-aware projection—over accumulating additional screen-space heuristics.

## Not yet claimed

Real-device validation of v2.2 editable restore, calibrated floor snapping, real scene depth, depth-aware occlusion, perspective-aware physical scaling, physically correct contact shadow, calibrated relighting, native iOS continuous photo manipulation, or dedicated persisted blueprint PDF.

## Authoritative record impact

- `CURRENT-STATE.md`: updated to revision 0.9.2 for the deployed v2.2 editable-placement runtime and pending real-device validation
- `ARCHITECTURE.md`: updated to revision 0.5.1 because saved Arrange state is now durably defined as reconstructable background + mask + cutout + transform, with the flattened composite as a convenience/history artifact
- `DESIGN-SYSTEM.md`: updated to revision 0.5.5 because saved photographed objects are now required to remain directly editable when complete assets exist
- `PROJECT-CONSTITUTION.md`: unchanged; existing source integrity, privacy, reversibility, and measurement-provenance rules already govern this behavior
