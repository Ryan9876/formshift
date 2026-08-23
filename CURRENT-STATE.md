# FormShift Current State

**Revision:** 0.9.27  
**Date:** 2026-08-23  
**Milestone:** Wave 3 fixes the iPhone manual-selection refinement coordinate drift with a source-stable client→layout→image transform and permanent scroll/render-scale/zoom regression coverage; Spatial Import remains build-validated and Prepared Scene structural calibration remains open.

FormShift is a **photo-first spatial augmentation product**. The real captured room image is the primary canvas; structured geometry remains the hidden authority. Plan/rectangle views remain secondary technical verification surfaces.

## Production boundary

Production web remains on the validated Photo Arrange v2.2 baseline. Prepared Scene and the Spatial Import Lab have **not** been promoted to production.

No production merge, web promotion, database migration, credential change, Polycam API provisioning, or physics integration occurred in this Wave 3 continuation.

## Latest physical interaction evidence — manual refinement drift

The latest supplied iPhone screenshot showed the canonical Photo Arrange refinement surface in **Add** mode with teal painted-selection strokes visibly displaced across the wall and around the TV instead of remaining under the user's intended finger path.

This is treated as a real interaction regression, not user error and not a segmentation-quality issue. The defect was traced to mixed coordinate spaces:
- pointer coordinates came from `getBoundingClientRect()` in rendered browser CSS pixels;
- the editor's `stageSize` came from React Native `onLayout` in layout-stage pixels;
- the old code subtracted the DOM rect origin but then normalized directly by `stageSize`;
- on iOS Safari, page/visual scaling can make rendered DOM dimensions differ from the layout-stage dimensions, causing the painted source-image coordinates and preview overlay to drift.

### Implemented fix

A pure `apps/client/src/arrange/refinementCoordinates.ts` transform now owns the refinement mapping:

```text
browser client coordinate
→ rendered DOM rect
→ layout-stage coordinate
→ app zoom/pan inverse
→ normalized immutable source-image coordinate
```

The editor now:
- converts `clientX/clientY` through the rendered DOM rectangle into layout-stage pixels before applying FormShift zoom/pan;
- stores refinement strokes only as normalized source-image coordinates;
- renders the live stroke through the exact inverse image→stage transform;
- uses the same transform for initial short-tap selection and subsequent Add/Remove strokes;
- removes the old mixed-space `localPoint` / `stageToImage` helpers;
- shows a visible Add/Remove brush-footprint ring under the finger so alignment can be checked during the stroke rather than only after recomputation;
- preserves the existing short-tap, pinch, pan, Safari drag-capture, save, repair and source-immutability contracts.

### Permanent regression

`scripts/verify-refinement-coordinates.mjs` is now part of `verify:arrange` and proves normalized source coordinates remain invariant across:
- normal browser layout;
- substantial vertical page scrolling;
- rendered DOM scaling relative to React Native layout dimensions;
- FormShift photo zoom and pan composed with browser scaling;
- image→stage→image inverse mapping;
- brush-preview transform behavior;
- invalid/zero-size DOM geometry failing closed.

The Arrange contract gate also requires the new transform and brush footprint and fails if the legacy mixed-space helpers return.

### Validation evidence

Functional exact head:

`3325ebfb86cbd0c14e0ae47e282dc6bafe65b2d0`

Evidence:
- web Vercel preview `dpl_9XXeRmXFfFbQZRHGLE5k7rZBVJNA` — **READY**;
- exact-head GitHub combined status — **Vercel web success + Vercel API success**;
- repository structure verification — pass;
- security/RLS source verification — pass;
- domain tests — pass;
- canonical Arrange/Safari regression suite — pass;
- **refinement coordinate invariance regression — pass**;
- scene/provider/persistence boundary suite — pass;
- Prepared Scene support/occlusion/quick-clean regressions — pass;
- Spatial Import regression/privacy/authority suite — pass;
- client TypeScript check — pass;
- static web export — pass.

This fix is **build-validated, not yet physically accepted on iPhone**. Physical acceptance requires painting Add/Remove strokes while the page is vertically scrolled and after photo zoom/pan and confirming the brush ring, live stroke and resulting mask remain directly aligned with the intended image location.

## Physically validated Prepared Scene baseline

Current iPhone evidence proves:
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

The latest physical support run reported:
- selected `tv`, expected support `wall`;
- relative nearness 0.06;
- support model center 66%, slope 4.7 points, confidence 79%, source `hybrid`;
- depth support strong 10/13, coherent 10, residual approximately 0.027.

The visible 66% line nevertheless tracked a foreground hardwood/rug/material transition rather than the far wall/floor/baseboard transition, so that high-confidence hybrid is **not physically accepted**.

Depth support now retains multiple distinct nearward transitions per sampled column, clusters them into room-wide bands and chooses the earliest/uppermost coherent nearward band that passes bounded sample-count, horizontal-coverage and residual checks. The deterministic suite includes a weaker structural wall/floor band followed by a stronger full-width foreground-material band and requires the earlier structural band to win. This refinement remains build-validated and needs another physical run.

## Spatial Import Lab / Polycam benchmark

Protected preview route: `/spatial-import`.

FormShift has a provider-neutral `SpatialImportEvidence` contract and browser-local inspector for:
- Polycam/RoomPlan-style `.json` floorplan exports;
- `.gltf` scene metadata;
- `.glb` embedded glTF metadata;
- `.zip` Developer Mode/session archives at central-directory inventory level.

Imported files are read locally with `File.arrayBuffer()`. The lab has no Supabase/persistence authority and every report carries `canonicalMutationAllowed: false`. It can compare external metric bounds/semantic counts with the current `SpatialSnapshot`, but import is evidence rather than a measurement-adoption event.

Polycam remains a **reference capture/reconstruction benchmark and optional import source**, not a runtime dependency. The structural-evidence hierarchy is:

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

A real Polycam/RoomPlan export from the reference room is still the decisive evidence for how aggressively to accelerate the native RoomPlan adapter and demote monocular structural heuristics.

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

### A. Canonical Arrange refinement regression

1. Open the branch preview's normal `/arrange` route and hard refresh.
2. Enter manual object selection/refinement on the TV or another distinct object.
3. Vertically scroll the page so the photo is not at its original viewport position.
4. Paint a short **Add** stroke along a distinctive object edge. The visible brush ring and teal live stroke must stay directly under the finger and the recomputed mask must change at the same source-image location.
5. Switch to **Remove** and repeat.
6. Zoom/pan the photo, repeat Add/Remove, then press **Fit photo** and repeat once more.
7. Confirm two-finger zoom remains available, Pan mode still pans, and normal Safari page scrolling returns when not actively editing/manipulating.

### B. External structural evidence

For the same room, obtain a Polycam/RoomPlan export if available, prioritized as:
1. `original_floorplan.json` or equivalent structured floorplan JSON;
2. GLB or `original.gltf` plus companion assets;
3. Developer Mode/session ZIP if available.

Inspect the JSON first in `/spatial-import` or provide the export for deeper comparison.

## Not yet claimed

- physical-device acceptance of the refinement-coordinate fix;
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

First physically validate the repaired canonical refinement coordinate path. In parallel, the stronger structural direction remains RoomPlan/Polycam evidence rather than indefinite monocular heuristic tuning. Do **not** add Rapier/RealityKit physics until reliable support/collision geometry exists.

## Authoritative record impact

- `CURRENT-STATE.md`: revision **0.9.27** records the physical refinement-drift defect, source-stable coordinate fix, permanent regression and exact-head validation boundary.
- `ARCHITECTURE.md`: unchanged at **0.5.8**; the fix implements the existing gesture/source-coordinate and validation architecture rather than changing it.
- `DESIGN-SYSTEM.md`: unchanged; the brush preview/selection-refinement contract already requires an in-place stroke preview and precise mobile refinement.
- `PROJECT-CONSTITUTION.md`: unchanged; source primacy, reversibility and canonical-spatial-truth invariants are unaffected.
