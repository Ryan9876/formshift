# FormShift Current State

**Revision:** 0.6.0  
**Date:** 2026-08-20  
**Milestone:** Photo Arrange v1 candidate ready; production deployment and authenticated interaction validation pending

## Product direction

FormShift is a **photo-first spatial augmentation product**. The real captured room image is the primary user-facing canvas. Structured spatial geometry remains the hidden authority for dimensions, fit, collision, measurements, Build calculations, and blueprint output.

The plan/rectangle editor is a secondary technical verification surface. It must not become the primary product experience.

Mode intent:

- **Organize:** analyze the actual room image and show realistic before/after organization outcomes in that same room.
- **Arrange:** select real photographed objects, lift and reposition their actual pixels in the room scene; geometry supports scale/fit where calibrated.
- **Build:** render proposed objects into the room photograph first; blueprint, BOM, cost, effort, and plan geometry support the visual decision.

## Deployed validated baseline

Production baseline before Photo Arrange v1: `c3c9d7cb10842b0924085a3109cc2bb03285aac6`

Validated prior capabilities include private room-photo capture/storage, canonical geometry and immutable versions, Plan-based Arrange persistence, Organize Intelligence, Build Intelligence with atomic acceptance, saved Build-plan restoration, blueprint presentation, and photo-first Build visualization.

## Photo Arrange v1 candidate

Validated runtime candidate: `08f33120be42173531741809a89cb32df47d870f`

Preview validation:

- web preview exported successfully with `/arrange` as a static protected route
- exact runtime candidate web preview was READY
- background-repair API compiled successfully at introducing commit `0ea66353d35cf94bbe12b0abbe0c1534efe3eb2e`; later runtime candidate commits only changed client files

Implemented behavior:

- selecting **Arrange** routes to the photo-first `/arrange` workspace
- the room photo is the primary Arrange surface
- user taps a photographed object to request interactive segmentation
- MediaPipe Interactive Segmenter is loaded in-browser and selection runs locally on the client
- selected object pixels are extracted into a transparent cutout
- the cutout can be dragged directly over the same photo
- visual size and rotation can be adjusted
- the original object location receives an immediate local reconstruction preview
- **Refine background with AI** is explicit and opt-in, not automatic
- the authenticated background-repair API validates project/space access before invoking the configured image model
- **Keep placement** composites the cutout into a derived preview scene
- **Reset** restores the immutable original room photo
- native iOS currently falls back to the measured Plan editor while the web/iPhone Safari interaction is validated

Privacy boundary:

- segmentation/object isolation is local to the browser
- the original room photo remains immutable
- AI background refinement sends the source scene and selection mask only after an explicit user action
- current default image model is `openai/gpt-image-2`; this provider path is not zero-data-retention
- photo scene edits in this release are preview-only and are not yet persisted to Supabase

Accuracy boundary:

- moving existing photographed pixels is visually direct but does not establish physical dimensions
- scale/rotation changes are illustrative until the selected object is calibrated or tied to measured geometry
- occlusion, depth ordering, relighting, and camera calibration are not yet implemented

## Existing validated milestones

### Phase 1 — real room / geometry Arrange
Validated: photo capture/save, room measurements, real spatial objects, direct Plan dragging, immutable saved Arrange versions, refresh persistence.

### Phase 2 — Organize Intelligence
Validated: production AI generation, Luna routing, deterministic validation, editable proposal dragging. Edited Organize accept/persist lineage and Terra fallback remain pending separate validation.

### Phase 3 — Build Intelligence
Production browser E2E validated, including accepted Build request/plan, immutable Build spatial version lineage, preserved measurement evidence, unchanged prior room objects, and persisted components/materials/cost/effort.

### Phase 4 — Build workspace / Blueprint
Validated: protected `/build` route, retained blueprint views, saved Build-plan restoration, and Blueprint-tab rehydration.

## Infrastructure

### Supabase
- project ref: `oomtpnqprxykcjzrlfgc`
- private bucket: `formshift-private`
- 25/25 public application tables RLS-enabled
- Build acceptance RPC authorization-tested
- open-shelving 48 in unsupported-span database guard deployed

### Vercel
- web production: `https://formshift-web.vercel.app`
- API production: `https://formshift-api.vercel.app`

## Next validation target

After production deployment, validate **Photo Arrange v1** on iPhone Safari:

1. hard refresh FormShift and choose **Arrange**
2. confirm `/arrange` opens with the real room photo as the main workspace
3. tap near the center of a distinct photographed object such as the guitar
4. confirm the object becomes an isolated cutout rather than a rectangle
5. drag the cutout to another visible location in the same room photo
6. test size and rotation
7. confirm **Reset** restores the untouched source
8. optionally choose **Refine background with AI** and verify the old location is reconstructed more naturally
9. choose **Keep placement** and verify the derived preview remains within the current session

## Next implementation after validation

**Photo Arrange v2 — persistent scene edits + calibration**

Priority: persist scene versions/masks/transforms; bind photo objects to spatial IDs; calibrate floor/walls/camera; add depth/occlusion and perspective constraints; improve inpainting; reuse the scene contract for Organize; then implement native iOS segmentation/RealityKit.

## Not yet validated / not claimed

- Photo Arrange v1 production interaction
- guitar or other specific-object segmentation quality in the saved room photo
- persistent photo scene edits across refresh
- calibrated camera projection
- photorealistic relighting
- foreground occlusion handling
- multi-photo scene reconstruction
- native iOS photo-object manipulation
- native iOS RoomPlan/LiDAR production validation
- dedicated persisted blueprint PDF package
- project deletion/recovery E2E validation

## Authoritative record impact

- `CURRENT-STATE.md`: updated for Photo Arrange v1 and the explicit AI background-repair privacy boundary
- `PROJECT-CONSTITUTION.md`: unchanged; photo-first hierarchy already requires this interaction model
- `ARCHITECTURE.md`: unchanged; existing photo-scene pipeline already covers segmentation, derived scenes, AI pixel repair, and geometry authority
- `DESIGN-SYSTEM.md`: unchanged; real scene already defined as the primary canvas