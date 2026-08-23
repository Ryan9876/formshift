# Polycam Reference Benchmark

**Status:** Reference/benchmark workflow only  
**Date:** 2026-08-23  
**FormShift dependency:** None

## Purpose

Polycam is a reference implementation for mature room/object capture and spatial reconstruction. FormShift uses it to determine which capture/reconstruction capabilities should be obtained from established platform/format boundaries rather than reimplemented with increasingly complex photo heuristics.

This is a clean-room benchmark. FormShift does not decompile Polycam, extract proprietary code/models/secrets, bypass access controls, or make Polycam a required runtime service.

## Public capability facts used by this benchmark

Official Polycam documentation currently states:

- Space Mode on LiDAR-enabled iOS devices can generate a detailed LiDAR mesh, clean 3D floorplan model, and measured 2D floorplan from one session. Non-LiDAR Space Mode produces a mesh without LiDAR floorplan generation.
- Developer Mode on iOS enables caching/export of raw data for Space and LiDAR captures and must be enabled before collecting/reprocessing the capture.
- Content/API artifacts include `original.gltf`, optional edited glTF, geometry binaries, textures, and RoomPlan-derived floorplan JSON artifacts such as `original_floorplan.json`.
- Supported API conversion formats include GLB and USDZ as well as OBJ/FBX/STL/DAE and point-cloud formats.
- The Content Management API is an Enterprise add-on and is therefore **not** required by FormShift's import architecture.

Reference pages:
- https://learn.poly.cam/hc/en-us/articles/48565771018772-Which-Capture-Mode-Should-I-Use
- https://learn.poly.cam/hc/en-us/articles/34295907278996-How-to-Access-Developer-Mode
- https://poly.cam/docs/api

## Reference-room protocol

Use the same physical room and, when practical, the same phone position/lighting as the current FormShift Prepared Scene test.

### Capture A — structure

1. On a LiDAR-equipped iPhone, enable Polycam Developer Mode **before** the scan if raw evidence will be compared.
2. Capture the room in Space Mode or Floorplan Mode.
3. Do not manually edit room geometry before the first export; retain an unedited reference package.
4. Export, in priority order:
   - `original_floorplan.json` or equivalent RoomPlan-derived structured JSON;
   - GLB or `original.gltf` plus its referenced geometry/textures;
   - `session.zip` / Developer Mode raw package when available.

### Capture B — object reference

If an individual furniture/object capture is useful for later FormShift object-placement work, capture it separately with Polycam Object Mode or another exportable 3D workflow. Keep this separate from the room-structure benchmark so room geometry and object appearance are not conflated.

## FormShift Spatial Import Lab

Preview route:

`/spatial-import`

The v1 lab performs local browser inspection only.

Supported evidence:
- `.json`: detects RoomPlan/CapturedRoom-style structure and reports walls/floors/doors/windows/openings/objects, confidence/category counts, transforms/dimensions and metric bounds when available;
- `.gltf`: inspects scene/mesh/node/material/image metadata, POSITION accessor counts and metric bounds from accessor min/max plus node transforms when available;
- `.glb`: reads the embedded glTF JSON chunk and performs the same metadata inspection;
- `.zip`: inventories the central directory and counts likely keyframe/depth/confidence/camera/pose evidence without decompressing or uploading the archive.

The lab compares imported metric bounds/object/opening counts with the currently loaded FormShift `SpatialSnapshot` when one exists.

## Authority rule

All imported material is **evidence**, never automatic canonical truth.

```text
Polycam / RoomPlan / glTF / GLB / raw archive
                 ↓
        SpatialImportEvidence
                 ↓
       diagnostic comparison
                 ↓
        human/provider review
                 ↓
     explicit future adoption step
                 ↓
      canonical SpatialSnapshot
```

The v1 Spatial Import Lab has no persistence/mutation authority. It does not call Supabase, upload the imported file, update measurements, create spatial versions, or overwrite source imagery.

## What the first real export should answer

1. Does Polycam's RoomPlan-derived JSON place the far wall/floor boundary where FormShift's monocular support estimate struggles?
2. What room dimensions, wall transforms, openings, floor polygons, object boxes and confidence levels are available directly?
3. How closely do Polycam metric bounds match FormShift's current canonical/manual room dimensions?
4. Does the glTF/GLB scene preserve useful scale/orientation consistently with the RoomPlan JSON?
5. Which raw Developer Mode evidence classes exist in the actual session package (keyframe images, depth, confidence, camera intrinsics/poses, mesh/other metadata)?
6. Which FormShift custom algorithms can be removed or demoted to fallback once RoomPlan/import evidence is available?

## Decision rules after first export

- **If RoomPlan JSON provides reliable walls/floors/openings:** make RoomPlan/native structural evidence the preferred LiDAR path and stop trying to infer those surfaces from a single photo on supported iPhones.
- **If GLB/glTF scale and orientation are stable:** use the generic spatial-import boundary for external mesh/reference imports; do not add a Polycam-specific renderer.
- **If raw camera/depth evidence materially improves photo projection/occlusion:** extend the provider-neutral import contract for those artifacts after inspecting the actual versioned package.
- **If a field is ambiguous or unstable:** preserve it as imported evidence, not a canonical measurement.
- **If Polycam API access would only automate downloading files:** keep it optional. Manual/local export remains the baseline so FormShift is not commercially dependent on an Enterprise add-on.

## Out of scope for this benchmark

- copying Polycam proprietary algorithms or UI;
- reverse engineering protected binaries;
- bypassing subscriptions/access controls;
- making Polycam credentials or API access part of normal FormShift operation;
- adopting imported measurements without provenance/review;
- replacing FormShift's Organize/Arrange/Build product logic with a scanner product.
