# FormShift Current State

**Revision:** 0.9.28  
**Date:** 2026-08-23  
**Milestone:** A second physical iPhone test disproved the first manual-refinement coordinate correction. Wave 3 now compensates iOS WebKit's independently panned visual viewport before mapping PointerEvent client coordinates into the immutable source image, with an exact regression for large visual-viewport displacement.

FormShift is a **photo-first spatial augmentation product**. The real captured room image is the primary canvas; structured geometry remains the hidden authority. Plan/rectangle views remain secondary technical verification surfaces.

## Production boundary

Production web remains on the validated Photo Arrange v2.2 baseline. Prepared Scene and the Spatial Import Lab have **not** been promoted to production.

No production merge, web promotion, database migration, credential change, Polycam API provisioning, or physics integration occurred in this Wave 3 continuation.

## Latest physical interaction evidence — 0.9.27 failed

The latest supplied iPhone screenshot showed the canonical Photo Arrange refinement surface still painting long teal vertical columns through the wall, console, floor and rug instead of keeping the live Add stroke under the user's finger.

This **fails physical acceptance of revision 0.9.27**.

The new pattern is more diagnostic than the previous screenshot:
- horizontal placement was comparatively stable;
- vertical coordinates were displaced/stretched dramatically;
- the failure occurred inside iOS browser chrome with the visual viewport visibly offset from the layout viewport;
- segmentation was only consuming the incorrect coordinates, so MediaPipe is not the root cause.

The 0.9.27 correction handled rendered DOM scaling versus React Native layout size, but still assumed `PointerEvent.clientX/clientY` and `getBoundingClientRect()` shared the same viewport origin. On iOS WebKit that assumption is false when browser chrome, pinch zoom or visual-viewport panning moves the visual viewport independently of the layout viewport.

## 0.9.28 coordinate correction

`apps/client/src/arrange/refinementCoordinates.ts` now treats the mapping as:

```text
PointerEvent client coordinate (visual viewport on iOS WebKit)
→ add iOS visualViewport offset
→ layout-viewport client coordinate
→ rendered DOM rect → layout-stage scaling
→ FormShift zoom/pan inverse
→ normalized immutable source-image coordinate
```

Runtime behavior:
- iPhone/iPad WebKit reads `window.visualViewport.offsetLeft/offsetTop` at pointer-mapping time;
- the compensation is intentionally limited to the iOS/iPadOS WebKit family so engines that already align client coordinates and client rects are not changed;
- the existing rendered-rect/layout-stage scale correction remains active;
- Add/Remove strokes continue to be stored only as normalized source-image coordinates;
- the live stroke and brush-footprint ring continue to render from the exact inverse image→stage transform;
- short-tap selection, pinch zoom, Pan mode, object drag, persistence, AI repair and source-photo immutability contracts are unchanged.

## Permanent regression

`scripts/verify-refinement-coordinates.mjs` now proves source-coordinate invariance across:
- normal layout;
- substantial page scrolling;
- rendered DOM scaling versus React Native layout size;
- FormShift photo zoom and pan;
- image→stage→image round trips;
- brush-preview transforms;
- zero-size geometry failing closed;
- **148 px iOS visual-viewport vertical displacement**;
- **combined rendered scaling + 126 px visual-viewport displacement + FormShift zoom/pan**;
- a direct A/B case where raw browser `clientY` changes by **154 px** while resolved layout-stage/source coordinates are required to remain exactly unchanged.

The Arrange contract gate additionally requires:
- runtime `currentClientViewportOffset()` integration;
- direct `window.visualViewport.offsetTop` use;
- iOS-WebKit scoping;
- the existing source-coordinate and brush-preview contracts.

## Validation evidence

Functional exact head:

`1e9834cc8b2b8ce2b0f9e3a47bca4986ef48f555`

Evidence:
- web Vercel preview `dpl_HHMT3v78sBFQSX83sAHDkJpSMaMS` — **READY**;
- exact-head GitHub combined status — **Vercel web success + Vercel API success**;
- repository structure verification — pass;
- security/RLS source verification — pass;
- domain tests — pass;
- canonical Arrange/Safari regression suite — pass;
- iOS visual-viewport runtime-contract checks — pass;
- **visual-viewport refinement invariance regression — pass**;
- scene/provider/persistence boundary suite — pass;
- Prepared Scene support/occlusion/quick-clean regressions — pass;
- Spatial Import regression/privacy/authority suite — pass;
- client TypeScript check — pass;
- static web export — pass.

This correction is **build-validated, not yet physically accepted on iPhone**.

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

The latest physical support run reported:
- selected `tv`, expected support `wall`;
- relative nearness 0.06;
- support model center 66%, slope 4.7 points, confidence 79%, source `hybrid`;
- depth support strong 10/13, coherent 10, residual approximately 0.027.

The visible 66% line nevertheless tracked a foreground hardwood/rug/material transition rather than the far wall/floor/baseboard transition, so that high-confidence hybrid remains **not physically accepted**.

Depth support now retains multiple distinct nearward transitions per sampled column, clusters them into room-wide bands and chooses the earliest/uppermost coherent nearward band that passes bounded sample-count, horizontal-coverage and residual checks. The deterministic suite includes a weaker structural wall/floor band followed by a stronger full-width foreground-material band and requires the earlier structural band to win. This refinement remains build-validated and needs another physical run.

## Spatial Import Lab / Polycam benchmark

Protected preview route: `/spatial-import`.

FormShift has a provider-neutral `SpatialImportEvidence` contract and browser-local inspector for:
- Polycam/RoomPlan-style `.json` floorplan exports;
- `.gltf` scene metadata;
- `.glb` embedded glTF metadata;
- `.zip` Developer Mode/session archives at central-directory inventory level.

Imported files are read locally with `File.arrayBuffer()`. The lab has no Supabase/persistence authority and every report carries `canonicalMutationAllowed: false`. It can compare external metric bounds/semantic counts with the current `SpatialSnapshot`, but import is evidence rather than a measurement-adoption event.

Polycam remains a **reference capture/reconstruction benchmark and optional import source**, not a runtime dependency. The structural-evidence hierarchy remains:

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

### A. Canonical Arrange refinement regression

1. Open the new branch preview's normal `/arrange` route and hard refresh.
2. Enter manual selection/refinement on the TV or another distinctive object.
3. Keep the iOS browser chrome in the same expanded/offset state shown in the failed screenshot if possible.
4. Paint one **very short Add stroke** across a recognizable TV edge. The brush ring and teal live stroke must remain directly under the finger; no long vertical column is acceptable.
5. Switch to **Remove** and make one short stroke on the same edge.
6. Vertically scroll the page, repeat once.
7. Zoom/pan the photo, repeat once, then Fit photo and repeat once.
8. Confirm two-finger zoom, Pan mode and ordinary Safari page scrolling still behave normally outside active manipulation.

A single short stroke is sufficient to pass/fail this gate. Do not spend time tracing the object until coordinate alignment is physically proven.

### B. External structural evidence

For the same room, obtain a Polycam/RoomPlan export if available, prioritized as:
1. `original_floorplan.json` or equivalent structured floorplan JSON;
2. GLB or `original.gltf` plus companion assets;
3. Developer Mode/session ZIP if available.

## Not yet claimed

- physical-device acceptance of the 0.9.28 visual-viewport refinement correction;
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

First physically validate the 0.9.28 refinement coordinate path. If the visual-viewport compensation still fails on the physical browser, stop relying on viewport-origin coordinates entirely and switch the refinement surface to target-local PointerEvent `offsetX/offsetY` with physical instrumentation before further segmentation work.

In parallel, the stronger structural direction remains RoomPlan/Polycam evidence rather than indefinite monocular heuristic tuning. Do **not** add Rapier/RealityKit physics until reliable support/collision geometry exists.

## Authoritative record impact

- `CURRENT-STATE.md`: revision **0.9.28** records the failed 0.9.27 physical gate, iOS visual-viewport root cause, 0.9.28 compensation, exact regressions and build validation.
- `ARCHITECTURE.md`: unchanged at **0.5.8**; this is an implementation correction within the existing source-coordinate/gesture architecture.
- `DESIGN-SYSTEM.md`: unchanged; no durable interaction contract changed.
- `PROJECT-CONSTITUTION.md`: unchanged; product invariants are unaffected.
