# FormShift Current State

**Revision:** 0.9.0  
**Date:** 2026-08-21  
**Milestone:** Photo Arrange v2.1 placement realism deployed; real-device visual and persistence validation pending

FormShift is a **photo-first spatial augmentation product**. The real captured room image is the primary canvas; structured geometry remains the hidden authority. Plan/rectangle views are secondary technical verification surfaces.

## Validated Photo Arrange baseline

Authenticated browser/iPhone testing has established that:
- a normal tap reaches FormShift rather than Safari's native image-selection UI
- local interactive segmentation can isolate a photographed object
- a photographed object such as the guitar can be lifted and moved using its real pixels
- room pinch-zoom/pan improves small-object targeting
- candidate review/refinement and lifted-object manipulation are meaningfully separated
- immutable source room imagery remains preserved in private FormShift storage
- persisted derived photo arrangements restore after refresh
- object-centered local inference materially improved guitar isolation enough to shift the primary bottleneck from gesture design to rendering quality
- the authenticated AI background-repair path executes successfully after explicit opt-in and materially improves the removed-object location compared with the deterministic local fallback

The experience remains prototype-quality. The dominant remaining quality constraints are calibrated depth, true occlusion, floor/support understanding, physically appropriate contact, edge integration, and lighting.

## Retained Arrange foundations

Photo Arrange v1.5–v2.0.1 retain:
- candidate selection preview before pixels are lifted
- explicit Add / Remove refinement with continuous strokes and Undo / Redo
- explicit Pan/review mode and two-finger room zoom
- one-finger object movement plus two-finger scale/rotation
- private immutable photo-arrangement persistence with parent lineage
- explicit asynchronous AI background repair
- iPhone Safari gesture/safe-area hardening
- prewarmed local segmentation and cached semantic selection
- object-centered local inference around the tap for higher effective object resolution
- explicit **Lift object** transition before photographed pixels become movable
- restrained cutout/edge treatment
- validated opt-in AI background reconstruction through `openai/gpt-image-2`

Persistence/security baseline remains:
- Supabase private bucket `formshift-private`
- 26/26 public application tables RLS-enabled
- anonymous has no `photo_arrangements` table privileges; authenticated has SELECT + INSERT only
- pixel edits never overwrite the immutable source photo

## Validated AI background repair

A production iPhone test after v2.0.1 showed the removed guitar location reconstructed as continuous room background instead of the faceted deterministic fallback.

Server-side evidence for that test:
- `public.ai_runs.task_name = 'photo-background-repair'`
- status: `completed`
- provider model: `openai/gpt-image-2`
- latency: `24,880 ms`
- error class: none
- created at: `2026-08-20 17:16:28.707697+00`

The current authenticated AI repair path is retained for the prototype baseline. Automatic repair remains explicit opt-in and off by default.

## Photo Arrange v2.1 — placement realism

Functional runtime baseline: `aef0bd41ec41b4fcff25db3324870a0f70a9245c`

Implemented:
- optional **Perspective: On / Off** placement assistance after an object is lifted
- the accepted source-object vertical position becomes the image-space depth reference for that edit
- with assistance enabled, moving the object lower in the photo moderately increases apparent size and moving it higher moderately reduces apparent size
- the estimated perspective factor is bounded to avoid unstable scale changes
- manual pinch/button scale remains independent and composes with the estimated perspective factor
- drag bounds account for the effective rendered size so assisted scaling does not push the object outside the scene
- a position-aware contact ellipse is rendered beneath the moved object while assistance is enabled
- a temporary dashed contact guide appears at the object base during drag
- the older generic pseudo-shadow is disabled so the new position-aware contact treatment is not doubled
- **Keep placement** composites using the same effective rendered scale shown in the live preview
- persisted `transform_json` now retains effective scale plus optional `manualScale`, `perspectiveFactor`, `placementAssist`, and renderer version `photo-arrange-2.1`
- existing source-photo integrity, selection/refinement, AI background repair, and persistence/storage behavior remain unchanged

This is deliberately an **image-space heuristic**, not calibrated depth. Perspective assistance can be disabled for placements where vertical screen position is not a useful depth proxy, including wall-mounted or unusual support situations.

### Validation and deployment evidence

- isolated branch: `photo-arrange-v21-placement`
- an intermediate branch build was reviewed but not promoted after detecting an unnecessary persistence-helper rewrite; that change was fully reverted before release
- corrected exact preview `dpl_2o7sUopCLavwDZ9Kms9WtPjrXJhQ` — READY on `aef0bd41ec41b4fcff25db3324870a0f70a9245c`
- corrected branch comparison against then-current `main` was a clean fast-forward affecting only:
  - `apps/client/src/components/PhotoArrangeEditorV17.web.tsx`
  - `apps/client/src/components/PhotoArrangeEditorV20.web.tsx`
  - `apps/client/src/data/photoArrangementPersistence.ts` with transform-type metadata only
- production web deployment `dpl_63d5PJCDqfgYv4nysQjMszPyn3Ue` — READY on the exact runtime baseline and serving `formshift-web.vercel.app`
- production build exported `/arrange` successfully with no build errors
- live production `/arrange` — HTTP 200 smoke-verified

## Accuracy and privacy boundaries

- segmentation/refinement remain local in the browser
- AI background repair occurs only after explicit user opt-in; the configured image provider path is not claimed to be zero-data-retention
- deterministic local removed-object reconstruction remains a fast fallback and is not claimed to be photorealistic
- v2.1 perspective assistance is an estimated screen-space visualization aid, not camera calibration, measured floor depth, or proof of physical scale
- the contact ellipse/guide is illustrative, not a detected support plane or physically simulated shadow
- placement assistance never changes canonical physical dimensions, room geometry, or measurement provenance
- true depth, floor/wall/support planes, occlusion, calibrated perspective, relighting, and physical scale remain uncalibrated for free-form photographed-object movement

## Next validation

In production on iPhone Safari / browser:
1. hard refresh and open **Arrange**
2. select and lift the guitar using the existing selection/refinement flow
3. leave **Perspective: On** and drag the guitar substantially lower, then higher; confirm apparent scale changes smoothly in the expected direction
4. confirm the contact ellipse follows the bottom of the guitar and the dashed contact guide appears only while dragging
5. use manual pinch/size controls and confirm manual scale still works while perspective assistance is on
6. switch **Perspective: Off** and confirm vertical movement no longer changes apparent scale
7. use AI background repair and confirm the validated repair flow still completes normally
8. choose **Keep placement**, refresh, and confirm the saved derived scene visually matches the effective size shown before save

## Next implementation decision

If v2.1 feels directionally natural, stop adding image-space heuristics and proceed to a real scene model:
1. estimate or capture floor/wall/support planes and coarse depth
2. use calibrated/estimated depth for projection rather than screen-Y scaling
3. add depth-aware occlusion so furniture can correctly pass in front of or behind moved objects
4. derive contact/support constraints from the scene model
5. improve edge matting, color spill, and scene-aware lighting
6. use LiDAR/RoomPlan where available on supported iPhones and an explicitly lower-confidence monocular/photo fallback elsewhere

If the screen-Y heuristic feels unnatural on common placements, disable it by default rather than adding more compensating heuristics; true depth/calibration is the appropriate next architecture step.

## Not yet claimed

Real-device validation of v2.1 placement assistance, calibrated floor snapping, true scene depth, depth-aware occlusion, perspective-aware **physical** scaling, physically correct contact shadow, calibrated relighting, native iOS continuous photo manipulation, or dedicated persisted blueprint PDF.

## Authoritative record impact

- `CURRENT-STATE.md`: updated for the deployed Photo Arrange v2.1 placement-realism release and pending real-device validation
- `DESIGN-SYSTEM.md`: updated to revision 0.5.4 with the durable optional/reversible placement-assist contract and explicit estimated-vs-calibrated boundary
- `ARCHITECTURE.md`: unchanged; v2.1 extends the existing derived-scene transform metadata without changing service, storage, auth, or persistence boundaries
- `PROJECT-CONSTITUTION.md`: unchanged; existing source-integrity, privacy, measurement-provenance, and photo-first rules continue to govern the release
