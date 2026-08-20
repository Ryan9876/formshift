# FormShift Current State

**Revision:** 0.6.8  
**Date:** 2026-08-20  
**Milestone:** Photo Arrange v1.7 continuous selection refinement deployed; iPhone stroke/refinement validation pending

FormShift is a **photo-first spatial augmentation product**. The real captured room image is the primary canvas; structured geometry remains the hidden authority. Plan/rectangle views are secondary technical verification surfaces.

## Validated Photo Arrange baseline

Authenticated iPhone Safari validation has established that:
- a normal tap reaches FormShift rather than Safari's native image-selection UI
- MediaPipe interactive segmentation completes successfully
- a real photographed object such as the guitar can be isolated, lifted, and moved using its photographed pixels
- room pinch-zoom and pan make small-object targeting materially easier
- room-navigation gestures and selected-object manipulation are meaningfully separated
- the viewport interaction is a **moderate improvement**, not yet production-quality
- the immutable source room photo remains preserved in private FormShift storage

## Photo Arrange v1.5 — persistence and manipulation baseline

Runtime baseline: `ccd5d98df77cfa61bc9c6bb12b6696663b053839`

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

## Photo Arrange v1.5.1 — viewport interaction validated

Runtime baseline: `8ac6636e32ff02e54ed40892170e1e49fa301bd3`

Validated behavior:
- two-finger pinch zooms the room before selection
- one-finger drag pans when zoomed
- selection occurs only on a completed short tap
- pinch/pan cancels a pending selection tap
- zoomed taps map back to the correct image coordinates
- selected objects have bounded gesture hit areas rather than owning the full canvas
- gestures on the object manipulate it; gestures outside navigate the room
- **Fit photo** resets only viewport framing

The user's iPhone test classified this as a moderate improvement and exposed segmentation-mask quality as the dominant remaining defect.

## Photo Arrange v1.6 — candidate selection refinement baseline

Runtime baseline: `2dfc89dea13f2e1d943a24acfe9f7d0c94612f8d`

Implemented:
- first object tap creates a candidate segmentation preview over the unchanged room image instead of immediately lifting the object
- the candidate is shown with a translucent FormShift-blue mask
- **Add** and **Remove** collect positive/negative refinement corrections locally
- MediaPipe is rerun with accumulated corrections and deterministic local brush edits supplement the model output
- each successful refinement recomputes the visible preview, cutout, and background-repair mask
- **Use selection** explicitly accepts the refined candidate and then starts lift/background handling
- **Cancel** discards the candidate without modifying the current scene
- zoom/pan remains available while refining
- a touch loupe supports small-edge work on a phone
- mobile controls use a compact wrapping tray
- after lift, established move/scale/rotate, AI repair, Keep placement, and persistence remain available

v1.6 used discrete Add/Remove refinement points. It established the preview/refine-before-lift contract but continuous refinement had not yet been implemented.

## Photo Arrange v1.7 — continuous selection refinement deployed

Functional runtime baseline: `05c74a3b2e1f82357586d1490217723a10f708e7`

Production evidence:
- isolated branch `photo-arrange-continuous-refinement-v17` was created from the v1.6 authoritative baseline
- exact branch preview `dpl_8xDyxGekiCYHcNgqHPncFt1Yg6Dk` — READY on the runtime baseline
- Vercel build completed successfully; Expo static export explicitly included `/arrange` among five exported routes
- branch comparison showed a clean three-commit fast-forward with only `PhotoArrangeEditorV17.tsx`, `PhotoArrangeEditorV17.web.tsx`, and `PhotoArrangeWorkspace.tsx` changed/added
- `main` was fast-forwarded to the exact preview-validated runtime baseline
- production web deployment `dpl_9S9Qa2KDabKZsSQHLUP8ZPBzXBha` — READY on the runtime baseline and serving `formshift-web.vercel.app`
- live production `/arrange` — HTTP 200 smoke-verified
- API and database schema were unchanged in v1.7; existing repair/persistence contracts are reused

Implemented refinement behavior:
- **Add** and **Remove** now accept continuous one-finger painted strokes rather than requiring repeated point taps
- the active stroke is shown immediately in blue/red while the finger moves
- completed strokes are simplified/capped before mask recomputation to constrain browser work
- MediaPipe receives semantic refinement strokes and deterministic local brush painting reinforces the requested correction
- the loupe follows the active refinement finger
- an explicit **Pan** mode enables one-finger room navigation while a candidate exists
- two-finger pinch-to-zoom remains available in Add, Remove, and Pan modes and cancels an active stroke rather than painting through a pinch
- completed refinement strokes support **Undo** and **Redo** while preserving the initial object-selection seed
- **Use selection** continues to be the only transition that lifts pixels or starts old-location repair
- v1.7 uses a parallel web editor component with the v1.6 editor retained in the repository, making rollback low-risk
- non-web/native resolution currently falls back to the existing Photo Arrange editor; v1.7 continuous refinement is specifically the web/iPhone-Safari path being validated
- persisted placement metadata identifies renderer version `photo-arrange-1.7`

## Privacy and accuracy boundaries

- initial segmentation, mask cleanup, candidate preview, continuous Add/Remove strokes, and Undo/Redo run locally in the browser
- the source/derived room scene is not altered merely by creating or refining a candidate selection
- AI repair sends the current source scene and accepted refined mask only after the user explicitly chooses **AI repair**
- the configured image-edit path is not claimed to be zero-data-retention
- derived scene files remain private household assets under project-scoped Storage policies
- pixel movement does not implicitly alter canonical physical dimensions, room geometry, or measurement provenance
- perspective, depth, floor/wall contact, occlusion, relighting, and physical scale are still uncalibrated for free-form photographed-object movement

## Existing validated product baseline

Prior validated phases retain private room-photo capture/storage, canonical geometry and immutable spatial versions, Plan Arrange persistence, Organize Intelligence, Build Intelligence/atomic acceptance, Build-plan restoration, blueprint presentation, and the validated Photo Arrange real-object interaction/viewport baseline.

Infrastructure:
- Supabase ref `oomtpnqprxykcjzrlfgc`; private bucket `formshift-private`; 26/26 public app tables RLS-enabled
- web `https://formshift-web.vercel.app`
- API `https://formshift-api.vercel.app`

## Next validation

On iPhone Safari:
1. hard refresh and open **Arrange**
2. zoom/pan to frame the guitar or another distinct object and tap once to create the candidate mask
3. choose **Remove** and drag a continuous stroke across obvious background incorrectly included in the candidate
4. confirm the red live stroke follows the finger and the blue candidate mask updates after the stroke completes
5. choose **Undo**, then **Redo**, and confirm the candidate visibly moves backward/forward through that correction
6. choose **Add** and paint across a missed part of the object; confirm the loupe follows the finger and the candidate expands after completion
7. switch to **Pan** and use one finger to reposition the zoomed room without modifying the mask
8. from Add or Remove, use two fingers to pinch; confirm the room zooms without creating a refinement stroke
9. choose **Use selection** and verify the lifted object follows the refined mask
10. move/scale/rotate, optionally run AI repair, choose Keep placement, refresh, and confirm existing persistence still works

## Decision after v1.7 validation

If continuous refinement makes a materially cleaner guitar/complex-object cutout without becoming tedious, stop adding flat mask controls and move into **Photo Arrange v2 scene intelligence**: camera/floor/wall calibration, depth assistance, perspective-aware physical scaling, contact constraints, occlusion, contact shadow/lighting treatment, photo-object to spatial-ID binding, and reuse of the same scene pipeline in Organize and Build.

If mask quality remains poor even with practical continuous refinement, the next investment should be a stronger segmentation/refinement model rather than deeper scene intelligence. Depth and perspective cannot compensate for a bad source mask.

## Not yet claimed

Production-quality segmentation or inpainting, successful real-iPhone validation of v1.7 continuous Add/Remove/Pan/Undo/Redo behavior, calibrated perspective/occlusion/relighting, native iOS continuous photo manipulation, or dedicated persisted blueprint PDF.

## Authoritative record impact

- `CURRENT-STATE.md`: updated for the deployed Photo Arrange v1.7 release and pending iPhone continuous-refinement validation
- `DESIGN-SYSTEM.md`: updated to make continuous Add/Remove strokes, explicit Pan mode, always-available two-finger zoom, and refinement Undo/Redo durable Arrange interaction requirements
- `ARCHITECTURE.md`: unchanged; v1.7 changes interaction ergonomics but not canonical data flow, platform boundaries, persistence schema, or service architecture
- `PROJECT-CONSTITUTION.md`: unchanged; the existing photo-first product rule already governs this release
