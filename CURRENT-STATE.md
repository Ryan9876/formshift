# FormShift Current State

**Revision:** 0.9.16  
**Date:** 2026-08-22  
**Milestone:** Prepared Scene detect → segment → move → repair → persist → refresh → restore loop is physically proven on iPhone; next support/mask-safety slice is implemented on the preview branch and awaiting device validation

FormShift is a **photo-first spatial augmentation product**. The real captured room image is the primary canvas; structured geometry remains the hidden authority. Plan/rectangle views remain secondary technical verification surfaces.

## Production boundary

Production web remains on the validated Photo Arrange v2.2 baseline. Prepared Scene has **not** been promoted to production.

A backward-compatible production API-only hotfix on `main` allows authenticated FormShift branch previews to use the image service while preserving bearer identity and project/space edit authorization. Prepared Scene repair is opt-in through `mode: 'prepared-scene'`; existing single-object Photo Arrange repair remains the default.

Production API deployment `dpl_3nQ1HZ2DTFPLrt3nLwXKKPKoCD3C` is READY.

## Physically validated Prepared Scene baseline

Physical iPhone testing on 2026-08-22 now proves the complete feasibility loop:

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
- restored scene retained saved TV/couch transforms and AI-repaired background lineage.

The refresh session created a new derived row with `discovery: null` and `depth: null`, confirming that cached assets/state were restored instead of reprocessed.

## Product-quality findings from the restore screenshot

The restored screenshot exposed two important problems that are now higher priority than adding more object classes:

1. **Support is known semantically but not enforced.** The TV is classified as wall-supported and the couch as floor-supported, yet both could be moved to implausible unsupported positions.
2. **Person/furniture separation is unsafe.** The couch candidate's segmentation included the seated person/chair region, so moving the couch duplicated/moved human pixels with furniture.

These are scene-quality problems, not persistence failures.

## Next support/mask-safety candidate — implemented, device validation pending

Branch: `scene-foundation-v1`  
Implementation commit: `f7a78c904005d7a43641b4e7c93e2f11e8659b6d`

The candidate adds a derived **Estimated support assist** without claiming calibrated geometry:

- derives an estimated floor-region boundary from detector-backed floor-object contact anchors;
- falls back to persisted object anchors or a conservative default when detector evidence is unavailable;
- constrains floor-supported objects so their lower edge remains in the estimated floor region;
- constrains wall-supported objects above the estimated wall/floor transition;
- keeps support assist explicitly switchable on/off for comparison and reversibility;
- shows an **Estimated floor region** guide while the assist is active;
- persists support-model provenance/confidence in Prepared Scene provider metadata;
- does not write canonical measurements or spatial versions.

Mask/object safety is tightened:

- automatic masks must geometrically agree with their detector candidate;
- automatic furniture/object candidates overlapping a detected person are deferred instead of being auto-moved with human pixels;
- manually added objects remain available for unsupported classes;
- the old `prepared-scene-1.1` cache remains historical, but restore now also requires `supportModelVersion: 1`, forcing one fresh safe preparation before the new behavior becomes cacheable.

Prepared-layer ordering is also improved:

- when relative depth exists, prepared object layers sort by Depth Anything evidence rather than only vertical screen position;
- vertical screen position remains the fallback ordering signal;
- this is still **estimated layer ordering**, not calibrated source-scene occlusion.

The implementation also blocks object manipulation while a save or background repair is actively committing, removing the previously identified stale-transform race during asynchronous persistence.

## Persistence and privacy foundation

Supabase `prepared_scenes` support remains deployed with RLS and private storage. Prepared Scene stores source-bound derived versions containing private mask/cutout/background asset lineage, object transforms, background quality, provider/model metadata and creator/timestamps.

Prepared Scene does **not** write `measurement_observations`, `spatial_versions`, or canonical geometry, and never overwrites the immutable room photo.

Generated background pixels are accepted only inside the expanded union of accepted object masks; unmasked room pixels remain source-photo pixels.

## Current validation boundary

The support/mask-safety code is present on the preview branch and the matching Vercel preview build has begun. Full CI/device validation is still pending at this revision.

Do not claim the following until the new preview passes CI and a physical iPhone test:

- person-overlapped couch is actually deferred on the current room photo;
- wall TV can no longer be dragged down onto the floor with support assist enabled;
- floor-supported furniture can no longer float high on a wall;
- support-assist toggle behaves correctly on Safari;
- estimated depth ordering improves overlap behavior without regressions.

## Next physical-device acceptance

Use the stable branch `/arrange-prepared` route after the new preview reaches READY.

Test in this order:

1. hard refresh once; the prior cache should be bypassed because it lacks `supportModelVersion: 1`;
2. allow one fresh detector-backed preparation;
3. confirm the couch/person combination is **not** automatically prepared if the detector reports person overlap;
4. confirm the TV remains available as a detector-backed object;
5. with **Support assist on**, drag the TV downward and confirm it stops before entering the floor region;
6. if a clean floor-supported object is available, drag it upward and confirm it cannot float high on the wall;
7. toggle **Support assist off** and confirm free placement returns;
8. toggle it back on and confirm unsupported placements are corrected;
9. save and refresh; confirm the new support-aware package restores without rerunning object discovery;
10. verify Safari object drag still owns the gesture and ordinary page scrolling returns after release.

## Current limitations / not yet claimed

- comprehensive/open-vocabulary household-object recognition;
- automatic couch/person separation rather than conservative deferral;
- perfect automatic masks;
- persisted calibrated floor/wall planes;
- metric depth;
- calibrated destination-depth sampling;
- full source-scene occlusion against unprepared foreground geometry;
- gravity / rigid-body physics;
- production RoomPlan capture/normalization;
- Prepared Scene scale/rotate controls.

## Next decision

If the support/mask-safety candidate passes iPhone acceptance, keep it as the pre-physics constraint layer and move next to a stronger open-vocabulary detector / segmentation refinement provider. After object identity and mask quality improve, persist calibrated floor/support surfaces and destination depth; only then introduce Rapier/RealityKit physics.

## Authoritative record impact

- `CURRENT-STATE.md`: revision 0.9.16 records the physically validated refresh/restore loop and the implemented-but-unvalidated support/mask-safety candidate.
- `ARCHITECTURE.md`: remains 0.5.4 until the support-assist candidate passes validation; no calibrated support/physics architecture is claimed yet.
- `DESIGN-SYSTEM.md`: unchanged; existing Estimated augmentation and reversible-assist rules already govern this preview behavior.
- `PROJECT-CONSTITUTION.md`: unchanged; immutable source, privacy, provenance, reversibility, and canonical-spatial-truth rules remain intact.
