# FormShift Current State

**Revision:** 0.9.29  
**Date:** 2026-08-23  
**Milestone:** Wave 3 replaces viewport-origin-dependent iPhone refinement input with a target-local Safari pointer adapter. Real refinement events now use PointerEvent `offsetX/offsetY` as the primary coordinate source before entering the frozen Photo Arrange v2.2 editor; the client/visual-viewport conversion remains fallback only.

FormShift is a **photo-first spatial augmentation product**. The real captured room image is the primary canvas; structured geometry remains the hidden authority. Plan/rectangle views remain secondary technical verification surfaces.

## Production boundary

Production web remains on the validated Photo Arrange v2.2 baseline. Prepared Scene, the Spatial Import Lab, and the target-local refinement candidate have **not** been promoted to production.

No production merge, web promotion, database migration, credential change, Polycam API provisioning, or physics integration occurred in this Wave 3 continuation.

## Why 0.9.29 supersedes 0.9.28 before device acceptance

Physical revision 0.9.27 failed with long teal vertical refinement columns. Revision 0.9.28 corrected the most likely iOS WebKit visual-viewport/client-rect mismatch and passed deterministic build gates, but it still depended on reconstructing a viewport-relative client coordinate.

Rather than spend another physical cycle validating a fragile viewport-origin assumption, Wave 3 now removes that dependency from the primary Safari path.

The canonical Photo Arrange web boundary already owns explicit platform pointer adaptation for Safari object drag. Revision 0.9.29 extends that same narrow boundary to the refinement surface without modifying the validated Photo Arrange v2.2 editing state machine.

## 0.9.29 target-local refinement input

The canonical adapter recognizes only the explicit `Selection refinement surface` and intercepts trusted pointer events before the frozen editor receives them.

Primary path:

```text
trusted iPhone PointerEvent
→ target-local offsetX / offsetY
→ actual refinement-surface rendered rect
→ normalized synthetic pointer event
→ frozen Photo Arrange editor
→ rendered-rect/layout-stage scaling
→ FormShift zoom/pan inverse
→ normalized immutable source-image coordinate
```

Important properties:
- the original `clientX/clientY` are deliberately ignored for refinement placement;
- page scroll, browser chrome movement and visual-viewport origin therefore cannot move the primary pointer source;
- the target-local offset remains in rendered surface CSS pixels and composes with the existing rendered-rect → layout-stage scaling;
- only trusted real events are normalized; synthetic normalized events are ignored by the capture adapter so they cannot recurse;
- the real event is stopped before the frozen editor can process it a second time;
- pointer identity/type/pressure/buttons/tilt/twist are preserved when the normalized event is forwarded;
- the existing `currentClientViewportOffset()` path remains available as a fallback and as the algebraic bridge used by the frozen editor, but is no longer the primary source of refinement placement;
- Add/Remove strokes remain stored only as normalized source-image coordinates;
- the live stroke, brush ring and selection mask continue to use the same source↔stage transform;
- short-tap selection, pinch zoom, Pan mode, object drag, persistence, AI repair and source-photo immutability contracts are unchanged.

Files:
- `apps/client/src/components/PhotoArrangeEditor.web.tsx` — canonical target-local Safari adapter;
- `apps/client/src/arrange/refinementCoordinates.ts` — target-local normalization helper plus fallback client/visual-viewport transforms;
- frozen editor remains `apps/client/src/components/PhotoArrangeEditorV17.web.tsx`.

## Permanent regression

`verify:arrange` now requires both implementation structure and coordinate behavior.

The Arrange contract gate requires:
- an explicit refinement-surface adapter boundary;
- target-local `event.offsetX/event.offsetY` input;
- forwarding before frozen-editor handling;
- normalized forwarded client coordinates;
- real-event duplicate handling stopped;
- synthetic-event recursion blocked;
- legacy client/visual-viewport mapping retained only as fallback support;
- existing Safari object-drag and page-scroll protections retained.

`scripts/verify-refinement-coordinates.mjs` proves:
- normal browser layout;
- substantial page scrolling;
- rendered DOM scaling relative to React Native layout dimensions;
- FormShift zoom/pan;
- iOS visual-viewport displacement;
- image↔stage inverse transforms;
- **target-local coordinates remain identical when the raw browser client coordinate is intentionally corrupted by more than 600 px**;
- the same target-local point remains source-stable while browser rect position and visual-viewport offsets both change materially;
- invalid target-local geometry fails closed.

This is the regression that the failed physical screenshot was missing: the primary path is now mathematically independent of the raw client coordinate rather than attempting to correct it.

## Validation evidence

Functional exact head:

`1ab32329a4672c4e988eafc9fa98fbb6f7bc7829`

Evidence:
- web Vercel preview `dpl_6MXtUmxvXFRKtLPMr4ZDG5eXA286` — **READY**;
- exact-head combined status — **Vercel web success + Vercel API success**;
- repository structure verification — pass;
- security/RLS source verification — pass;
- domain tests — pass;
- canonical Arrange/Safari contract suite — pass;
- **target-local refinement input contract — pass**;
- **corrupt-client-coordinate target-local invariance regression — pass**;
- scene/provider/persistence boundary suite — pass;
- Prepared Scene support/occlusion/quick-clean regressions — pass;
- Spatial Import regression/privacy/authority suite — pass;
- client TypeScript check — pass;
- static web export — pass.

Revision 0.9.29 is **build-validated, not yet physically accepted on iPhone**.

## Physically validated Prepared Scene baseline

Current iPhone evidence still proves:
- Prepared Scene survives preview authentication;
- the latest source photo remains authoritative;
- Safari uses the safe WASM perception path;
- DETR-backed discovery and detector-guided MediaPipe segmentation reach an interactive state;
- the automatic TV is a tight independent photographed-pixel layer and moves without Safari scroll takeover;
- broad unlabeled room-region masks are not auto-promoted;
- Depth Anything V2 Small executes locally on the physical iPhone;
- source-bound Prepared Scene persistence/restore works;
- immutable source photography and canonical measurements/spatial versions remain unchanged;
- the ghost-resistant local quick clean plate physically removes the TV without leaving recognizable duplicate TV/HP/screen content.

Mild reconstruction banding remains in the former TV region. That is a visual-quality issue; the prior blocking duplicate/ghost failure is physically closed for the local quick-clean path.

## Current structural-support status

Latest physical support evidence remains:
- selected `tv`, expected support `wall`;
- relative nearness 0.06;
- support model center 66%, slope 4.7 points, confidence 79%, source `hybrid`;
- depth support strong 10/13, coherent 10, residual approximately 0.027.

The visible 66% line tracked a foreground hardwood/rug/material transition rather than the far wall/floor/baseboard transition, so that high-confidence hybrid remains **not physically accepted**.

Depth support now retains multiple distinct nearward transitions per sampled column, clusters them into room-wide bands and selects the earliest/uppermost coherent nearward band that passes bounded sample-count, horizontal-coverage and residual checks. This refinement remains build-validated and requires another physical run.

## Spatial Import Lab / Polycam benchmark

Protected preview route: `/spatial-import`.

FormShift has a provider-neutral `SpatialImportEvidence` contract and browser-local inspector for:
- Polycam/RoomPlan-style `.json` floorplan exports;
- `.gltf` scene metadata;
- `.glb` embedded glTF metadata;
- `.zip` Developer Mode/session archives at central-directory inventory level.

Imported files are read locally with `File.arrayBuffer()`. The lab has no Supabase/persistence authority and every report carries `canonicalMutationAllowed: false`. Polycam remains an optional benchmark/import source, not a runtime dependency.

Structural-evidence hierarchy remains:

```text
LiDAR-capable iPhone
→ validated native RoomPlan/LiDAR structural capture preferred
→ reviewed external RoomPlan/mesh evidence may supplement/compare
→ single-photo monocular depth remains fallback/augmentation

Non-LiDAR device
→ photo/multi-view evidence + explicit calibration
→ reviewed external mesh/floorplan evidence when supplied
→ monocular estimates remain labeled estimated
```

## Existing Wave 3 safeguards retained

Still active:
- source-photo immutability and canonical spatial/measurement authority;
- detector-guided connected-component automatic MediaPipe masks;
- whole-room/oversized automatic-mask rejection;
- normalized relative-nearness convention (`0` farther → `1` nearer);
- explicit detector/depth acceptance and merge diagnostics;
- conservative destination-depth occlusion after drag release;
- original Prepared Scene object masks excluded from the source occluder field;
- deterministic ghost-resistant quick clean plate using unmasked source pixels;
- bounded/feathered explicit AI background repair;
- anti-ghost Prepared Scene repair prompt v1.1.0;
- Prepared Scene cache schema `prepared-scene-1.3`;
- source-photo-specific private persistence;
- fail-closed preview validation;
- Spatial Import no-upload/no-canonical-mutation boundary;
- no physics.

## Immediate physical acceptance

### A. Canonical Arrange target-local refinement

1. Open the branch preview's normal `/arrange` route and hard refresh.
2. Enter manual selection/refinement on the TV or another distinctive object.
3. Keep Safari browser chrome expanded/offset if possible.
4. Draw one **very short Add stroke** across a distinctive object edge.
5. The brush ring and teal live stroke must remain directly beneath the finger. **Any long vertical column fails the gate.**
6. Draw one short **Remove** stroke beside it.
7. Vertically scroll the page and repeat once.
8. Zoom/pan the photo and repeat once; then Fit photo and repeat once.
9. Confirm two-finger zoom, Pan mode and normal Safari page scrolling still work outside active manipulation.

A short stroke is sufficient. Do not trace the whole object until source alignment is physically accepted.

### B. External structural evidence

For the same room, obtain a Polycam/RoomPlan export if available, prioritized as:
1. `original_floorplan.json` or equivalent structured floorplan JSON;
2. GLB or `original.gltf` plus companion assets;
3. Developer Mode/session ZIP if available.

## Not yet claimed

- physical-device acceptance of the 0.9.29 target-local refinement adapter;
- real Polycam export compatibility beyond deterministic fixtures;
- raw Developer Mode decoding beyond ZIP inventory;
- automatic import-to-canonical adoption;
- Polycam API integration;
- production RoomPlan capture/normalization;
- physical acceptance of the latest support-band selector;
- physical acceptance of Support Assist on/off/re-enable correction;
- physical acceptance of destination occlusion;
- physical acceptance of current AI-repair quality;
- calibrated camera intrinsics/vanishing points;
- calibrated wall/floor planes;
- metric depth from the single-photo pipeline;
- production-quality household-object coverage;
- automatic person/furniture pixel separation rather than safe deferral;
- physically correct contact shadows/relighting;
- gravity/rigid-body physics;
- Prepared Scene scale/rotate controls.

## Next decision

Physically validate revision 0.9.29. If target-local `offsetX/offsetY` still produces vertical drift on the real device, stop adapting the frozen editor through synthesized PointerEvents and move the coordinate ownership directly into a new typed refinement-surface component before any further segmentation work.

In parallel, structural work remains directed toward RoomPlan/Polycam evidence rather than indefinite monocular heuristic tuning. Do **not** add Rapier/RealityKit physics until reliable support/collision geometry exists.

## Authoritative record impact

- `CURRENT-STATE.md`: revision **0.9.29** records the target-local Safari adapter, supersession of the viewport-origin primary path, exact validation evidence and remaining physical gate.
- `ARCHITECTURE.md`: unchanged at **0.5.8**; the canonical web boundary already owns explicit Safari gesture adaptation, so this is an implementation hardening within the existing architecture.
- `DESIGN-SYSTEM.md`: unchanged; the existing refinement contract already requires precise in-place stroke feedback.
- `PROJECT-CONSTITUTION.md`: unchanged; source primacy, reversibility and canonical-spatial-truth invariants are unaffected.
