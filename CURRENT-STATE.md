# FormShift Current State

**Revision:** 0.6.3  
**Date:** 2026-08-20  
**Milestone:** Photo Arrange v1 real-object selection/lift/move validated on iPhone Safari

FormShift is a **photo-first spatial augmentation product**. The real captured room image is the primary canvas; structured geometry remains the hidden authority. Plan/rectangle views are secondary technical verification surfaces.

## Photo Arrange v1

Runtime baseline: `6a57cde192c3c0e7468eb792e0a193b11dc4b2c9`

Production evidence:
- web deployment `dpl_5pwSnuUnfvZMcNSW6rNBnXXdqXMC` — READY on the exact runtime baseline
- exact preview deployment `dpl_7d3sqPaXGv66taZWsgNZDKsQL5ow` — READY and exported `/arrange`
- API runtime is unchanged by the client-only segmentation hotfix; the prior authenticated background-repair API remains active
- authenticated iPhone Safari validation confirmed a real photographed guitar can be tapped, segmented, lifted, and moved in the room photo

Validated interaction:
- normal tap reaches FormShift rather than Safari native image-selection UI
- MediaPipe interactive segmentation completes without the prior `t.map is not a function` error
- selected photographed pixels become a transparent movable cutout
- the cutout can be repositioned over the same room photo
- the original source photo remains recoverable through Reset

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
- native iOS currently falls back to Plan while the web/iPhone Safari path is developed

## Current quality gaps visible in validation

The interaction model is proven, but visual quality is still prototype-level:
- segmentation edges are rough and can include/exclude nearby pixels
- the local fill used at the object's former location is visibly synthetic
- moved objects do not yet adapt perspective, floor/wall contact, shadows, or lighting
- moved objects do not yet pass correctly behind foreground geometry or other room objects
- direct touch ergonomics still rely on separate resize/rotate controls rather than natural pinch/rotate gestures
- edits remain session-only and are not persisted as derived scene versions

## Privacy/accuracy boundaries

- selection is local
- AI repair sends scene + mask only after explicit action
- default image model is `openai/gpt-image-2`; this path is not zero-data-retention
- physical dimensions, depth, occlusion, relighting, and camera calibration are not inferred from pixel movement

## Existing validated baseline

Prior validated phases retain private room-photo capture/storage, canonical geometry and immutable versions, Plan Arrange persistence, Organize Intelligence, Build Intelligence/atomic acceptance, Build-plan restoration, and blueprint presentation.

Infrastructure:
- Supabase ref `oomtpnqprxykcjzrlfgc`; private bucket `formshift-private`; 25/25 public app tables RLS-enabled
- web `https://formshift-web.vercel.app`
- API `https://formshift-api.vercel.app`

## Next implementation

**Photo Arrange v1.5 — visual-quality pass** before deeper scene intelligence:
1. improve mask quality with iterative positive/negative refinement and edge feathering
2. replace the crude local hole fill with reliable background inpainting
3. add direct pinch-to-scale and two-finger rotation with better drag affordance
4. preserve the selected-object mask/cutout while the background repair runs asynchronously
5. persist derived scene edits so kept placements survive refresh

After v1.5: Photo Arrange v2 adds camera/floor/wall calibration, depth, occlusion, perspective-aware scale, contact shadows/relighting, spatial-ID binding, reuse for Organize, and native iOS segmentation/RealityKit.

## Not yet claimed

Production-quality segmentation/inpainting, persisted photo edits, calibrated projection/occlusion/relighting, native iOS photo manipulation, or dedicated persisted blueprint PDF.

## Authoritative record impact

- `CURRENT-STATE.md`: updated because authenticated real-object selection/lift/move is now interaction-validated on iPhone Safari
- `PROJECT-CONSTITUTION.md`: unchanged
- `ARCHITECTURE.md`: unchanged
- `DESIGN-SYSTEM.md`: unchanged