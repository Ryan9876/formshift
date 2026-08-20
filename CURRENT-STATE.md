# FormShift Current State

**Revision:** 0.6.4  
**Date:** 2026-08-20  
**Milestone:** Photo Arrange v1.5 deployed; visual-quality, gesture, AI-repair, and save/refresh validation pending

FormShift is a **photo-first spatial augmentation product**. The real captured room image is the primary canvas; structured geometry remains the hidden authority. Plan/rectangle views are secondary technical verification surfaces.

## Photo Arrange v1 — validated baseline

Authenticated iPhone Safari validation has confirmed the core interaction model:
- a normal tap reaches FormShift rather than Safari's native image-selection UI
- MediaPipe interactive segmentation completes successfully
- a real photographed object such as the guitar can be isolated as a transparent cutout
- the actual photographed pixels can be lifted and moved over the same room photo
- the immutable source room photo remains preserved in private FormShift storage

## Photo Arrange v1.5 — deployed

Runtime baseline: `ccd5d98df77cfa61bc9c6bb12b6696663b053839`

Production evidence:
- web deployment `dpl_HCvFkDzuwQDRZA2HyP1yeyKEk86u` — READY on the exact runtime baseline
- API deployment `dpl_CDSgnUbQQgRckD9JxU4sBsKtEsu8` — READY on the exact monorepo baseline; existing background-repair API remains available
- exact branch preview `dpl_6jMM4cCKef2tG4CRLQVb4iJXHmHY` — READY before promotion
- production `/arrange` route — HTTP 200 smoke-verified
- Supabase migrations `photo_arrangements` and `photo_arrangements_privilege_hardening` applied successfully
- 26/26 public app tables have RLS enabled
- `photo_arrangements` grants are least privilege: anonymous has no table access; authenticated has SELECT + INSERT only
- authenticated owner-context insert passed in a rollback transaction; zero test arrangement rows remained afterward

Implemented in v1.5:

### Cleaner object masks
- segmentation output is restricted to the component connected to the user's tap rather than accepting disconnected high-confidence pixels across the scene
- small disconnected artifacts are removed by seeded connected-component isolation
- a local morphological close fills small mask gaps
- cutout edges are feathered instead of using the raw confidence threshold directly
- the repair mask is slightly expanded beyond the visible cutout edge to reduce old-location halos

### Improved immediate background preview
- the prior horizontal streak interpolation was replaced with iterative neighbor diffusion inside the removed-object mask
- the filled region receives a restrained local blur blend to reduce obvious directional streaks
- this remains a fast approximate fallback, not a claim of recovered hidden pixels

### Natural touch manipulation
- one-finger drag moves the selected object
- two-finger pinch scales it
- two-finger twist rotates it
- the entire photo interaction surface participates in the gesture so narrow objects remain usable on a phone
- size/rotate buttons remain available as accessibility/fallback controls

### Non-blocking AI background repair
- **Refine background with AI** remains explicit/opt-in
- background repair runs while the photographed object remains movable
- a compact repair-status badge replaces the full-canvas blocking state
- a successful repaired background is swapped into the active scene without discarding the user's current object transform

### Persisted photo arrangements
- **Keep placement** now saves an immutable derived photo arrangement instead of only changing browser-session state
- private Storage records the composed scene, cleaned mask, photographed-object cutout, and optional AI-repaired background
- `photo_arrangements` records parent lineage, immutable source room-photo asset, result/mask/cutout/background asset IDs, base spatial-version ID, and visual transform metadata
- the original room-photo asset is never overwritten
- opening Arrange reloads the latest committed derived scene through a short-lived signed Storage URL
- each later saved edit can parent the previous arrangement, preserving scene-edit history

## Privacy and accuracy boundaries

- segmentation and mask cleanup run locally in the browser
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
2. tap the guitar or another distinct object and compare the cutout edge/artifact quality with v1
3. drag with one finger
4. pinch with two fingers to resize and twist two fingers to rotate
5. choose **Refine background with AI** and confirm the object remains movable while repair runs
6. tap **Keep placement** and wait for the saved confirmation
7. hard refresh or leave/reopen Arrange and confirm the edited scene restores
8. make another edit and save it to exercise arrangement lineage

## Next implementation after v1.5 validation

Photo Arrange v2 should add scene intelligence rather than further 2D compositing polish: camera/floor/wall calibration, depth, perspective-aware physical scaling, contact constraints, occlusion, lighting/shadow treatment, photo-object to spatial-ID binding, reuse of the same visual pipeline for Organize, and native iOS segmentation/RealityKit where it materially improves fidelity.

## Not yet claimed

Production-quality segmentation or inpainting, v1.5 pinch/rotate quality on the user's iPhone, successful real Storage persistence/reload from an authenticated browser edit, calibrated projection/occlusion/relighting, native iOS photo manipulation, or dedicated persisted blueprint PDF.

## Authoritative record impact

- `CURRENT-STATE.md`: updated for Photo Arrange v1.5 deployment and persistence/security preflight evidence
- `PROJECT-CONSTITUTION.md`: unchanged
- `ARCHITECTURE.md`: unchanged because its existing versioned Arrange/derived-scene artifact contract already covers this implementation
- `DESIGN-SYSTEM.md`: unchanged
