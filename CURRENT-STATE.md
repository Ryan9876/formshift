# FormShift Current State

**Revision:** 0.9.25  
**Date:** 2026-08-23  
**Milestone:** Wave 3 physically passes ghost-resistant local source removal; the latest iPhone run exposed a second coherent foreground depth band, and the support selector now prefers the earliest coherent room-wide nearward band with exact-head validation complete and device acceptance pending

FormShift is a **photo-first spatial augmentation product**. The real captured room image is the primary canvas; structured geometry remains the hidden authority. Plan/rectangle views remain secondary technical verification surfaces.

## Production boundary

Production web remains on the validated Photo Arrange v2.2 baseline. Prepared Scene has **not** been promoted to production.

No production merge, web promotion, database migration, credential change, or physics integration occurred in this Wave 3 continuation.

## Physically validated baseline

Current iPhone evidence proves:
- Prepared Scene survives preview authentication;
- latest source photo remains authoritative;
- Safari uses the safe WASM perception path;
- DETR-backed discovery and detector-guided MediaPipe segmentation reach an interactive state;
- the automatic TV is a tight independent photographed-pixel layer and moves without Safari scroll takeover;
- broad unlabeled room-region masks are not auto-promoted;
- Depth Anything V2 Small executes locally on the physical iPhone;
- source-bound Prepared Scene persistence/restore works;
- immutable source photography and canonical measurements/spatial versions remain unchanged;
- the **ghost-resistant local quick clean plate now physically removes the TV without leaving a recognizable duplicate TV, HP advertisement, logo, readable screen text, or screen image at the original wall location**.

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
- the original TV region is now visually free of recognizable TV/ad content.

### Interpretation

The new room-wide-context rule materially improved cross-column coherence: the previous run had only 4 coherent columns and 18.3-point detector/depth disagreement, while this run reaches 10 coherent columns and produces a hybrid model.

However, the **visible 66% line is still too low to be accepted as the wall/floor cutoff**. In the screenshot it tracks the foreground hardwood/rug/material region rather than the far wall/floor/baseboard transition. Therefore `hybrid` and 79% confidence are **not treated as physical acceptance**.

This reveals a second failure mode: a later foreground floor/material transition can itself be coherent, persistent and room-wide. Cross-column coherence alone is therefore insufficient to identify the far wall/floor support boundary.

## Wave 3 support refinement — earliest coherent room band

Branch: `scene-foundation-v1`.

Depth support now retains multiple distinct nearward transition candidates per sampled image column rather than collapsing each column to its strongest candidate.

The selector:
- samples 13 columns;
- requires physically directed **farther-above → nearer-below** evidence when depth orientation is known;
- keeps multiple spatially distinct transition candidates per column;
- clusters candidates across columns into possible room-wide support bands;
- robustly fits each band and rejects outliers;
- requires at least **5 coherent columns**;
- requires at least **34% horizontal image coverage**;
- preserves the bounded residual gate;
- chooses the **earliest/uppermost coherent room-wide nearward band** as the wall/floor support candidate rather than the strongest later material transition.

This matches the product meaning of the support cutoff used for wall-mounted objects: the far wall/floor transition should precede later hardwood/rug, floor/furniture and foreground-material depth bands as the image is scanned downward.

### Stronger deterministic regression

The Prepared Scene support suite now includes a synthetic room with **two full-width coherent nearward transitions**:
1. a weaker true wall/floor transition;
2. a much stronger later rug/floor transition.

The test requires FormShift to select the earlier wall/floor band even though the later foreground transition has substantially greater depth contrast. This reproduces the failure exposed by the latest physical screenshot more accurately than the previous narrow-band regression.

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
- no canonical measurement/spatial mutation;
- no physics.

## Validation evidence

Functional exact head before documentation-only updates:

`66ef37da8ea474903322e2ae8593fd6c206ad18c`

Evidence:
- web Vercel preview `dpl_BcYAD3BeBMuFqr9R5DyD8vkdw7yq` — **READY**;
- GitHub combined exact-head status — **Vercel web success + Vercel API success**;
- repository structure verification — pass;
- security/RLS source verification — pass;
- domain tests — pass;
- canonical Arrange/Safari regression suite — pass;
- scene/provider/persistence boundary suite — pass;
- earliest-coherent support-band regression — pass;
- stronger persistent foreground-material-band rejection regression — pass;
- support fusion regression — pass;
- destination occlusion / mask-safety / movement-depth regressions — pass;
- ghost-resistant quick-clean regression — pass;
- client TypeScript check — pass;
- `/arrange-prepared` static export — pass.

## Model/provider evaluation boundary

No new semantic-segmentation model was added in this cycle. A browser semantic surface model remains attractive, but FormShift will not make a commercially ambiguous or mobile-heavy model part of the default architecture merely to improve this one room.

The current support refinement remains deterministic and uses the already-adopted Depth Anything provider. A future semantic surface provider may supplement this evidence behind the existing provider boundary only after model-license, memory, latency and device-quality gates are satisfied.

## Integrity / privacy boundary

Prepared Scene remains derived-only:
- immutable source photo is never overwritten;
- restore remains exact-`source_asset_id` bound;
- masks/cutouts/backgrounds remain private derived assets;
- deterministic quick fill remains local;
- generative repair remains explicit;
- AI-repaired pixels remain bounded to the derived repair region;
- depth/support/occlusion never become verified dimensions or canonical spatial versions;
- Support assist remains reversible;
- destination occlusion is visual evidence, not physical geometry;
- physics remains off.

## Immediate physical-device acceptance

1. Hard refresh the stable `/arrange-prepared` preview and wait for Depth Anything to complete.
2. Capture the **Depth support** diagnostic line and room image. The governing dashed support line should move materially upward from the current 66% foreground-material band, or the depth support should fail closed rather than using the later band.
3. Do **not** require a hybrid result. A correct detector-only or rejected-depth result is preferable to a confidently wrong hybrid.
4. Move the automatic TV away and reconfirm the source wall remains free of recognizable TV/HP/screen content. The local quick-clean anti-ghost requirement is already physically accepted from the latest screenshot; this is a regression check only.
5. With Support assist on, drag the TV straight downward and verify the object itself stops at the active wall-support cutoff.
6. Turn Support assist off and confirm free placement; leave the TV unsupported, re-enable assist, and confirm correction.
7. Test destination occlusion over visibly foreground source content, open wall/floor and the TV's original location.
8. Press **Improve background** and inspect the former TV region for naturalness/banding and accidental TV recreation.
9. Save/refresh and confirm schema-1.3 scene/background lineage restores correctly.
10. Confirm normal Safari page scrolling resumes immediately after drag release.

## Not yet claimed

- physical-device acceptance of the earliest-coherent support-band selector;
- physical-device acceptance of Support Assist drag on/off/re-enable correction;
- physical acceptance of destination occlusion;
- physical acceptance of AI-repaired background quality for the current generation;
- calibrated camera intrinsics / vanishing points;
- calibrated wall/floor planes;
- metric depth;
- production-quality automatic household-object coverage;
- automatic person/furniture pixel separation rather than safe deferral;
- physically correct contact shadows/relighting;
- gravity / rigid-body physics;
- production RoomPlan capture/normalization;
- Prepared Scene scale/rotate controls.

## Next decision

Do **not** add Rapier/RealityKit physics yet.

The latest screenshot closed the local source-removal ghosting blocker but demonstrated that even a high-confidence coherent monocular-depth band can represent the wrong physical transition. The current cycle therefore keeps support evidence fail-safe and improves band selection rather than increasing confidence or weakening disagreement thresholds.

If the next device run still places the wall-support cutoff on a foreground floor/material band, stop further heuristic tuning and implement the next stronger architecture: **explicit image-space support calibration for non-LiDAR photos**, with the automatic line used only as the initial guess and RoomPlan/native structural evidence preferred on supported iPhones. The corrected image-space boundary remains derived scene evidence and does not become canonical metric geometry.

## Authoritative record impact

- `CURRENT-STATE.md`: revision **0.9.25** records physical quick-clean acceptance, the 66%/4.7-point/79%-hybrid foreground-band failure, the earliest-coherent support-band refinement, and exact-head validation.
- `ARCHITECTURE.md`: unchanged; this remains an implementation refinement within the existing bounded, diagnosable and conservative support-evidence architecture.
- `DESIGN-SYSTEM.md`: unchanged; no new durable visible interaction contract was released.
- `PROJECT-CONSTITUTION.md`: unchanged; source primacy, privacy, provenance, reversibility and canonical-spatial-truth invariants remain intact.
