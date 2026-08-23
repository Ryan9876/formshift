# FormShift Current State

**Revision:** 0.9.18  
**Date:** 2026-08-22  
**Milestone:** Prepared Scene feasibility and source-bound restore are physically proven on iPhone; the perspective-support / stricter mask-safety candidate is build-validated and has partial screenshot acceptance, with drag-constraint behavior still awaiting direct physical confirmation

FormShift is a **photo-first spatial augmentation product**. The real captured room image is the primary canvas; structured geometry remains the hidden authority. Plan/rectangle views remain secondary technical verification surfaces.

## Production boundary

Production web remains on the validated Photo Arrange v2.2 baseline. Prepared Scene has **not** been promoted to production.

A backward-compatible production API-only hotfix on `main` allows authenticated FormShift branch previews to use the image service while preserving bearer identity and project/space edit authorization. Prepared Scene repair is opt-in through `mode: 'prepared-scene'`; existing single-object Photo Arrange repair remains the default.

Production API deployment `dpl_3nQ1HZ2DTFPLrt3nLwXKKPKoCD3C` remains READY.

## Physically validated Prepared Scene baseline

Physical iPhone testing proves the complete feasibility loop:

```text
source photo
→ detector-backed object discovery
→ MediaPipe mask/cutout
→ independent photographed-pixel movement
→ Depth Anything enrichment
→ explicit GPT Image masked background repair
→ private source-bound persistence
→ refresh
→ cached scene restore
```

Validated evidence includes:

- Prepared Scene route survives preview authentication;
- newest source photo remains active and cannot be replaced by an arrangement from an older source asset;
- Safari-safe WASM inference avoids the prior ONNX WebGPU initialization failure;
- broad unlabeled room-region masks were removed from automatic object creation;
- corrected `prepared-scene-1.1` run automatically detected TV at **0.9839** confidence and couch at **0.9712** confidence;
- TV moved as an independent photographed-pixel layer;
- Depth Anything V2 Small completed through Safari-safe WASM in **6,396 ms**;
- GPT Image 2 Prepared Scene background repair completed successfully with server-recorded latency **27,148 ms**;
- repaired background persisted as private derived state;
- subsequent iPhone refresh restored the prepared scene instead of rerunning DETR/Depth Anything;
- restored scene retained saved transforms and repaired-background lineage.

## Partial physical acceptance from latest support screenshot

The latest iPhone screenshot confirms several useful behaviors, but it is **not sufficient evidence for drag-constraint mechanics**.

Confirmed from the screenshot:

- the support-aware candidate loads successfully on iPhone Safari;
- only **1 reliable automatic object** is prepared;
- the prior couch/person composite is not present as an automatic movable layer in this view;
- the TV remains the reliable detector-backed object;
- **Support assist on** is active;
- the Estimated floor region diagnostic is visible;
- the current room does not provide enough visible safe anchors to demonstrate a perspective slope, so the displayed support guide is the conservative horizontal fallback.

Not confirmed by this still image:

- that dragging the TV downward is actually stopped at the support boundary;
- Support assist off → free placement;
- re-enabling Support assist → automatic correction of an unsupported placement;
- x-dependent support behavior under drag;
- page scrolling returns normally after object drag release;
- manual Add missed object save/restore.

The selected TV preparation also appears visually loose around its upper boundary. Treat this as a segmentation-quality signal to verify on-device rather than assuming the mask is production-clean.

## Perspective support / stronger separation candidate — implemented

Branch: `scene-foundation-v1`  
Functional head: `7349285dca3559e9a5c04fa08d633cad9fa064ae`

The candidate moves the support layer from one horizontal screen-space threshold toward a bounded projected estimate.

### Perspective-aware estimated support

`PreparedSupportModel` carries:

- `floorRegionStartY`: floor/wall transition at image center;
- `floorBoundarySlope`: bounded left-to-right change in the estimated transition;
- confidence;
- provenance: detector anchors / restored object anchors / fallback.

When at least two credible floor-supported anchors span enough horizontal image distance, FormShift fits a bounded linear floor/wall transition. Placement uses the boundary at the object's **current x position**, so the allowable floor/wall region can change across the photograph rather than behaving as one universal horizontal cutoff.

If evidence is insufficient, slope remains zero and the previous conservative horizontal estimate is retained. This is still **Estimated augmentation**, not calibrated room geometry.

### Stronger automatic-object safety

Automatic object acceptance is intentionally conservative:

- candidate/person overlap rejection is more conservative;
- person-center/candidate-center containment also defers the object;
- automatic MediaPipe masks must agree with detector geometry;
- masks with excessive pixels outside the detector region are rejected;
- automatic masks larger than roughly 2× detector-box area are rejected;
- room-scale/whole-room masks cannot pass merely because they contain the detector box;
- person-overlapped furniture remains conservatively deferred rather than moving human pixels.

This favors fewer safe automatic layers over aggressive object count.

### Movement-aware prepared-layer depth

Prepared-layer ordering combines source relative depth with a bounded movement-derived depth offset. Moving a prepared layer lower in the image can move it toward the viewer in the **estimated prepared-layer ordering**, rather than leaving its z-order frozen to the source position.

This is not yet full source-scene occlusion. Unprepared foreground geometry is not yet clipping moved layers.

### Cache generation

Prepared Scene cache generation is:

`prepared-scene-1.2`

The prior `prepared-scene-1.1` artifacts remain immutable historical derived data but are intentionally not eligible for the new perspective-support restore path. The first load of this candidate performs one fresh preparation for the same immutable source photo; subsequent `1.2` saves may restore normally.

No database schema migration was needed; generation is carried in the existing derived Prepared Scene record.

## Integrity / privacy boundary

Prepared Scene remains derived-only:

- immutable source photo is never overwritten;
- source-photo identity remains explicit;
- Prepared Scene restore remains exact-`source_asset_id` bound;
- masks/cutouts/backgrounds remain private derived assets;
- generated repair pixels are accepted only inside the accepted mask union;
- no `measurement_observations`, canonical spatial versions, or verified dimensions are changed by support/depth estimates;
- support projection is reversible and can be disabled for comparison;
- physics remains off.

## Validation evidence for perspective candidate

Focused regression coverage checks:

- semantic floor/wall support classification;
- multi-anchor perspective slope estimation;
- x-dependent floor-boundary evaluation;
- person/furniture overlap deferral;
- detector/mask geometric agreement;
- whole-room/oversized-mask rejection;
- x-dependent floor-object support constraint;
- x-dependent wall-object support ceiling;
- reversible support-assist disable behavior;
- movement-aware relative-depth ordering.

The focused projection/mask regression suite passed locally against the exact support implementation now on the branch.

Exact-head Vercel evidence:

- web deployment `dpl_UYbAUiXw1WrgtzRnArbT1RSrrQtN` — **READY**;
- exact web commit `7349285dca3559e9a5c04fa08d633cad9fa064ae`;
- `/arrange-prepared` exported successfully;
- latest unchanged API implementation on commit `21037d922647b927ca485a75752a744de8d8e631` is READY as deployment `dpl_36UNQSZAVL7xSECjDXXJMzhQe2go`;
- the redundant API deployment triggered by the final client-only mask-threshold commit was canceled by Vercel; no API code changed in that commit.

GitHub Actions workflow visibility through the connected GitHub interface is not returning a workflow-run record for the exact head. Therefore this revision does **not** claim an exact-head GitHub Actions pass. The preview build and focused regression are validated.

## Immediate physical-device acceptance

Use the stable branch `/arrange-prepared` route.

1. With **Support assist on**, drag the selected TV straight downward until your finger is clearly below the dashed Estimated floor region. Confirm the TV itself stops above the permitted wall/floor boundary.
2. Turn **Support assist off** and repeat. Confirm the TV can now be moved below that boundary.
3. Leave the TV in an unsupported position, turn Support assist back on, and confirm it is corrected.
4. Drag the TV left/right while pressing downward. If the room has enough support anchors, inspect whether the permitted boundary changes plausibly across x; on this current one-object scene a horizontal fallback is expected.
5. Release the TV and verify normal Safari page scrolling immediately returns.
6. Save changes, refresh, and confirm `prepared-scene-1.2` restores without detector/depth rerun.
7. Inspect the TV cutout boundary closely, especially above the screen, for captured wall/decor pixels.

## Current limitations / not yet claimed

- calibrated camera intrinsics / vanishing-point solution;
- calibrated floor/wall plane geometry;
- metric depth;
- full destination-depth sampling;
- full source-scene occlusion against unprepared foreground geometry;
- automatic person/furniture pixel separation (currently safe deferral);
- comprehensive/open-vocabulary household-object recognition;
- production-clean automatic masks;
- gravity / rigid-body physics;
- production RoomPlan capture/normalization;
- Prepared Scene scale/rotate controls.

## Next decision

The screenshot indicates the current bottleneck is now **scene understanding quality**, not persistence or physics. If the direct drag test confirms support mechanics, retain this support assist as the reversible pre-calibration fallback but do not deepen the heuristic.

The next implementation target should be a stronger room-surface/object perception layer that can identify floor/wall/support evidence independently of a sparse set of safely movable objects, plus stronger segmentation/refinement for object boundaries. Source-scene occlusion should follow. Persist calibrated floor/support surfaces only after a real calibration source exists. Rapier/RealityKit physics remains after that boundary, not before it.

## Authoritative record impact

- `CURRENT-STATE.md`: revision 0.9.18 corrects the physical-acceptance boundary so the support screenshot is not overstated as proof of drag constraint behavior.
- `ARCHITECTURE.md`: remains revision 0.5.4; no calibrated support or physics architecture is claimed.
- `DESIGN-SYSTEM.md`: unchanged; existing Estimated augmentation and reversible-assist rules already govern this preview behavior.
- `PROJECT-CONSTITUTION.md`: unchanged; immutable source, privacy, provenance, reversibility, and canonical-spatial-truth rules remain intact.
