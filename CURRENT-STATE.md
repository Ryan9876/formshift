# FormShift Current State

**Revision:** 0.6.5  
**Date:** 2026-08-20  
**Milestone:** Photo Arrange room zoom/object gesture separation deployed; iPhone interaction validation pending

FormShift is a **photo-first spatial augmentation product**. The real captured room image is the primary canvas; structured geometry remains the hidden authority. Plan/rectangle views are secondary technical verification surfaces.

## Photo Arrange v1 — validated baseline

Authenticated iPhone Safari validation has confirmed the core interaction model:
- a normal tap reaches FormShift rather than Safari's native image-selection UI
- MediaPipe interactive segmentation completes successfully
- a real photographed object such as the guitar can be isolated as a transparent cutout
- the actual photographed pixels can be lifted and moved over the same room photo
- the immutable source room photo remains preserved in private FormShift storage

## Photo Arrange v1.5 — deployed

Persistence/visual-quality runtime baseline: `ccd5d98df77cfa61bc9c6bb12b6696663b053839`

Implemented:
- seeded connected-component mask cleanup, morphological closing, feathered cutout edges, and expanded repair masks
- improved immediate local removed-object preview
- one-finger object movement plus two-finger object scale/rotation
- explicit non-blocking AI background repair
- immutable persisted photo arrangements with private scene/mask/cutout/background assets and parent lineage
- opening Arrange restores the latest saved derived scene

Persistence/security evidence:
- Supabase migrations `photo_arrangements` and `photo_arrangements_privilege_hardening` applied successfully
- 26/26 public app tables have RLS enabled
- anonymous has no `photo_arrangements` table privileges; authenticated has SELECT + INSERT only
- authenticated owner-context insert passed in a rollback transaction; zero test arrangement rows remained afterward

## Photo Arrange v1.5.1 — viewport interaction deployed

Runtime baseline: `8ac6636e32ff02e54ed40892170e1e49fa301bd3`

Production evidence:
- exact branch preview `dpl_8wzFg5iEMjoW5LFoLkzrSdrMsjzG` — READY; Expo static export explicitly included `/arrange`
- production web deployment `dpl_3Ln2NAmQL5jhrFdRm5SuhL4PpY7m` — READY on the exact runtime baseline and serving the production alias
- branch regression check showed one commit / one changed runtime file: `apps/client/src/components/PhotoArrangeEditor.web.tsx`
- API source was unchanged; the Vercel API deployment for this client-only commit was canceled and the prior production API deployment remains READY

Implemented interaction contract:
- before selection, two-finger pinch zooms the room up to 5×
- when zoomed, one-finger drag pans the room
- object selection is triggered only on a completed short tap, not pointer/touch-down
- beginning a pan or pinch cancels a pending object-selection tap
- selection coordinates are mapped back through the room viewport transform so zoomed tapping targets the correct image pixel
- after selection, the selected object has its own bounded gesture hit area rather than a full-canvas manipulation layer
- gestures beginning on the object move/scale/rotate the object
- gestures beginning outside the object continue to pan/zoom the room
- **Fit photo** returns the room viewport to 1× without resetting the object transform or persisted scene
- room zoom/pan is view-only and is never written into object geometry or arrangement persistence
- existing v1.5 mask cleanup, AI repair, and save behavior are preserved

## Privacy and accuracy boundaries

- segmentation and mask cleanup run locally in the browser
- room zoom/pan is local transient viewport state
- AI repair sends the current source scene and selection mask only after the user explicitly chooses **Refine background with AI**
- the configured image-edit path is not claimed to be zero-data-retention
- derived scene files remain private household assets under project-scoped Storage policies
- pixel movement does not implicitly alter canonical physical dimensions, room geometry, or spatial measurement provenance
- perspective, depth, floor/wall contact, occlusion, relighting, and physical scale are still uncalibrated for free-form photographed-object movement

## Existing validated baseline

Prior validated phases retain private room-photo capture/storage, canonical geometry and immutable versions, Plan Arrange persistence, Organize Intelligence, Build Intelligence/atomic acceptance, Build-plan restoration, blueprint presentation, and Photo Arrange v1 real-object selection/lift/move.

Infrastructure:
- Supabase ref `oomtpnqprxykcjzrlfgc`; private bucket `formshift-private`; 26/26 public app tables RLS-enabled
- web `https://formshift-web.vercel.app`
- API `https://formshift-api.vercel.app`

## Next validation

On iPhone Safari:
1. hard refresh and open **Arrange**
2. before selecting an object, pinch the room photo to zoom in; confirm no object is selected or moved
3. at 2×–4× zoom, pan the room with one finger
4. tap a small object only after framing it; selection should occur on tap release
5. with an object selected, pinch/drag **outside** it and confirm the room view zooms/pans without changing the object's saved scale/position
6. drag directly **on** the selected object and confirm only the object moves
7. pinch/twist directly **on** the selected object and confirm it scales/rotates
8. tap **Fit photo** and confirm the room returns to full view without moving/resetting the selected object
9. continue the v1.5 persistence test: **Keep placement**, refresh, and confirm the edited scene restores

## Next implementation after interaction validation

Photo Arrange v2 should add scene intelligence rather than further flat 2D control layering: camera/floor/wall calibration, depth, perspective-aware physical scaling, contact constraints, occlusion, lighting/shadow treatment, photo-object to spatial-ID binding, reuse of the same visual pipeline for Organize, and native iOS segmentation/RealityKit where it materially improves fidelity.

## Not yet claimed

Production-quality segmentation or inpainting, successful iPhone validation of the new room zoom/object gesture separation, successful real Storage persistence/reload from an authenticated browser edit, calibrated projection/occlusion/relighting, native iOS photo manipulation, or dedicated persisted blueprint PDF.

## Authoritative record impact

- `CURRENT-STATE.md`: updated for the deployed viewport/object gesture release and pending iPhone validation
- `DESIGN-SYSTEM.md`: updated to make separate room-navigation/object-manipulation targets, tap-on-release selection, and Fit photo durable Arrange interaction requirements
- `ARCHITECTURE.md`: unchanged; no data-flow/platform/canonical-state architecture changed
- `PROJECT-CONSTITUTION.md`: unchanged
