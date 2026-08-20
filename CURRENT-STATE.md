# FormShift Current State

**Revision:** 0.6.1  
**Date:** 2026-08-20  
**Milestone:** Photo Arrange v1 touch hotfix deployed; authenticated real-object interaction validation pending

FormShift is a **photo-first spatial augmentation product**. The real captured room image is the primary canvas; structured geometry remains the hidden authority. Plan/rectangle views are secondary technical verification surfaces.

## Photo Arrange v1

Runtime baseline: `fd01f687e7fa8f98c60ae5f2cbdafffaa2e6f972`

Production evidence:
- web deployment `dpl_GRgZtw4QBu15LF2BQjxZiJ825JJk` — READY on the exact runtime baseline
- production `/arrange` route remains part of the exported web application
- API runtime is unchanged by the gesture-only hotfix; the prior authenticated background-repair API remains the active production implementation

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

### iPhone Safari gesture hotfix

Observed production failure: long-pressing the room photo invoked Safari's native Copy / Find Selection callout instead of FormShift object selection.

Deployed correction:
- replaced the React Native synthetic press hit target with a web-native pointer surface
- selection begins on pointer-down instead of waiting for a completed press
- tap coordinates are calculated from the actual rendered photo bounds
- Safari image/text callouts, selection, and drag behavior are suppressed inside the editing canvas
- the room image no longer receives pointer events directly
- the movable cutout receives the same Safari gesture shielding

This hotfix is deployment-verified but **not yet interaction-validated on the user's iPhone**.

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

On iPhone Safari: hard refresh, choose **Arrange**, use a normal quick tap near the center of a distinct object such as the guitar, confirm the UI immediately changes to **Finding object edges…**, then confirm the actual photographed pixels isolate and can be dragged. Long-press should no longer open Safari's Copy / Find Selection menu.

## Next implementation

After the touch fix is interaction-validated: improve segmentation quality and drag ergonomics, then Photo Arrange v2 with persisted derived scenes/masks/transforms, binding to spatial IDs, camera/floor/wall calibration, depth/occlusion/perspective, stronger inpainting, reuse for Organize, and native iOS segmentation/RealityKit.

## Not yet claimed

Photo Arrange real-object selection/rearrangement in the authenticated production browser, object-specific segmentation quality, persisted scene edits, calibrated projection/occlusion/relighting, native iOS photo manipulation, or dedicated persisted blueprint PDF.

## Authoritative record impact

- `CURRENT-STATE.md`: updated for the deployed iPhone Safari gesture hotfix
- `PROJECT-CONSTITUTION.md`: unchanged
- `ARCHITECTURE.md`: unchanged
- `DESIGN-SYSTEM.md`: unchanged