# FormShift Current State

**Revision:** 0.6.6  
**Date:** 2026-08-20  
**Milestone:** Photo Arrange room zoom/object gesture separation validated as a moderate iPhone improvement; selection quality is now the primary Arrange bottleneck

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

## Photo Arrange v1.5.1 — viewport interaction validated as moderate improvement

Runtime baseline: `8ac6636e32ff02e54ed40892170e1e49fa301bd3`

Production evidence:
- exact branch preview `dpl_8wzFg5iEMjoW5LFoLkzrSdrMsjzG` — READY; Expo static export explicitly included `/arrange`
- production web deployment `dpl_3Ln2NAmQL5jhrFdRm5SuhL4PpY7m` — READY on the exact runtime baseline and serving the production alias
- branch regression check showed one commit / one changed runtime file: `apps/client/src/components/PhotoArrangeEditor.web.tsx`
- API source was unchanged; the Vercel API deployment for this client-only commit was canceled and the prior production API deployment remains READY

Validated on iPhone Safari:
- room pinch zoom works before object selection
- zoomed room framing makes small-object targeting materially easier than the previous full-canvas manipulation model
- room and selected-object gesture targets are now meaningfully separated
- the interaction is a **moderate improvement**, not yet production-quality

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

## Current quality bottleneck — selection refinement

The latest iPhone validation shows the dominant remaining Arrange defect is the segmentation mask, not basic touch routing. In a guitar test, the selected cutout can still include substantial adjacent/background pixels and produce a visibly oversized/incorrect lifted region. The local removed-object preview also remains visibly synthetic.

The next implementation target is **Photo Arrange v1.6 — Selection Refinement**:
- show a mask preview before the object is lifted
- support positive **Add** taps/brush strokes to include missing object regions
- support negative **Remove** taps/brush strokes to exclude wall, furniture, stand, straps, shadows, or other accidentally selected pixels
- provide an iPhone magnifier/loupe while refining small edges
- recompute the cutout and repair mask from the refined segmentation before lift
- preserve zoom/pan while refinement is active
- keep a one-tap **Use selection** path when the automatic mask is already acceptable
- compact the mobile control surface so selection/refinement controls do not horizontally overflow the photo workspace

This refinement step should be completed before deeper camera/depth/occlusion work, because perspective and scene intelligence cannot compensate for an incorrect source-object mask.

## Privacy and accuracy boundaries

- segmentation and mask cleanup run locally in the browser
- room zoom/pan is local transient viewport state
- AI repair sends the current source scene and selection mask only after the user explicitly chooses **Refine background with AI**
- the configured image-edit path is not claimed to be zero-data-retention
- derived scene files remain private household assets under project-scoped Storage policies
- pixel movement does not implicitly alter canonical physical dimensions, room geometry, or spatial measurement provenance
- perspective, depth, floor/wall contact, occlusion, relighting, and physical scale are still uncalibrated for free-form photographed-object movement

## Existing validated baseline

Prior validated phases retain private room-photo capture/storage, canonical geometry and immutable versions, Plan Arrange persistence, Organize Intelligence, Build Intelligence/atomic acceptance, Build-plan restoration, blueprint presentation, Photo Arrange v1 real-object selection/lift/move, and the v1.5.1 room zoom/object gesture separation.

Infrastructure:
- Supabase ref `oomtpnqprxykcjzrlfgc`; private bucket `formshift-private`; 26/26 public app tables RLS-enabled
- web `https://formshift-web.vercel.app`
- API `https://formshift-api.vercel.app`

## Next validation

After v1.6 implementation, validate on iPhone Safari with the guitar and at least one less isolated object:
1. zoom/pan to frame the object
2. tap to create an initial segmentation preview without lifting it
3. use Remove to exclude an adjacent/background region
4. use Add to recover any missed object region
5. confirm the preview mask visibly updates after each refinement
6. accept the refined selection and lift the object
7. verify the moved cutout contains substantially less adjacent/background imagery
8. continue to move/scale/rotate and save/reload the arrangement

## Next implementation after selection refinement

Photo Arrange v2 should then add scene intelligence: camera/floor/wall calibration, depth, perspective-aware physical scaling, contact constraints, occlusion, lighting/shadow treatment, photo-object to spatial-ID binding, reuse of the same visual pipeline for Organize, and native iOS segmentation/RealityKit where it materially improves fidelity.

## Not yet claimed

Production-quality segmentation or inpainting, production-quality iPhone object selection/refinement, successful real Storage persistence/reload from every authenticated browser edit path, calibrated projection/occlusion/relighting, native iOS photo manipulation, or dedicated persisted blueprint PDF.

## Authoritative record impact

- `CURRENT-STATE.md`: updated to record the moderate iPhone viewport improvement and prioritize Selection Refinement v1.6
- `DESIGN-SYSTEM.md`: unchanged in this release; its existing separate viewport/object gesture contract remains authoritative
- `ARCHITECTURE.md`: unchanged; no data-flow/platform/canonical-state architecture changed
- `PROJECT-CONSTITUTION.md`: unchanged
