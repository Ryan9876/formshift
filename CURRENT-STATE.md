# FormShift Current State

**Revision:** 0.9.20  
**Date:** 2026-08-23  
**Milestone:** Prepared Scene feasibility/restore is physically proven; Wave 3 room-perception hardening is exact-head build-validated and now has first iPhone screenshot evidence, with direct support-drag and depth-provenance acceptance still open

FormShift is a **photo-first spatial augmentation product**. The real captured room image is the primary canvas; structured geometry remains the hidden authority. Plan/rectangle views remain secondary technical verification surfaces.

## Production boundary

Production web remains on the validated Photo Arrange v2.2 baseline. Prepared Scene has **not** been promoted to production.

The existing backward-compatible production API hotfix on `main` continues to allow authenticated FormShift branch previews to use the image service while preserving bearer identity and project/space edit authorization. Prepared Scene repair remains opt-in through `mode: 'prepared-scene'`; existing single-object Photo Arrange repair remains the default.

No production merge, web promotion, database mutation, credential change, or physics integration occurred in this Wave 3 cycle.

## Physically validated baseline retained

Prior iPhone testing already proves:

```text
source photo
→ detector-backed discovery
→ MediaPipe mask/cutout
→ independent photographed-pixel movement
→ Depth Anything enrichment
→ explicit GPT Image masked background repair
→ private source-bound persistence
→ refresh
→ cached scene restore
```

Validated device evidence remains:
- Prepared Scene route survives preview authentication;
- latest source photo remains authoritative;
- Safari uses the safe WASM perception path;
- broad unlabeled room-region masks are not auto-promoted;
- TV can move independently;
- person-overlapped couch is conservatively deferred in the current room;
- explicit GPT Image background repair succeeds and persists;
- source-bound cache restores without rerunning full perception;
- immutable source photography and canonical measurements/spatial versions remain unchanged.

A still screenshot does **not** prove support drag mechanics; Support assist on/off and correction behavior still require direct interaction evidence.

## First Wave 3 iPhone screenshot evidence — 2026-08-23

The first screenshot from the documented Wave 3 preview confirms the new candidate is rendering successfully in iPhone Safari after the fail-closed build gate.

Confirmed from the screenshot:
- `Prepared Scene v1` is loaded on the branch preview;
- **Support assist on** is active;
- the Estimated floor region diagnostic is rendered across the real room photo;
- the visible support boundary is currently effectively horizontal in this scene;
- **Add missed object** completed successfully and returned the status `Object added and ready to move`;
- a manually added small wall-photo/art object is selected as an independent layer with a compact cyan selection box;
- the selected manual object does not visually encompass the TV or the broader wall region;
- the room photo remains visible and undimmed beneath the derived layer.

This is useful evidence for the manual correction path and scene rendering, but it is **not** yet acceptance of the Wave 3 automatic TV-mask improvement because the TV is not selected in this screenshot. It also does not reveal the diagnostic provenance text below the image, so this screenshot cannot establish whether support evidence is `depth-profile`, `hybrid`, detector-only, or fallback.

The displayed floor boundary is visually plausible relative to the visible floor/baseboard transition, but a still image cannot validate whether the TV is actually constrained against it during drag.

## Wave 3 implementation — room perception and autonomous gates

Branch: `scene-foundation-v1`  
Pre-cycle rollback branch: `scene-foundation-v1-wave3-backup` at `8dde6e0e1a5873c169ec955b83bb986afde636c9`.

### 1. Independent depth-derived support evidence

Depth Anything V2 Small now contributes more than per-object relative depth. FormShift samples the bounded lower/middle depth field across 13 image columns, finds robust vertical depth transitions, rejects incoherent/outlier profiles, fits a bounded x-dependent transition, and assigns bounded confidence.

Support provenance is explicit:
- `detector-anchors`
- `object-anchors`
- `depth-profile`
- `hybrid`
- `fallback`

Detector/object contact evidence and depth-profile evidence are merged only when confidence/disagreement rules permit it. Large disagreement does not manufacture a higher-confidence hybrid. All results remain **Estimated augmentation** and never become verified room geometry.

`SUPPORT_MODEL_VERSION` is now **2**, forcing prior support-v1 Prepared Scene caches to be rebuilt/refined before they are treated as current support evidence. The Prepared Scene storage schema remains `prepared-scene-1.2`; no database migration was required.

### 2. Detector-guided connected-component masks

The automatic Prepared Scene MediaPipe path now receives the detector bounding box as a guide. Instead of accepting the raw interactive mask, it:
- restricts analysis to an expanded detector envelope;
- identifies connected candidate mask components;
- scores them by detector overlap, relative size and seed distance;
- keeps the best bounded component plus immediate soft-edge pixels;
- then applies the existing detector/mask agreement gate.

Manual **Add missed object** remains unguided because no trusted detector box exists for that correction path.

This specifically targets the loose TV mask observed above/around the screen while preserving conservative person/furniture deferral and whole-room-mask rejection.

### 3. Bounded inference/stall recovery

Both browser-local heavy providers now have explicit ceilings:
- detector model initialization: 45 seconds;
- detector inference: 30 seconds;
- depth model initialization: 45 seconds;
- depth inference: 30 seconds.

A detector timeout/failure no longer requires waiting indefinitely; Prepared Scene can fall back to the manual correction path. A depth timeout/failure does not block object manipulation.

Safari/WebKit remains pinned to conservative ONNX WASM; other browsers may attempt WebGPU and fall back to WASM.

### 4. Perspective diagnostic uses actual support model

The Estimated floor region diagnostic is now rendered as the support model's x-dependent line rather than a hard-coded horizontal border. It remains explicitly estimated. If the room provides insufficient coherent evidence, the line may correctly remain horizontal.

Diagnostics expose center boundary, slope, confidence, and support provenance so device evaluation can distinguish detector-only, depth-only, hybrid and fallback behavior.

### 5. Wave 3 fail-closed preview gate

The web preview no longer treats a successful Metro bundle as sufficient release evidence.

`@formshift/client export:web` now runs, before Expo export:
- repository structure verification;
- security/RLS source verification;
- domain tests;
- canonical Arrange/Safari regression guards;
- scene/provider/persistence boundary guards;
- Prepared Scene depth/support/mask regressions;
- client TypeScript check.

If any of those fail, the Vercel web preview cannot become READY.

The separate API Vercel project must independently build READY. GitHub CI retains the full API typecheck in its root-workspace environment, where API dependencies are installed. The web-project install does not include API-only `ai`/`zod` dependencies, so API typecheck is intentionally not duplicated inside the web deployment environment.

## Wave 3 validation/correction evidence

The new gate caught and corrected multiple issues that the old web bundle did not surface:

1. exact Node regression execution initially failed on an extensionless TypeScript module import;
2. after that correction, TypeScript 6 caught the refined-mask typed-array buffer contract;
3. the first cross-project web gate incorrectly attempted API typechecking without API workspace dependencies; the gate was split by deployment responsibility rather than disabling API validation.

Current functional exact head before documentation: `62676ca8e8158273b74be6ad727d3bdc24481f25`.

Exact-head evidence:
- documented branch head `77698e3b1f81e9a5cf16ba2f35753d1ab50daf72` reached READY after running the enforced web gate;
- web Vercel deployment `dpl_4bJ88xzeGLYF2nmgdB1LzYPSqy9e` — **READY**;
- API Vercel status on the same documented head — **success**;
- repository structure verification — pass;
- security verification — pass;
- domain test suite — pass;
- Arrange/Safari regression suite — pass;
- scene boundary suite — pass;
- depth-derived support / perspective / person-overlap / mask-safety / movement-aware-depth suite — pass;
- client TypeScript check — pass;
- `/arrange-prepared` static export — pass.

GitHub Actions workflow-run discovery through the connected GitHub interface remains incomplete, so no separate Actions-run claim is made. The enforced Vercel web gate provides exact-head execution evidence for the web-owned checks above.

## Commercial model-license boundary

A browser semantic-segmentation candidate was evaluated during this cycle but not adopted because its model license is not sufficiently clear for the commercial foundation. FormShift will not add a model merely because its code is publicly downloadable. The current cycle instead reuses Depth Anything V2 Small plus MediaPipe/DETR behind the existing provider boundaries.

## Integrity / privacy boundary

Prepared Scene remains derived-only:
- immutable source photo is never overwritten;
- restore remains exact-`source_asset_id` bound;
- masks/cutouts/backgrounds remain private derived assets;
- generated repair pixels remain mask-bounded;
- no `measurement_observations`, canonical spatial versions, or verified dimensions are changed by depth/support estimates;
- Support assist remains reversible;
- physics remains off.

## Immediate physical-device acceptance

Use the stable branch `/arrange-prepared` route.

1. Scroll below the room image and capture the diagnostic text showing **Support assist: ... center boundary ... slope ... confidence ... source**. This resolves whether the new depth-profile/hybrid support evidence is active in this room.
2. Select the **TV** automatic layer rather than the manually added wall-photo/art object and capture one screenshot. Inspect the TV cutout closely, especially above and around its screen, to judge whether detector-guided component refinement reduced captured wall/decor pixels.
3. With **Support assist on**, drag the selected TV straight downward until the finger is clearly below the displayed Estimated floor region. Confirm the TV itself stops at the permitted wall boundary.
4. Turn **Support assist off** and repeat. Confirm free placement returns.
5. Leave the TV below the boundary, re-enable Support assist, and confirm it is corrected.
6. If a non-zero slope is reported, drag the TV left/right while pressing downward and inspect whether its permitted region tracks the displayed line.
7. Save changes, refresh, and confirm the support-model-v2 scene restores without unnecessarily rerunning detector work.
8. Verify normal Safari page scrolling returns immediately after object drag release.

## Not yet claimed

- calibrated camera intrinsics / vanishing-point solution;
- calibrated floor/wall planes;
- metric depth;
- production-quality automatic household-object coverage;
- automatic person/furniture pixel separation rather than safe deferral;
- full source-scene occlusion against unprepared foreground geometry;
- physically correct contact shadows/relighting;
- gravity / rigid-body physics;
- production RoomPlan capture/normalization;
- Prepared Scene scale/rotate controls;
- physical-device acceptance of the new automatic TV mask, depth-profile/hybrid support provenance, or support-drag constraint behavior.

## Next decision

Do **not** add Rapier/RealityKit physics yet. The first Wave 3 screenshot confirms the new candidate is functioning on iPhone and that manual object correction remains usable. The remaining acceptance target is now narrow: automatic TV-mask quality, support provenance, and actual support-drag behavior. If those pass, the next engineering slice is source-scene occlusion/destination-depth behavior and broader commercially-cleared object discovery. Calibrated floor/support persistence follows only when a real calibration source exists; physics follows reliable collision/support geometry.

## Authoritative record impact

- `CURRENT-STATE.md`: revision **0.9.20** records the first Wave 3 iPhone screenshot evidence and narrows the remaining physical acceptance steps.
- `ARCHITECTURE.md`: remains revision **0.5.5**; no new durable architecture decision was introduced by this screenshot.
- `DESIGN-SYSTEM.md`: unchanged; existing Estimated augmentation, diagnostic confidence, and reversible-assist rules already govern this behavior.
- `PROJECT-CONSTITUTION.md`: unchanged; immutable source, privacy, provenance, reversibility, and canonical-spatial-truth rules remain intact.
