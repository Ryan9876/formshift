# FormShift Current State

**Revision:** 0.6.0  
**Date:** 2026-08-20  
**Milestone:** Photo Arrange v1 deployed; authenticated real-object interaction validation pending

FormShift is a **photo-first spatial augmentation product**. The real captured room image is the primary canvas; structured geometry remains the hidden authority. Plan/rectangle views are secondary technical verification surfaces.

## Photo Arrange v1

Runtime baseline: `19e3d7993344c41acdc14ca0690fb1e472afedf7`

Production evidence:
- web deployment `dpl_B8nJjj7CrFfX5T5RvZB7HtLknRTK` — READY
- API deployment `dpl_GJMX5aQKywMaNWyABhtg2h9YZMhH` — READY
- production `/arrange` route — HTTP 200 smoke-verified
- exact runtime web candidate exported protected `/arrange` successfully before promotion
- authenticated background-repair API compiled successfully and production API contains six Node functions

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

On iPhone Safari: hard refresh, choose **Arrange**, tap near the center of a distinct object such as the guitar, confirm the actual photographed pixels isolate, drag/resize/rotate the cutout, test Reset, optionally run **Refine background with AI**, then Keep placement.

## Next implementation

Photo Arrange v2: persisted derived scenes/masks/transforms, binding to spatial IDs, camera/floor/wall calibration, depth/occlusion/perspective, stronger inpainting, reuse for Organize, then native iOS segmentation/RealityKit.

## Not yet claimed

Photo Arrange real-object selection/rearrangement in the authenticated production browser, object-specific segmentation quality, persisted scene edits, calibrated projection/occlusion/relighting, native iOS photo manipulation, or dedicated persisted blueprint PDF.

## Authoritative record impact

- `CURRENT-STATE.md`: updated for deployed Photo Arrange v1
- `PROJECT-CONSTITUTION.md`: unchanged
- `ARCHITECTURE.md`: unchanged
- `DESIGN-SYSTEM.md`: unchanged