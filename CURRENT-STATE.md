# FormShift Current State

**Revision:** 0.5.0  
**Date:** 2026-08-20  
**Milestone:** Photo-first product correction; Build Augmentation v1 deployed and awaiting authenticated visual validation

## Product direction

FormShift is a **photo-first spatial augmentation product**. The real captured room image is the primary user-facing canvas. Structured spatial geometry remains the hidden authority for dimensions, fit, collision, measurements, Build calculations, and blueprint output.

The plan/rectangle editor is a secondary technical verification surface. It must not become the primary product experience.

Mode intent:

- **Organize:** analyze the actual room image and show realistic before/after organization outcomes in that same room.
- **Arrange:** manipulate visual objects in the real room scene while geometry preserves scale, position, collision, and measurement truth behind the scenes.
- **Build:** render the proposed real object into the room photograph first; blueprint, BOM, cost, effort, and plan geometry support the visual decision.

## Deployed implementation

FormShift currently includes:

- responsive Expo web + iOS codebase
- Google authentication through Supabase plus private access gate
- private Supabase room-photo storage and RLS-protected project data
- captured room photos associated with projects/spaces
- canonical millimeter spatial model and immutable spatial versions
- measured/estimated room dimensions with provenance
- Arrange object persistence and deterministic movement rules
- Organize Intelligence with Luna primary / Terra fallback and deterministic proposal validation
- Build Intelligence for Class A freestanding open shelving/storage
- atomic accepted Build persistence across Build records, measurements, and spatial version lineage
- persisted Build-plan restoration after refresh
- retained front/side/top blueprint geometry, BOM, material allowance, and effort estimate

## Photo-first Build Augmentation v1

Production code baseline: `8887c73e034c1f58623f58e421299ae5b21eb9e2`

Production Vercel deployment: `dpl_5esa95S3CC4DVUrG5ysX6Zuybz6T` — READY

Implemented behavior:

- `/build` now uses `PhotoBuildWorkspace` instead of the plan-first Build workspace
- the saved private room photo is the primary Build canvas
- primary scene selector: **Before / Augmented / Plan**
- **Before** shows the original room capture
- **Augmented** projects the validated shelving design into the source room photo
- the shelving render visually represents side panels, top/bottom, interior shelves, contact shadow, and width/height labels instead of a generic rectangle
- approximate photo projection uses the canonical room boundary, ceiling height, Build dimensions, and Build X/Z placement
- depth influences visual scale and perspective
- **Plan** retains the existing Skia measured-plan editor as the technical verification/fallback view
- new Build plans can still be repositioned through Plan without changing the deterministic Build engine
- accepted/saved Build plans remain reloadable from Supabase
- cut list, materials/cost, effort, blueprint, and atomic acceptance remain unchanged

Accuracy boundary:

- the photo augmentation is currently labeled **Estimated augmentation**
- spatial plan geometry remains authoritative for fit and dimensions
- v1 does not yet have calibrated camera intrinsics/extrinsics, floor-plane image calibration, segmentation masks, occlusion meshes, relighting, or AI inpainting
- therefore augmented pixels must not be interpreted as proof of exact photo projection

## Existing validated milestones

### Phase 1 — real room / Arrange

Validated:

- photo capture/save
- room measurements
- real spatial objects
- direct Arrange dragging
- immutable saved Arrange versions
- refresh persistence

### Phase 2 — Organize Intelligence

Validated:

- production AI generation
- Luna production routing
- deterministic validation
- editable proposal dragging

Still pending separate validation:

- edited Organize accept/persist lineage
- Terra fallback path

### Phase 3 — Build Intelligence

Production browser end-to-end validated:

- accepted Build request `641e4258-7b21-4b24-8a37-9f9ac36a7c84`
- accepted Build plan `5348faa8-0de9-4acd-a12f-4a03cac6ea20`
- committed Build spatial version `c71f44da-1722-4f62-a736-6a2409434a61`
- parent `2223a418-d84c-413f-a3b6-d30211ff602c`
- 48 × 72 × 16 in shelving with 3 interior shelves
- inherited room/object measurement evidence preserved
- 3 Build-derived measurements added
- existing Desk and Chest unchanged
- materials, planning cost range, effort estimate, and component rows persisted

### Phase 4 — Build workspace / Blueprint

Validated:

- `/build` protected production route
- retained blueprint views
- latest saved Build plan restored after refresh
- Blueprint tab rehydration browser-confirmed by user

## Infrastructure

### Supabase

- project: `FormShift`
- project ref: `oomtpnqprxykcjzrlfgc`
- private bucket: `formshift-private`
- 25/25 public application tables RLS-enabled
- Build acceptance RPC deployed and authorization-tested
- open-shelving 48 in unsupported-span database guard deployed

### Vercel

Web:
- project: `formshift-web`
- production: `https://formshift-web.vercel.app`
- `/build`: HTTP 200 smoke-verified after photo-first deployment

API:
- project: `formshift-api`
- production: `https://formshift-api.vercel.app`
- health endpoint previously verified HTTP 200

## Next validation target

Authenticated browser validation of Build Augmentation v1:

1. open `/build`
2. confirm the real saved room photograph is the main canvas
3. confirm **Before** shows the untouched source photo
4. confirm **Augmented** shows the saved/proposed shelving rendered in that photo rather than as a plan rectangle
5. confirm the shelving dimensions visually correspond to the saved Build plan
6. switch to **Plan** and confirm the measured plan still renders correctly
7. create/update a Build plan and confirm deterministic validation/acceptance still works
8. refresh and confirm the saved Build plan remains available in the photo-first workspace

## Next implementation after validation

**Augmented Scene v2 — calibrated photo placement**

Priority capabilities:

1. photo-space floor/wall calibration
2. camera perspective / vanishing-point estimation or explicit user calibration
3. stable mapping between canonical X/Z placement and image pixels
4. foreground/background segmentation and occlusion ordering
5. realistic object rendering/material appearance
6. contact shadow and basic relighting
7. persistent photo-scene calibration per capture
8. then reuse the same scene pipeline for Arrange objects and Organize before/after proposals

AI image editing/inpainting should be introduced only for pixels that structured rendering cannot reconstruct safely. It must never become the source of geometric truth.

## Not yet validated / not claimed

- authenticated visual validation of photo-first Build Augmentation v1
- calibrated camera projection
- photorealistic material rendering
- real object segmentation/masks
- background inpainting after moving existing objects
- foreground occlusion handling
- multi-photo scene reconstruction
- native iOS RoomPlan/LiDAR production validation
- native RealityKit augmented Build placement
- dedicated persisted blueprint PDF package
- project deletion/recovery end-to-end validation

## Authoritative record impact

- `CURRENT-STATE.md`: updated for the photo-first product correction and Build Augmentation v1 deployment
- `PROJECT-CONSTITUTION.md`: durable photo-first hierarchy requires an explicit revision after v1 behavior is visually confirmed
- `ARCHITECTURE.md`: visualization hierarchy / scene-projection architecture requires revision after v1 validation
- `DESIGN-SYSTEM.md`: primary canvas contract requires revision after v1 validation
