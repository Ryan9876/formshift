# FormShift Current State

**Revision:** 0.6.0  
**Date:** 2026-08-20  
**Milestone:** Photo Arrange v1 candidate ready; production deployment and authenticated interaction validation pending

## Product direction

FormShift is a **photo-first spatial augmentation product**. The real captured room image is the primary user-facing canvas. Structured spatial geometry remains the hidden authority for dimensions, fit, collision, measurements, Build calculations, and blueprint output. Plan/rectangle views are secondary technical verification surfaces.

- **Organize:** analyze the real room image and show realistic before/after organization outcomes.
- **Arrange:** select real photographed objects, lift their pixels, and reposition them in the photo; geometry supports scale/fit where calibrated.
- **Build:** show proposed objects in the room photograph first; blueprint/BOM/cost/effort/plan geometry support that visual decision.

## Production baseline before this candidate

`c3c9d7cb10842b0924085a3109cc2bb03285aac6`

Prior validated capabilities include private room-photo capture/storage, canonical geometry and immutable versions, Plan-based Arrange persistence, Organize Intelligence, Build Intelligence with atomic acceptance, saved Build-plan restoration, blueprint presentation, and photo-first Build visualization.

## Photo Arrange v1 candidate

Validated runtime candidate: `08f33120be42173531741809a89cb32df47d870f`

Preview validation:

- web preview exported successfully with protected `/arrange`
- exact runtime candidate web preview reached READY
- background-repair API compiled successfully at `0ea66353d35cf94bbe12b0abbe0c1534efe3eb2e`; subsequent runtime changes were client-only

Implemented:

- **Arrange** routes to `/arrange`
- real room photo is the primary Arrange surface
- tap-to-select interactive segmentation runs locally in the browser
- selected photographed pixels become a transparent cutout
- cutout can be dragged, resized, and rotated over the same photo
- original location receives an immediate local reconstruction preview
- **Refine background with AI** is explicit/opt-in
- repair API requires authenticated editable project/space access
- **Keep placement** composites a derived session preview
- **Reset** restores the immutable source photo
- native iOS currently falls back to measured Plan while web/iPhone Safari is validated

Privacy boundary:

- selection/segmentation is local to the browser
- original photo remains immutable
- AI repair sends source scene + mask only after explicit user action
- default image model is `openai/gpt-image-2`; this provider path is not zero-data-retention
- Photo Arrange edits are preview-only and not yet persisted

Accuracy boundary:

- moved photographed pixels do not establish physical dimensions
- resize/rotation are illustrative until calibrated/measured
- depth ordering, occlusion, relighting, and camera calibration are not yet implemented

## Existing validated milestones

- **Phase 1:** photo capture/save, room measurements, spatial objects, Plan dragging, immutable Arrange versions, refresh persistence.
- **Phase 2:** Organize production generation, Luna routing, deterministic validation, editable proposal dragging. Edited accept lineage and Terra fallback remain pending.
- **Phase 3:** Build browser E2E validated with immutable lineage, measurement evidence, unchanged prior objects, and persisted components/materials/cost/effort.
- **Phase 4:** protected `/build`, retained blueprints, saved Build-plan restoration, Blueprint rehydration.

## Infrastructure

- Supabase project ref: `oomtpnqprxykcjzrlfgc`
- private bucket: `formshift-private`
- 25/25 public application tables RLS-enabled
- web: `https://formshift-web.vercel.app`
- API: `https://formshift-api.vercel.app`

## Next validation target

After production deployment on iPhone Safari:

1. hard refresh and choose **Arrange**
2. confirm the real room photo opens at `/arrange`
3. tap near the center of a distinct object such as the guitar
4. confirm the actual object pixels become an isolated cutout
5. drag it elsewhere in the same photo
6. test size and rotation
7. test **Reset**
8. optionally run **Refine background with AI**
9. **Keep placement** and confirm the derived scene remains during the session

## Next implementation after validation

**Photo Arrange v2:** persist derived scenes/masks/transforms; bind selections to spatial IDs; calibrate floor/walls/camera; add depth/occlusion/perspective constraints; strengthen inpainting; reuse the scene pipeline for Organize; then implement native iOS segmentation/RealityKit.

## Not yet validated / not claimed

- Photo Arrange v1 production interaction
- segmentation quality for the user's saved room objects
- scene-edit persistence across refresh
- calibrated projection, occlusion, or photorealistic relighting
- native iOS photo-object manipulation / RoomPlan production validation
- dedicated persisted blueprint PDF package
- project deletion/recovery E2E validation

## Authoritative record impact

- `CURRENT-STATE.md`: updated for Photo Arrange v1 and explicit AI-repair privacy boundary
- `PROJECT-CONSTITUTION.md`: unchanged
- `ARCHITECTURE.md`: unchanged
- `DESIGN-SYSTEM.md`: unchanged