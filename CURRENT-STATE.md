# FormShift Current State

**Revision:** 0.9.3  
**Date:** 2026-08-22  
**Milestone:** Production image API remains backward-compatible with Photo Arrange v2.2 and now accepts authenticated FormShift branch previews plus opt-in Prepared Scene multi-object repair; production web UI remains on the validated Photo Arrange baseline

FormShift is a **photo-first spatial augmentation product**. The real captured room image is the primary canvas; structured geometry remains the hidden authority. Plan/rectangle views are secondary technical verification surfaces.

## Production API compatibility hotfix — 2026-08-22

Physical testing of the feature-flagged `scene-foundation-v1` preview exposed a transport failure when **Improve background** was pressed. Production runtime logs showed three successful `OPTIONS /api/ai/repair-background` preflights but no subsequent `POST`, and `ai_runs` contained no corresponding image task. The image model and Prepared Scene cache were therefore not the failing components: the preview browser origin was being rejected by the production API CORS response before the authenticated repair request could execute.

A backward-compatible API-only hotfix was deployed on `main`:

- commit `674c7b5e86598ca0c671338766b1a3551ac923db`;
- production API deployment `dpl_3nQ1HZ2DTFPLrt3nLwXKKPKoCD3C` — **READY**;
- production API alias remains `formshift-api.vercel.app`;
- FormShift branch preview aliases matching the controlled `formshift-web-git-*-lew7.vercel.app` project/team pattern may now pass the CORS origin gate;
- CORS does **not** grant project access: protected repair requests still require a valid bearer identity plus editable project/space authorization;
- `/api/ai/repair-background` now accepts optional `mode: 'prepared-scene'` for multi-object clean-plate reconstruction;
- omitting `mode` preserves the existing Photo Arrange single-object repair task, schema and prompt contract.

The FormShift production web deployment triggered by this API-only commit was canceled; no Prepared Scene UI was promoted through this hotfix. The existing production Photo Arrange v2.2 web baseline remains the user-facing production interface.

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

The API compatibility hotfix above does not alter this interaction runtime.

## Current Arrange capabilities

The active production runtime retains:
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
- public application tables remain RLS-protected
- anonymous has no `photo_arrangements` table privileges; authenticated has SELECT + INSERT only
- pixel edits never overwrite the immutable source photo
- saved composite images remain history/display artifacts rather than the sole source of editability
- AI background repair remains explicit opt-in and the configured image-provider path is not claimed to be zero-data-retention
- allowing controlled FormShift preview origins through CORS does not bypass bearer authentication, project membership, space existence or edit authorization

## Accuracy boundaries

- segmentation/refinement are image-based and remain prototype quality
- deterministic local removed-object reconstruction is a fast fallback and is not photorealistic
- a restored cutout/transform is editable image state, not measured geometry
- free-form photo movement does not establish measured depth, floor contact, perspective, occlusion, relighting, or physical scale
- canonical room/object dimensions and measurement provenance are not changed by pixel movement

## Next validation

Production Photo Arrange remains the fallback while the isolated Prepared Scene branch is tested. For the branch candidate, confirm that an explicit **Improve background** request now proceeds past preflight and creates a `prepared-scene-background-repair` AI run. Do not promote the Prepared Scene UI until its cache/reconstruction/object-quality acceptance criteria pass on the target iPhone.

## Not yet claimed

Production Prepared Scene UI, real-device Prepared Scene cache restore, real-device multi-object background-repair success, calibrated floor snapping, real scene depth, depth-aware occlusion, perspective-aware physical scaling, physically correct contact shadow, calibrated relighting, native iOS continuous photo manipulation, or dedicated persisted blueprint PDF.

## Authoritative record impact

- `CURRENT-STATE.md`: revision 0.9.3 records the deployed API compatibility hotfix and explicitly preserves the production Photo Arrange web boundary.
- `ARCHITECTURE.md`: unchanged; the existing authenticated server-AI and provider-boundary architecture already covers this compatibility correction.
- `DESIGN-SYSTEM.md`: unchanged; no durable visual-language change.
- `PROJECT-CONSTITUTION.md`: unchanged; existing source integrity, privacy, authorization, reversibility and measurement-provenance rules continue to govern the runtime.
