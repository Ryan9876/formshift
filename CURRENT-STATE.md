# FormShift Current State

**Revision:** 0.5.0  
**Date:** 2026-08-20  
**Milestone:** Photo-first product correction complete; Build Augmentation v1 deployed and awaiting authenticated visual validation

## Product direction

FormShift is a **photo-first spatial augmentation product**. The real captured room image is the primary user-facing canvas. Structured spatial geometry remains the hidden authority for dimensions, fit, collision, measurements, Build calculations, and blueprint output.

The Plan/rectangle editor is a secondary technical verification surface. It must not become the primary product experience.

Mode intent:

- **Organize:** analyze the actual room image and show realistic before/after organization outcomes in that same room.
- **Arrange:** manipulate visible objects in the real room scene while geometry preserves scale, position, collision, and measurement truth behind the scenes.
- **Build:** render the proposed real object into the room photograph first; blueprint, BOM, cost, effort, and plan geometry support the visual decision.

## Current deployed implementation

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
- atomic accepted Build persistence across Build records, measurements, and spatial-version lineage
- persisted Build-plan restoration after refresh
- retained front/side/top blueprint geometry, BOM, material allowance, and effort estimate
- photo-first Build workspace with Before / Augmented / Plan scene views

## Photo-first Build Augmentation v1

Runtime code baseline: `8887c73e034c1f58623f58e421299ae5b21eb9e2`

Production Vercel deployment: `dpl_5esa95S3CC4DVUrG5ysX6Zuybz6T` — READY

Implemented behavior:

- `/build` uses `PhotoBuildWorkspace` instead of the plan-first Build workspace
- the saved private room photo is the primary Build canvas
- scene selector: **Before / Augmented / Plan**
- **Before** shows the original room capture
- **Augmented** projects the validated shelving design into the source room photo
- shelving is rendered as a visible furnishing with side panels, top/bottom, interior shelves, contact shadow, and dimensions rather than a generic rectangle
- approximate photo projection uses canonical room boundary, ceiling height, Build dimensions, and Build X/Z placement
- depth influences visual scale and perspective
- **Plan** retains the existing Skia measured-plan editor as a secondary technical verification/fallback view
- new Build plans can still be repositioned through Plan without changing the deterministic Build engine
- accepted/saved Build plans remain reloadable from Supabase
- cut list, materials/cost, effort, blueprint, and atomic acceptance remain unchanged

Accuracy boundary:

- the current photo overlay is explicitly **Estimated augmentation**
- spatial Plan geometry remains authoritative for fit and dimensions
- v1 does not yet have calibrated camera intrinsics/extrinsics, floor-plane image calibration, segmentation masks, occlusion meshes, relighting, or AI inpainting
- augmented pixels therefore are not proof of exact image projection

## Previously validated milestones

### Phase 1 — real room / Arrange

Validated:

- room photo capture/save
- room measurements
- real spatial objects
- direct Arrange dragging
- immutable saved Arrange versions
- refresh persistence

### Phase 2 — Organize Intelligence

Validated:

- production AI generation
- Luna production routing
- deterministic proposal validation
- editable proposal dragging

Still pending separate validation:

- edited Organize accept/persist lineage
- Terra fallback path

### Phase 3 — Build Intelligence

Production browser end-to-end validated:

- accepted Build request: `641e4258-7b21-4b24-8a37-9f9ac36a7c84`
- accepted Build plan: `5348faa8-0de9-4acd-a12f-4a03cac6ea20`
- committed Build spatial version: `c71f44da-1722-4f62-a736-6a2409434a61`
- parent version: `2223a418-d84c-413f-a3b6-d30211ff602c`
- saved design: 48 × 72 × 16 in with 3 interior shelves
- inherited room/object measurement evidence preserved
- 3 Build-derived measurements added
- existing Desk and Chest unchanged
- materials, cost range, effort estimate, and component rows persisted

### Phase 4 — Build workspace / Blueprint

Validated:

- protected `/build` production route
- retained blueprint views
- latest saved Build plan restored after refresh
- Blueprint rehydration browser-confirmed by user

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

## Authoritative records

All four authoritative records are now aligned to the 0.5.0 photo-first correction:

- `PROJECT-CONSTITUTION.md` — updated: real photo/scene is the fixed primary experience; Plan is secondary; geometry remains authoritative
- `ARCHITECTURE.md` — updated: scene-calibration/projection/occlusion pipeline and photo-first mode architecture are durable architecture
- `DESIGN-SYSTEM.md` — updated: photo canvas hierarchy, Before/Augmented/Plan states, confidence labels, and photo-first mode interaction rules are authoritative
- `CURRENT-STATE.md` — updated: deployed Build Augmentation v1 and remaining validation limits

Prior versions remain available in Git history.

## Next validation target

Authenticated browser validation of Build Augmentation v1:

1. open `/build`
2. confirm the real saved room photograph is the main canvas
3. confirm **Before** shows the untouched source photo
4. confirm **Augmented** shows the saved/proposed shelving rendered in that photo rather than as a plan rectangle
5. confirm displayed dimensions correspond to the saved Build plan
6. switch to **Plan** and confirm the measured plan still renders correctly
7. create/update a Build plan and confirm deterministic validation/acceptance still works
8. refresh and confirm the saved Build plan remains available in the photo-first workspace

## Next implementation after validation

**Augmented Scene v2 — calibrated photo placement**

Priority capabilities:

1. persistent photo-scene calibration record
2. floor/wall plane calibration in image space
3. camera perspective / vanishing-point estimation or explicit user calibration
4. stable canonical X/Z → image-pixel projection
5. foreground/background segmentation and occlusion ordering
6. geometry-faithful object rendering/material appearance
7. contact shadow and basic relighting
8. reuse the same scene pipeline for Arrange and Organize
9. AI image editing/inpainting only where structured rendering cannot reconstruct source pixels safely

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

## Release state

- **Photo-first product rule:** authoritative and recorded
- **Build Augmentation v1 generated:** yes
- **Build Augmentation v1 web build validated:** yes
- **Build Augmentation v1 deployed:** yes
- **Production `/build` smoke-verified:** yes
- **Authenticated visual behavior verified:** not yet
- **Calibrated augmentation:** not yet
- **Full product deployment-verified:** no
