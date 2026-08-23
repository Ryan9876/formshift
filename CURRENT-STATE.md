# FormShift Current State

**Revision:** 0.9.26  
**Date:** 2026-08-23  
**Milestone:** Wave 3 now includes a build-validated clean-room Spatial Import Lab for Polycam/RoomPlan/glTF evidence; Prepared Scene quick-clean remains physically accepted, support calibration remains unresolved, and the next decisive input is a real Polycam export from the same room

FormShift is a **photo-first spatial augmentation product**. The real captured room image is the primary canvas; structured geometry remains the hidden authority. Plan/rectangle views remain secondary technical verification surfaces.

## Production boundary

Production web remains on the validated Photo Arrange v2.2 baseline. Prepared Scene and the Spatial Import Lab have **not** been promoted to production.

No production merge, web promotion, database migration, credential change, Polycam API credential/provisioning, or physics integration occurred in this Wave 3 continuation.

## New Wave 3 capability — clean-room Spatial Import Lab

Branch: `scene-foundation-v1`  
Protected preview route: `/spatial-import`

FormShift now has a provider-neutral `SpatialImportEvidence` inspection boundary designed to benchmark mature capture systems without making them runtime dependencies or automatically trusting imported geometry.

The v1 browser lab can inspect locally selected:
- Polycam/RoomPlan-style `.json` floorplan exports;
- `.gltf` scene metadata;
- `.glb` embedded glTF metadata;
- `.zip` Developer Mode/session archives at the central-directory inventory level.

### Local-only privacy/authority rule

Imported files are read with browser-local `File.arrayBuffer()` and are not uploaded by this lab. The route is behind the existing `AccessGate`.

The spatial-import implementation has no Supabase/persistence authority and does not write:
- measurements;
- spatial versions;
- Prepared Scenes;
- source photos;
- private assets;
- any other canonical project state.

Every report carries `canonicalMutationAllowed: false`.

### glTF / GLB inspection

The inspector reports:
- glTF asset version/generator;
- scene/node/mesh/primitive counts;
- POSITION accessor vertex counts where present;
- material/image counts;
- metric scene bounds from accessor min/max metadata with node transforms where resolvable;
- fallback local-only accessor bounds when full scene traversal is unavailable;
- warnings when a `.gltf` references external buffers/textures that the local lab intentionally does not fetch.

This is sufficient for first-pass scale, orientation, coverage and mesh-complexity comparison without introducing a renderer or downloading external assets.

### RoomPlan / Polycam floorplan inspection

The inspector recognizes CapturedRoom/CapturedStructure-style arrays and reports:
- walls;
- floors;
- doors;
- windows;
- openings;
- objects;
- sections;
- high/medium/low confidence counts;
- category counts;
- floor polygon point counts;
- metric bounds derived from RoomPlan dimensions/transforms when available.

Polycam floorplan filenames such as `original_floorplan.json`, `optimized_floorplan.json` and `edited_floorplan.json` are classified as Polycam evidence while still being normalized through the provider-neutral RoomPlan import path.

### Developer Mode/session archive inspection

The v1 ZIP path inventories the archive without decompressing/uploading it and reports:
- entry count;
- keyframe image count;
- likely depth/LiDAR entries;
- likely confidence entries;
- likely camera/intrinsic/extrinsic/pose entries;
- representative filenames.

A real Developer Mode package is still required before FormShift should add version-specific raw-data decoding.

### Comparison to current FormShift room

When a `SpatialSnapshot` is loaded, the lab compares imported metric bounds and semantic counts with the current FormShift boundary/object/opening state. The comparison is explicitly diagnostic and cannot adopt measurements automatically.

## Polycam reference benchmark decision

Polycam is now a **reference capture/reconstruction benchmark**, not a FormShift dependency.

Current public evidence used for the decision:
- Polycam Space Mode on LiDAR-enabled iOS can produce a detailed mesh plus 3D/2D floorplan outputs and measurements;
- Polycam Developer Mode enables raw data caching/export for Space/LiDAR captures when enabled before capture/reprocessing;
- Polycam artifacts/API documentation identifies glTF mesh artifacts and RoomPlan-derived floorplan JSON;
- GLB and USDZ are supported export formats;
- Polycam's Content Management API is an Enterprise add-on, so FormShift does not require it for normal import/reference workflows.

The working protocol is documented in `docs/POLYCAM-REFERENCE-BENCHMARK.md`.

### Architecture implication

Do not continue treating single-photo monocular depth as the preferred structural source on LiDAR-capable iPhones if direct RoomPlan/LiDAR evidence is available. The intended hierarchy is now:

```text
LiDAR-capable iPhone
→ RoomPlan/native structural capture preferred
→ provider-neutral imported spatial evidence accepted for comparison
→ single-photo depth remains fallback/augmentation

Non-LiDAR device
→ photo/multi-view capture
→ estimated scene evidence + explicit calibration
→ imported external mesh/floorplan evidence when user supplies it
```

A real Polycam export from the same reference room is the next evidence required before expanding the native RoomPlan module or demoting specific custom support heuristics.

## Spatial import validation evidence

Functional/documented exact head before this CURRENT-STATE update:

`74aa1f46dc2c0dd4c6c7a01559ea51f7eb9ae6f2`

Evidence:
- web Vercel preview `dpl_2CkDHZScGWDKcftwufXVK7QFKmjK` — **READY**;
- GitHub combined exact-head status — **Vercel web success + Vercel API success**;
- static export includes `/spatial-import`;
- repository structure verification — pass;
- security/RLS source verification — pass;
- domain tests — pass;
- Arrange/Safari regression suite — pass;
- scene/provider/persistence boundary suite — pass;
- Prepared Scene support/occlusion/quick-clean suite — pass;
- **spatial import glTF/GLB metric metadata fixture — pass**;
- **spatial import RoomPlan dimensions/transforms/counts fixture — pass**;
- **spatial import Polycam session.zip inventory fixture — pass**;
- **spatial import canonical comparison / mutation prohibition — pass**;
- **spatial import privacy boundary: no network upload / no canonical persistence — pass**;
- client TypeScript check — pass;
- web static export — pass.

The route itself remains authenticated/protected, so unauthenticated HTTP fetching correctly redirects through Vercel/AccessGate rather than exposing private app state.

## Physically validated Prepared Scene baseline

Current iPhone evidence still proves:
- Prepared Scene survives preview authentication;
- latest source photo remains authoritative;
- Safari uses the safe WASM perception path;
- DETR-backed discovery and detector-guided MediaPipe segmentation reach an interactive state;
- the automatic TV is a tight independent photographed-pixel layer and moves without Safari scroll takeover;
- broad unlabeled room-region masks are not auto-promoted;
- Depth Anything V2 Small executes locally on the physical iPhone;
- source-bound Prepared Scene persistence/restore works;
- immutable source photography and canonical measurements/spatial versions remain unchanged;
- the **ghost-resistant local quick clean plate physically removes the TV without leaving a recognizable duplicate TV, HP advertisement, logo, readable screen text, or screen image at the original wall location**.

The latest screenshot still shows mild reconstruction banding in the former TV region. That remains a visual-quality issue, but the prior blocking object-duplication/ghosting failure is physically closed for the local quick-clean path.

## Latest physical support evidence — 2026-08-23 15:48 local

The supplied iPhone screenshot shows:
- **1 editable object:** `tv`;
- selected TV expected support: **wall**;
- normalized relative nearness: **0.06**;
- Support assist: **on**;
- active support model: center **66%**, slope **4.7 points across the photo**, confidence **79%**, source **`hybrid`**;
- visible depth diagnostic: support **accepted**, strong **10/13**, coherent **10**, residual approximately **0.027**;
- the automatic TV has been moved away from its source wall location;
- the original TV region is visually free of recognizable TV/ad content.

### Interpretation

The room-wide-context rule materially improved cross-column coherence, but the **visible 66% line is still too low to be accepted as the wall/floor cutoff**. In the screenshot it tracks the foreground hardwood/rug/material region rather than the far wall/floor/baseboard transition. `hybrid` and 79% confidence are therefore **not treated as physical acceptance**.

The current depth selector now keeps multiple distinct nearward transitions per sampled column, clusters room-wide bands and prefers the earliest/uppermost coherent nearward band. Its stronger regression simulates a weaker true wall/floor band plus a later stronger full-width rug/floor band and requires the earlier band to win.

This implementation is build-validated but still requires a device re-run. More importantly, the Polycam benchmark now gives FormShift a stronger path than indefinite heuristic tuning if direct structural evidence is available.

## Existing Wave 3 safeguards retained

Still active:
- detector-guided connected-component MediaPipe masks;
- whole-room/oversized automatic-mask rejection;
- normalized relative-nearness convention (`0` farther → `1` nearer);
- explicit detector/depth acceptance and merge diagnostics;
- conservative destination-depth occlusion after drag release;
- original Prepared Scene object masks excluded from the source occluder field;
- deterministic quick clean plate using only unmasked source pixels;
- bounded/feathered explicit AI background repair;
- anti-ghost Prepared Scene repair prompt v1.1.0;
- Prepared Scene cache schema **`prepared-scene-1.3`**;
- source-photo-specific private persistence;
- fail-closed preview validation;
- no canonical measurement/spatial mutation from photo perception;
- no canonical measurement/spatial mutation from spatial imports;
- no physics.

## Model/provider evaluation boundary

No new semantic-segmentation model was added in this cycle. A browser semantic surface model remains attractive, but FormShift will not make a commercially ambiguous or mobile-heavy model part of the default architecture merely to improve one room.

Polycam is likewise not admitted as a required paid service. Its manual/exportable formats are sufficient for the clean-room benchmark; an Enterprise API integration would be justified only if it later removes meaningful workflow burden without creating strategic dependence.

## Immediate next evidence

### A. Polycam reference capture

For the same room currently used in Prepared Scene:
1. Enable Polycam Developer Mode **before** capture if raw evidence will be exported.
2. Capture the room with Space Mode or Floorplan Mode on the LiDAR iPhone.
3. Preserve the unedited first result.
4. Export, in priority order:
   - `original_floorplan.json` or equivalent structured floorplan JSON;
   - GLB or `original.gltf` (and companion geometry/textures if using glTF);
   - `session.zip` / raw Developer Mode package if available.
5. Open `/spatial-import` and inspect the JSON first. Copy the report JSON or provide the source export for deeper analysis.

The first real package should answer whether direct RoomPlan-derived wall/floor/opening geometry makes the current monocular support-boundary work unnecessary on LiDAR devices.

### B. Prepared Scene regression check

The Prepared Scene support selector still needs one physical re-run after the earliest-coherent-band change. A correct fail-closed/detector-only result is preferable to a confidently wrong hybrid.

## Not yet claimed

- real Polycam export compatibility beyond deterministic clean-room fixtures;
- raw Polycam Developer Mode file decoding beyond ZIP inventory;
- automatic import-to-canonical adoption;
- Polycam API integration;
- physical-device acceptance of the earliest-coherent support-band selector;
- physical-device acceptance of Support Assist drag on/off/re-enable correction;
- physical acceptance of destination occlusion;
- physical acceptance of AI-repaired background quality for the current generation;
- production RoomPlan capture/normalization;
- calibrated camera intrinsics / vanishing points;
- calibrated wall/floor planes;
- metric depth from the single-photo pipeline;
- production-quality automatic household-object coverage;
- automatic person/furniture pixel separation rather than safe deferral;
- physically correct contact shadows/relighting;
- gravity / rigid-body physics;
- Prepared Scene scale/rotate controls.

## Next decision

Do **not** add Rapier/RealityKit physics yet and do not continue tuning monocular support heuristics indefinitely.

The next decisive engineering input is a real Polycam/RoomPlan-derived capture of the same room. If that package provides stable floor/wall/opening geometry and metric transforms, FormShift should accelerate the native RoomPlan adapter and demote monocular floor-boundary inference to a non-LiDAR fallback. If the external data is insufficient or inconsistent, use the new import report to identify exactly which calibration evidence still must be captured by FormShift itself.

## Authoritative record impact

- `CURRENT-STATE.md`: revision **0.9.26** records the build-validated Spatial Import Lab, clean-room Polycam benchmark, exact-head validation evidence and the new external-evidence decision boundary.
- `ARCHITECTURE.md`: requires revision because provider-neutral spatial import/evidence comparison is now a durable architecture capability.
- `DESIGN-SYSTEM.md`: unchanged; the Spatial Import Lab is a diagnostic/internal workflow and does not change the consumer visual system.
- `PROJECT-CONSTITUTION.md`: unchanged; source primacy, privacy, provenance, reversibility and canonical-spatial-truth invariants already require imported evidence to remain non-authoritative until explicitly adopted.
