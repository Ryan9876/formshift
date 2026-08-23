# FormShift Current State

**Revision:** 0.9.26  
**Date:** 2026-08-23  
**Milestone:** Wave 3 includes a build-validated clean-room Spatial Import Lab for Polycam/RoomPlan/glTF evidence; ghost-resistant local source removal is physically accepted, support calibration remains unresolved, and the next decisive input is a real Polycam export from the same room.

FormShift is a **photo-first spatial augmentation product**. The real captured room image is the primary canvas; structured geometry remains the hidden authority. Plan/rectangle views remain secondary technical verification surfaces.

## Production boundary

Production web remains on the validated Photo Arrange v2.2 baseline. Prepared Scene and the Spatial Import Lab have **not** been promoted to production.

No production merge, web promotion, database migration, credential change, Polycam API provisioning, or physics integration occurred in this Wave 3 continuation.

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
- the **ghost-resistant local quick clean plate physically removes the TV without leaving a recognizable duplicate TV, HP advertisement, logo, readable screen text, or screen image at the original wall location**.

Mild reconstruction banding remains in the former TV region. That is a visual-quality issue, but the prior blocking duplicate/ghost failure is physically closed for the local quick-clean path.

## Latest physical support evidence

The latest supplied iPhone screenshot showed:
- **1 editable object:** `tv`;
- selected TV expected support: **wall**;
- normalized relative nearness: **0.06**;
- Support assist: **on**;
- active support model: center **66%**, slope **4.7 points across the photo**, confidence **79%**, source **`hybrid`**;
- visible depth diagnostic: support accepted, strong **10/13**, coherent **10**, residual approximately **0.027**;
- the TV moved away from its source location;
- the original TV region remained free of recognizable TV/ad content.

The visible 66% support line was still too low: it tracked the foreground hardwood/rug/material transition rather than the far wall/floor/baseboard transition. Therefore the 79% hybrid result is **not** treated as physical acceptance.

### Current support refinement

Depth support now retains multiple distinct nearward transitions per sampled column, clusters them into room-wide bands, and chooses the **earliest/uppermost coherent nearward band** that passes bounded sample-count, horizontal-coverage and residual checks. The deterministic regression includes a weaker true wall/floor band followed by a stronger full-width foreground material band and requires the earlier structural band to win.

This implementation is build-validated but still needs a physical re-run. More importantly, the new external-capture benchmark provides a stronger path than indefinite monocular-heuristic tuning when structural capture evidence exists.

## New Wave 3 capability — Spatial Import Lab

Branch: `scene-foundation-v1`  
Protected preview route: `/spatial-import`

FormShift now has a provider-neutral `SpatialImportEvidence` contract and local browser inspector for mature external capture/reconstruction evidence.

Supported v1 inputs:
- Polycam/RoomPlan-style `.json` floorplan exports;
- `.gltf` scene metadata;
- `.glb` embedded glTF metadata;
- `.zip` Developer Mode/session archives at central-directory inventory level.

### Privacy and authority boundary

Imported files are read with browser-local `File.arrayBuffer()` and are not uploaded by the lab. The route is protected by the existing `AccessGate`.

The inspector has no Supabase/persistence authority and cannot write measurements, spatial versions, Prepared Scenes, source photos, private assets or any other canonical state. Every report carries `canonicalMutationAllowed: false`.

An import is evidence, not a measurement-acceptance event.

### glTF / GLB evidence

The inspector reports:
- glTF asset version/generator;
- scene/node/mesh/primitive counts;
- POSITION accessor vertex counts when present;
- material/image counts;
- metric scene bounds from accessor min/max plus node transforms when resolvable;
- local-accessor bounds fallback when full scene traversal is unavailable;
- warnings for external geometry/textures that the local lab intentionally does not fetch.

### RoomPlan / Polycam floorplan evidence

CapturedRoom/CapturedStructure-style JSON is normalized into counts/evidence for:
- walls;
- floors;
- doors;
- windows;
- openings;
- objects;
- sections;
- confidence/category counts;
- floor polygon points;
- metric bounds from dimensions/transforms where available.

Polycam filenames such as `original_floorplan.json`, `optimized_floorplan.json` and `edited_floorplan.json` remain Polycam-provenanced while being interpreted through the generic RoomPlan evidence adapter.

### Raw session inventory

The ZIP path currently inventories, without decompression/upload:
- total entries;
- keyframe images;
- likely depth/LiDAR files;
- likely confidence files;
- likely camera/intrinsic/extrinsic/pose files;
- sample entry names.

A real Developer Mode package is required before any version-specific raw decoder is added.

### Comparison with FormShift

If a current `SpatialSnapshot` exists, the lab compares external metric bounds and semantic counts with FormShift's current boundary/object/opening state. The result remains diagnostic only and has no adoption authority.

## Polycam reference benchmark decision

Polycam is a **reference capture/reconstruction benchmark and optional import source**, not a FormShift dependency.

The clean-room benchmark is documented in `docs/POLYCAM-REFERENCE-BENCHMARK.md`.

The intended structural-evidence hierarchy is now:

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

Polycam's paid/Enterprise Content API is **not** required for this architecture. Manual/user-supplied exports are the baseline so FormShift does not become strategically dependent on Polycam.

## Spatial Import validation evidence

Validated functional/documented head before authoritative-record reconciliation:

`74aa1f46dc2c0dd4c6c7a01559ea51f7eb9ae6f2`

Evidence:
- web Vercel preview `dpl_2CkDHZScGWDKcftwufXVK7QFKmjK` — **READY**;
- GitHub combined exact-head status — **Vercel web success + Vercel API success**;
- static export includes `/spatial-import`;
- repository/security/domain gates — pass;
- Arrange/Safari regressions — pass;
- scene/provider/persistence gates — pass;
- Prepared Scene support/occlusion/quick-clean regressions — pass;
- spatial-import glTF/GLB metric metadata fixture — pass;
- spatial-import RoomPlan dimensions/transforms/counts fixture — pass;
- spatial-import Polycam session ZIP inventory fixture — pass;
- spatial-import canonical comparison/mutation prohibition — pass;
- spatial-import privacy boundary: no network upload/no canonical persistence — pass;
- client TypeScript check — pass;
- static web export — pass.

## Existing Wave 3 safeguards retained

Still active:
- detector-guided connected-component automatic MediaPipe masks;
- whole-room/oversized automatic-mask rejection;
- normalized relative-nearness convention (`0` farther → `1` nearer);
- explicit detector/depth acceptance and merge diagnostics;
- conservative destination-depth occlusion after drag release;
- original Prepared Scene object masks excluded from the source occluder field;
- deterministic quick clean plate using only unmasked source pixels;
- bounded/feathered explicit AI background repair;
- anti-ghost Prepared Scene repair prompt v1.1.0;
- Prepared Scene cache schema `prepared-scene-1.3`;
- source-photo-specific private persistence;
- fail-closed preview validation;
- no canonical mutation from photo perception or spatial imports;
- no physics.

## Immediate next evidence

### Polycam reference capture

For the same room used in Prepared Scene:
1. Enable Polycam Developer Mode **before** scanning if raw evidence will be exported.
2. Capture the room using Space Mode or Floorplan Mode on the LiDAR iPhone.
3. Preserve the unedited result.
4. Export, in priority order:
   - `original_floorplan.json` or equivalent structured floorplan JSON;
   - GLB or `original.gltf` (plus companion geometry/textures if using glTF);
   - `session.zip` / Developer Mode package if available.
5. Inspect the floorplan JSON first in `/spatial-import`, then provide either the copied report or the source export for deeper analysis.

The first real package should answer whether direct RoomPlan-derived walls/floors/openings/transforms make the current monocular support-boundary work unnecessary on LiDAR devices.

### Prepared Scene regression

The earliest-coherent support selector still needs one physical re-run. A correct depth rejection or detector-only result is preferable to a confidently wrong hybrid.

## Not yet claimed

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

Do **not** add Rapier/RealityKit physics yet and do not continue tuning monocular structural heuristics indefinitely.

The next decisive input is a real Polycam/RoomPlan-derived capture of the same room. If it provides stable floor/wall/opening geometry and metric transforms, accelerate FormShift's native RoomPlan adapter and demote monocular floor-boundary inference to a non-LiDAR fallback. If the external evidence is insufficient, use the import report to identify exactly what calibration data FormShift must capture itself.

## Authoritative record impact

- `CURRENT-STATE.md`: revision **0.9.26** records the build-validated Spatial Import Lab, clean-room Polycam benchmark, physical quick-clean acceptance and external-evidence decision boundary.
- `ARCHITECTURE.md`: revision **0.5.8** records provider-neutral spatial imports as derived evidence, the explicit adoption boundary, the LiDAR/RoomPlan-first structural hierarchy, Polycam's optional reference role, local-only v1 privacy behavior and Spatial-Import release gates.
- `DESIGN-SYSTEM.md`: unchanged; the Spatial Import Lab is a diagnostic/internal workflow and does not change the consumer visual system.
- `PROJECT-CONSTITUTION.md`: unchanged; source primacy, privacy, provenance, reversibility and canonical-spatial-truth invariants already require imported evidence to remain non-authoritative until explicitly adopted.
