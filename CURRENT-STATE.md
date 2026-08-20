# FormShift Current State

**Revision:** 0.6.0  
**Date:** 2026-08-20  
**Milestone:** Photo Arrange v1 candidate validated in preview; production promotion pending

## Product direction

FormShift is a **photo-first spatial augmentation product**. The real captured room image is the primary user-facing canvas. Structured spatial geometry remains the hidden authority for dimensions, fit, collision, measurements, Build calculations, and blueprint output.

The plan/rectangle editor is a secondary technical verification surface. It must not become the primary product experience.

Mode intent:

- **Organize:** analyze the actual room image and show realistic before/after organization outcomes in that same room.
- **Arrange:** select real photographed objects, lift and reposition their actual pixels in the room scene; geometry supports scale/fit where calibrated.
- **Build:** render proposed objects into the room photograph first; blueprint, BOM, cost, effort, and plan geometry support the visual decision.

## Deployed validated baseline

Production baseline before Photo Arrange v1 promotion: `c3c9d7cb10842b0924085a3109cc2bb03285aac6`

Validated prior capabilities:

- responsive Expo web + iOS codebase
- Google authentication through Supabase plus private access gate
- private Supabase room-photo storage and RLS-protected project data
- captured room photos associated with projects/spaces
- canonical millimeter spatial model and immutable spatial versions
- measured/estimated room dimensions with provenance
- Arrange geometry persistence and deterministic movement rules
- Organize Intelligence with Luna primary / Terra fallback and deterministic proposal validation
- Build Intelligence for Class A freestanding open shelving/storage
- atomic accepted Build persistence across Build records, measurements, and spatial version lineage
- persisted Build-plan restoration after refresh
- retained front/side/top blueprint geometry, BOM, material allowance, and effort estimate
- photo-first Build workspace with Before / Augmented / Plan hierarchy
- deterministic saved Build augmentation renderer

## Photo Arrange v1 candidate

Candidate branch head: `08f33120be42173531741809a89cb32df47d870f`

Preview validation:

- web preview exported successfully with `/arrange` as a static protected route
- latest exact web preview was READY
- background-repair API compiled successfully at introducing commit `0ea66353d35cf94bbe12b0abbe0c1534efe3eb2e`; later candidate commits only changed client files

Implemented behavior:

- selecting **Arrange** routes to the photo-first `/arrange` workspace
- the room photo is the primary Arrange surface
- user taps a photographed object to request interactive segmentation
- MediaPipe Interactive Segmenter is loaded in-browser and the selection operation runs locally on the client
- selected object pixels are extracted into a transparent cutout
- the cutout can be dragged directly over the same photo
- user can adjust visual size and rotation
- the original object location receives an immediate local reconstruction preview
- **Refine background with AI** is an explicit action, not automatic
- the authenticated background-repair API validates project/space access before invoking the configured image model
- **Keep placement** composites the cutout into the derived preview scene
- **Reset** restores the immutable original room photo
- native iOS currently falls back to the measured Plan editor while the web/iPhone Safari interaction is validated

Privacy boundary:

- segmentation/object isolation is local to the browser
- the original room photo remains the immutable source
- AI background refinement is opt-in and sends a source scene plus selection mask to the configured image provider
- current default image model is `openai/gpt-image-2`; this provider path must not be described as zero-data-retention
- photo scene edits in this release are preview-only and are not yet persisted to Supabase

Accuracy boundary:

- moving existing photographed pixels is visually direct but does not establish physical dimensions
- scale/rotation changes are illustrative until the selected object is calibrated or tied to measured geometry
- occlusion, depth ordering, relighting, and camera calibration are not yet implemented

## Existing validated milestones

### Phase 1 — real room / geometry Arrange

Validated:

- photo capture/save
- room measurements
- real spatial objects
- direct Plan dragging
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
- Blueprint tab rehydration browser-confirmed

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

API:
- project: `formshift-api`
- production: `https://formshift-api.vercel.app`
- health endpoint previously verified HTTP 200

## Next validation target

After candidate promotion, authenticated browser validation of **Photo Arrange v1** on iPhone Safari:

1. hard refresh FormShift and choose **Arrange**
2. confirm `/arrange` opens with the real room photo as the main workspace
3. tap near the center of a distinct photographed object such as the guitar
4. confirm the object becomes an isolated cutout rather than a rectangle
5. drag the cutout to another visible location in the same room photo
6. test size and rotation controls
7. confirm **Reset** restores the untouched original photo
8. optionally choose **Refine background with AI** and verify the old location is reconstructed more naturally
9. choose **Keep placement** and verify the derived preview remains within the current session

## Next implementation after validation

**Photo Arrange v2 — persistent scene edits + calibration**

Priority capabilities:

1. persist derived scene versions, object masks, and transforms in Supabase
2. bind selected photo objects to spatial object IDs where known
3. floor/wall and camera calibration
4. depth/occlusion ordering so moved objects pass naturally behind/in front of room elements
5. stronger background inpainting and local edge refinement
6. perspective-aware scale constraints
7. reuse the same scene-editing contract for Organize before/after proposals
8. add native iOS segmentation/RealityKit implementation behind the same scene model

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
- project deletion/recovery end-to-end validation

## Authoritative record impact

- `CURRENT-STATE.md`: updated for the Photo Arrange v1 candidate and explicit AI background-repair privacy boundary
- `PROJECT-CONSTITUTION.md`: unchanged; photo-first hierarchy already requires this interaction model
- `ARCHITECTURE.md`: unchanged; existing photo-scene pipeline already covers segmentation, derived scenes, AI pixel repair, and geometry authority
- `DESIGN-SYSTEM.md`: unchanged; real scene already defined as the primary canvas