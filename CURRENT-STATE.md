# FormShift Current State

**Revision:** 0.6.2  
**Date:** 2026-08-20  
**Milestone:** Photo Arrange v1 MediaPipe invocation hotfix deployed; authenticated real-object interaction validation pending

FormShift is a **photo-first spatial augmentation product**. The real captured room image is the primary canvas; structured geometry remains the hidden authority. Plan/rectangle views are secondary technical verification surfaces.

## Photo Arrange v1

Runtime baseline: `6a57cde192c3c0e7468eb792e0a193b11dc4b2c9`

Production evidence:
- web deployment `dpl_5pwSnuUnfvZMcNSW6rNBnXXdqXMC` — READY on the exact runtime baseline
- exact preview deployment `dpl_7d3sqPaXGv66taZWsgNZDKsQL5ow` — READY and exported `/arrange`
- API runtime is unchanged by this client-only segmentation hotfix; the prior authenticated background-repair API remains active

Implemented:
- **Arrange** routes to `/arrange`
- real room photo is the primary surface
- tap-to-select interactive segmentation runs locally in the browser
- selected photographed pixels become a transparent draggable cutout
- cutout supports visual resize and rotation
- old location receives immediate local reconstruction
- **Refine background with AI** is explicit/opt-in and requires authenticated editable project/space access
- **Keep placement** composites a derived session preview
- **Reset** restores the immutable source photo
- native iOS currently falls back to Plan while web/iPhone Safari is validated

### iPhone Safari touch handling

The room-photo selection surface now:
- captures selection on pointer-down
- calculates coordinates from the actual rendered photo bounds
- suppresses Safari image/text callouts, selection, and drag behavior
- prevents the room image from receiving pointer events directly
- applies the same gesture shielding to the movable cutout

### MediaPipe invocation hotfix

Observed after the Safari gesture correction: the tap reached FormShift and began segmentation, but MediaPipe failed with `t.map is not a function`.

Root cause: the compatibility guard required a runtime `BrushMode.POSITIVE` export before using MediaPipe's stateful `setImage() + segment(strokes)` contract. On the mobile bundle that enum was not exposed, so FormShift incorrectly fell back to the legacy one-shot segment call against a stateful segmenter.

Deployed correction:
- stateful mode is selected whenever `setImage` exists
- the source photo is set with `setImage(image)`
- the tap is sent as a positive point stroke to `segment(strokes)`
- brush mode uses the exported positive enum when present and the documented numeric positive value (`1`) otherwise
- legacy image + ROI invocation remains only for runtimes without `setImage`

This correction is compile/export/deployment-verified but **not yet interaction-validated on the user's iPhone**.

Privacy/accuracy boundaries:
- selection is local
- AI repair sends scene + mask only after explicit action
- default image model is `openai/gpt-image-2`; this path is not zero-data-retention
- edits are preview-only, not persisted
- physical dimensions, depth, occlusion, relighting, and camera calibration are not inferred from pixel movement

## Existing validated baseline

Prior validated phases retain private room-photo capture/storage, canonical geometry and immutable versions, Plan Arrange persistence, Organize Intelligence, Build Intelligence/atomic acceptance, Build-plan restoration, and blueprint presentation.

Infrastructure:
- Supabase ref `oomtpnqprxykcjzrlfgc`; private bucket `formshift-private`; 25/25 public app tables RLS-enabled
- web `https://formshift-web.vercel.app`
- API `https://formshift-api.vercel.app`

## Next validation

On iPhone Safari: hard refresh, choose **Arrange**, use a normal quick tap near the center of a distinct object such as the guitar, confirm the UI changes to **Finding object edges…** and then to an isolated movable cutout without the prior `t.map` error. Drag the cutout and test Reset.

## Next implementation

After real-object selection is interaction-validated: improve segmentation quality and drag ergonomics, then Photo Arrange v2 with persisted derived scenes/masks/transforms, binding to spatial IDs, camera/floor/wall calibration, depth/occlusion/perspective, stronger inpainting, reuse for Organize, and native iOS segmentation/RealityKit.

## Not yet claimed

Photo Arrange real-object selection/rearrangement in the authenticated production browser, object-specific segmentation quality, persisted scene edits, calibrated projection/occlusion/relighting, native iOS photo manipulation, or dedicated persisted blueprint PDF.

## Authoritative record impact

- `CURRENT-STATE.md`: updated for the deployed MediaPipe invocation hotfix
- `PROJECT-CONSTITUTION.md`: unchanged
- `ARCHITECTURE.md`: unchanged
- `DESIGN-SYSTEM.md`: unchanged