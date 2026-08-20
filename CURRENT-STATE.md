# FormShift Current State

**Revision:** 0.6.9  
**Date:** 2026-08-20  
**Milestone:** Photo Arrange v1.7.1 iPhone Safari refinement polish deployed; real-device validation pending

FormShift is a **photo-first spatial augmentation product**. The real captured room image is the primary canvas; structured geometry remains the hidden authority. Plan/rectangle views are secondary technical verification surfaces.

## Validated Photo Arrange baseline

Authenticated iPhone Safari validation has established that:
- a normal tap reaches FormShift rather than Safari's native image-selection UI
- MediaPipe interactive segmentation completes successfully
- a real photographed object such as the guitar can be isolated, lifted, and moved using its photographed pixels
- room pinch-zoom and pan materially improve small-object targeting
- room-navigation gestures and selected-object manipulation are meaningfully separated
- the interaction is a **moderate improvement**, not yet production-quality
- the immutable source room photo remains preserved in private FormShift storage

## Photo Arrange v1.5 — persistence and manipulation

Runtime baseline: `ccd5d98df77cfa61bc9c6bb12b6696663b053839`

Implemented and retained:
- seeded mask cleanup and feathered cutout edges
- local removed-object preview plus explicit asynchronous AI background repair
- one-finger object movement and two-finger scale/rotation
- immutable persisted photo arrangements with private scene/mask/cutout/background assets and parent lineage
- latest saved derived scene restores when Arrange reopens

Persistence/security evidence:
- Supabase `photo_arrangements` migrations applied
- 26/26 public app tables have RLS enabled
- anonymous has no `photo_arrangements` table privileges; authenticated has SELECT + INSERT only
- authenticated owner-context insert passed inside a rollback transaction; zero test rows remained

## Photo Arrange v1.5.1 — viewport interaction validated

Runtime baseline: `8ac6636e32ff02e54ed40892170e1e49fa301bd3`

Validated on iPhone Safari:
- two-finger pinch zooms the room before selection
- one-finger drag pans when zoomed
- selection occurs only after a completed short tap
- pinch/pan cancels a pending selection tap
- zoomed taps map to the correct image coordinates
- selected objects use bounded gesture hit areas rather than owning the full canvas
- gestures on the object manipulate it; gestures outside navigate the room
- **Fit photo** resets only viewport framing

The user classified this as a moderate improvement and identified segmentation-mask quality as the dominant remaining defect.

## Photo Arrange v1.6 — preview/refine-before-lift

Runtime baseline: `2dfc89dea13f2e1d943a24acfe9f7d0c94612f8d`

Established the durable interaction contract:
- first object tap creates a candidate blue segmentation preview over the unchanged photo
- Add/Remove corrections refine the candidate locally
- **Use selection** is required before photographed pixels are lifted
- **Cancel** discards the candidate without modifying the scene
- zoom/pan remains available during refinement
- a loupe supports small-edge work
- after lift, move/scale/rotate, AI repair, Keep placement, and persistence remain available

## Photo Arrange v1.7 — continuous selection refinement

Functional runtime baseline: `05c74a3b2e1f82357586d1490217723a10f708e7`

Implemented:
- continuous one-finger **Add** and **Remove** strokes
- live blue/red stroke feedback
- simplified/capped completed strokes before mask recomputation
- explicit **Pan** mode for one-finger room navigation while a candidate exists
- two-finger room zoom remains available in Add, Remove, and Pan and cancels an active paint stroke
- refinement **Undo / Redo** while preserving the original selection seed
- loupe follows the refinement finger
- v1.7 remains a parallel web editor so rollback to v1.6 is low-risk
- persisted placement metadata identifies renderer version `photo-arrange-1.7`

Production evidence:
- preview `dpl_8xDyxGekiCYHcNgqHPncFt1Yg6Dk` READY
- production `dpl_9S9Qa2KDabKZsSQHLUP8ZPBzXBha` READY on the exact runtime baseline
- `/arrange` HTTP 200 smoke-verified
- API/database schema unchanged

## Photo Arrange v1.7.1 — Safari refinement polish deployed

Functional runtime baseline: `02c33c2bbc187289b4d799f1b255b068c0457ab6`

User evidence leading to this patch:
- iPhone Safari screenshot at approximately 3.7× zoom showed the refinement loupe obscuring a large portion of the guitar
- the bottom refinement actions were difficult to reach because Safari browser chrome covered the lower workflow
- a blue refinement-looking artifact could remain visible around the candidate, indicating pointer-interruption/live-stroke cleanup needed hardening
- the candidate mask itself can still contain unwanted background around the guitar

Implemented in v1.7.1:
- web-only `PhotoArrangeEditorV171` wrapper keeps v1.7 intact for rollback
- refinement loupe is reduced from the large in-scene treatment to a compact 64 px fixed loupe positioned away from the active touch region
- extra `env(safe-area-inset-bottom)` aware spacing keeps the refinement/action area scrollable above iPhone Safari bottom chrome
- window blur and document visibility changes cancel the active pointer interaction to reduce stuck live-stroke artifacts after Safari interrupts pointer capture
- workspace now resolves to v1.7.1 on web; non-web/native falls back to the established v1.7-compatible editor
- no persistence, API, AI, or database-schema changes were required

Deployment evidence:
- isolated branch `photo-arrange-v171-bugfix` was based on the then-current main baseline
- exact preview `dpl_EmsihoWt2DLaBDv5totK9GdXCWAh` — READY on `02c33c2bbc187289b4d799f1b255b068c0457ab6`
- branch comparison showed two intended files only: `PhotoArrangeEditorV171.web.tsx` plus the workspace switch
- production deployment `dpl_2XPJFH2dst4umSzEgQvaTfqAgPuF` — READY on the exact runtime baseline and serving `formshift-web.vercel.app`
- live production `/arrange` — HTTP 200 smoke-verified after deployment

### Important remaining limitation

v1.7.1 **does not change MediaPipe's underlying segmentation quality or add a new connected-component/island-removal algorithm after user painting**. If unrelated blue candidate regions remain after a completed stroke, that is still a mask/model/post-processing problem and should be addressed directly rather than hidden with more UI polish.

## Privacy and accuracy boundaries

- initial segmentation, candidate preview, Add/Remove refinement, Undo/Redo, and current mask cleanup run locally in the browser
- candidate creation/refinement does not overwrite the source room photo
- AI repair remains an explicit action and sends the current scene plus accepted refined mask to the configured image provider
- the configured image-edit path is not claimed to be zero-data-retention
- derived scene files remain private household assets under project-scoped Storage policies
- pixel movement does not implicitly alter canonical physical dimensions, room geometry, or measurement provenance
- perspective, depth, floor/wall contact, occlusion, relighting, and physical scale remain uncalibrated for free-form photographed-object movement

## Existing validated product baseline

Prior validated phases retain private room-photo capture/storage, canonical geometry and immutable spatial versions, Plan Arrange persistence, Organize Intelligence, Build Intelligence/atomic acceptance, Build-plan restoration, blueprint presentation, and the validated Photo Arrange real-object interaction/viewport baseline.

Infrastructure:
- Supabase ref `oomtpnqprxykcjzrlfgc`; private bucket `formshift-private`; 26/26 public app tables RLS-enabled
- web `https://formshift-web.vercel.app`
- API `https://formshift-api.vercel.app`

## Next validation

On iPhone Safari:
1. hard refresh and open **Arrange**
2. zoom to the guitar and create a candidate selection
3. verify the loupe is small and positioned away from the finger/object rather than covering the guitar
4. paint a short Add or Remove stroke and release; verify the temporary live stroke clears reliably
5. briefly switch Safari/app focus and return; verify a stale paint stroke does not remain active
6. scroll to the refinement tray and confirm **Use selection** / **Cancel** remain reachable above Safari bottom chrome
7. inspect whether unrelated blue candidate regions still remain after normal refinement
8. if mask fragments remain, treat that as segmentation/post-processing evidence for the next release

## Next implementation decision

If v1.7.1 resolves the interaction bugs but the candidate still contains disconnected or excessive background, the next release should improve **mask post-processing / segmentation quality** before scene intelligence. Candidate cleanup should preserve user-added regions intentionally while removing small accidental islands and improving edge adherence.

If the mask becomes practically clean enough, move into **Photo Arrange v2 scene intelligence**: camera/floor/wall calibration, depth assistance, perspective-aware physical scaling, contact constraints, occlusion, contact shadow/lighting treatment, photo-object-to-spatial-ID binding, and reuse in Organize and Build.

## Not yet claimed

Production-quality segmentation or inpainting, successful real-iPhone validation of v1.7.1 Safari polish, automatic removal of all detached candidate fragments, calibrated perspective/occlusion/relighting, native iOS continuous photo manipulation, or dedicated persisted blueprint PDF.

## Authoritative record impact

- `CURRENT-STATE.md`: updated for the deployed Photo Arrange v1.7.1 Safari polish patch and pending iPhone validation
- `DESIGN-SYSTEM.md`: unchanged; v1.7.1 implements the existing mobile-refinement and safe interaction requirements without changing the durable design contract
- `ARCHITECTURE.md`: unchanged; no canonical data-flow, persistence, platform-boundary, or service change
- `PROJECT-CONSTITUTION.md`: unchanged; the existing photo-first product rule continues to govern this release
