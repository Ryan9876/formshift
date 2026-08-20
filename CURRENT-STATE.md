# FormShift Current State

**Revision:** 0.6.7  
**Date:** 2026-08-20  
**Milestone:** Photo Arrange v1.6 Selection Refinement deployed; iPhone refinement validation pending

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

The user's latest iPhone test classified this as a moderate improvement and exposed segmentation-mask quality as the dominant remaining defect.

## Photo Arrange v1.6 — Selection Refinement deployed

Runtime baseline: `2dfc89dea13f2e1d943a24acfe9f7d0c94612f8d`

Production evidence:
- exact branch preview `dpl_8xqtDzS6vdUiEFYnUXRKQbAnmQec` — READY on the runtime baseline
- preview Expo export completed successfully and explicitly included `/arrange`
- branch comparison was one commit ahead of `main` with one runtime file changed: `apps/client/src/components/PhotoArrangeEditor.web.tsx`
- production web deployment `dpl_4QPSdYxJU3NyKj9Kq2sYjQW7whG5` — READY on the exact runtime baseline and serving `formshift-web.vercel.app`
- production `/arrange` — HTTP 200 smoke-verified
- API source did not change; the Vercel API deployment generated for this client-only commit (`dpl_Bbzr9xk9oUmBJCAgvELc6wcfzAqD`) was canceled and the prior production API deployment `dpl_DynPyeinheV9UHHbkwb6MWV1tg6n` remains READY
- no database/schema migration was required

Implemented selection flow:
- first object tap creates a **candidate segmentation preview** over the unchanged room image instead of immediately lifting the object
- the candidate is shown with a translucent FormShift-blue mask and dashed extent
- **Add** and **Remove** modes collect positive/negative refinement points locally
- MediaPipe is rerun with the accumulated refinement points; deterministic local circular brush edits supplement the model output so the requested correction is visible even when the model response is imperfect
- each successful refinement recomputes the visible preview, cutout, and background-repair mask
- **Use selection** explicitly accepts the refined candidate, creates the lifted object, and starts the local old-location repair
- **Cancel** discards the candidate without modifying the current scene
- zoom/pan remains available while a candidate is being refined
- a touch loupe/magnifier follows the refinement point for small-edge work on a phone
- mobile controls now use a compact wrapping tray rather than the previous horizontally overflowing action strip
- after lift, the established object move/scale/rotate, AI repair, Keep placement, and persisted arrangement flow remain available
- persisted edit metadata now identifies renderer version `photo-arrange-1.6`

Current implementation detail: v1.6 provides discrete Add/Remove refinement taps with local brush-area effects; continuous finger-painted brush strokes are not yet claimed.

## Privacy and accuracy boundaries

- initial segmentation, mask cleanup, Add/Remove refinement, and candidate preview run locally in the browser
- the source/derived room scene is not altered merely by creating or refining a candidate selection
- AI repair sends the current source scene and accepted refined selection mask only after the user explicitly chooses **AI repair**
- the configured image-edit path is not claimed to be zero-data-retention
- derived scene files remain private household assets under project-scoped Storage policies
- pixel movement does not implicitly alter canonical physical dimensions, room geometry, or measurement provenance
- perspective, depth, floor/wall contact, occlusion, relighting, and physical scale are still uncalibrated for free-form photographed-object movement

## Existing validated product baseline

Prior validated phases retain private room-photo capture/storage, canonical geometry and immutable spatial versions, Plan Arrange persistence, Organize Intelligence, Build Intelligence/atomic acceptance, Build-plan restoration, blueprint presentation, and the Photo Arrange real-object interaction baseline.

Infrastructure:
- Supabase ref `oomtpnqprxykcjzrlfgc`; private bucket `formshift-private`; 26/26 public app tables RLS-enabled
- web `https://formshift-web.vercel.app`
- API `https://formshift-api.vercel.app`

## Next validation

On iPhone Safari:
1. hard refresh and open **Arrange**
2. zoom/pan to frame the guitar or another distinct object
3. tap once; confirm the object does **not** lift immediately and instead shows a blue candidate selection preview
4. choose **Remove** and tap an obvious background area incorrectly included in the candidate; confirm the mask updates/shrinks
5. choose **Add** and tap a missed part of the real object if necessary; confirm the mask updates/expands
6. confirm the loupe appears during refinement touch interaction
7. use **Cancel** once and confirm the current scene remains unchanged
8. select/refine again and choose **Use selection**
9. confirm the lifted object uses the refined mask and contains substantially less adjacent/background imagery
10. move/scale/rotate it and verify existing AI repair and Keep placement behavior still work

## Next implementation after v1.6 validation

If refinement materially improves the cutout, the next phase should move into **Photo Arrange v2 scene intelligence** rather than adding more flat controls: camera/floor/wall calibration, monocular/depth assistance, perspective-aware physical scaling, contact constraints, occlusion, contact shadow/lighting treatment, photo-object to spatial-ID binding, and reuse of the scene pipeline in Organize and Build.

If refinement is still too cumbersome or masks remain poor, improve the selection model/refinement ergonomics before scene-intelligence work; depth and perspective cannot compensate for a bad source mask.

## Not yet claimed

Production-quality segmentation or inpainting, successful iPhone validation of v1.6 Add/Remove refinement, continuous brush-stroke refinement, calibrated perspective/occlusion/relighting, native iOS photo manipulation, or dedicated persisted blueprint PDF.

## Authoritative record impact

- `CURRENT-STATE.md`: updated for the deployed Photo Arrange v1.6 release and pending iPhone validation
- `DESIGN-SYSTEM.md`: updated to make candidate-preview/refine-before-lift behavior a durable Arrange interaction requirement
- `ARCHITECTURE.md`: unchanged; v1.6 changes interaction behavior but not canonical data flow, platform boundaries, or persistence architecture
- `PROJECT-CONSTITUTION.md`: unchanged; the existing photo-first product rule already governs this release
