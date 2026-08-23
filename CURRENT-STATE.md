# FormShift Current State

**Revision:** 0.9.24  
**Date:** 2026-08-23  
**Milestone:** Wave 3 Prepared Scene has physically proven local Depth Anything execution and tight automatic TV movement; physical diagnostics exposed a foreground-depth-edge failure mode, and the room-wide nearward support refinement is exact-head build-validated with device acceptance pending

FormShift is a **photo-first spatial augmentation product**. The real captured room image is the primary canvas; structured geometry remains the hidden authority. Plan/rectangle views remain secondary technical verification surfaces.

## Production boundary

Production web remains on the validated Photo Arrange v2.2 baseline. Prepared Scene has **not** been promoted to production.

No production merge, web promotion, database migration, credential change, or physics integration occurred in this Wave 3 continuation.

## Physically validated baseline retained

Prior iPhone testing proves:
- Prepared Scene survives preview authentication;
- the latest source photo remains authoritative;
- Safari uses the safe WASM perception path;
- DETR-backed discovery and detector-guided MediaPipe segmentation reach an interactive state;
- the automatic TV is an independent photographed-pixel layer and can move without Safari scroll takeover;
- broad unlabeled room-region masks are not auto-promoted;
- Depth Anything V2 Small executes locally on the physical iPhone;
- explicit GPT Image background repair has previously succeeded and persisted;
- source-bound Prepared Scene persistence/restore works;
- immutable source photography and canonical measurements/spatial versions remain unchanged.

## Physical diagnostic evidence — 2026-08-23 10:47 local

The latest supplied iPhone screenshot shows:
- **1 editable object:** `tv`;
- selected object expected support: **wall**;
- normalized relative nearness: **0.06**;
- Support assist: **on**;
- active support model: center **60%**, slope **0.0**, confidence **68%**, source **`detector-anchors`**;
- depth support status: **accepted**;
- strong transitions: **7/13**;
- coherent transitions: **4**;
- fit residual: **0.013**;
- inferred direction: **higher-is-nearer**, confidence **100%**;
- merge result: **anchors retained after disagreement**;
- detector/depth center disagreement: **18.3 percentage points**;
- destination-depth masked layers at capture: **0**;
- background state: **fast local approximation**;
- Depth Anything V2 Small processing time: **5,821 ms**.

### Interpretation

The depth field is not generally failing: near/far direction confidence is maximal and the fitted local edge has very low residual. The weakness is **semantic support selection**. Only 4 of 13 sampled columns agreed on the same boundary, while the previous algorithm selected each column's strongest local depth transition. In this room that allows a rug/hardwood or other foreground floor-material edge to outrank a weaker room-wide wall/floor transition.

The existing conservative merge rule behaved correctly: an 18.3-point disagreement did **not** replace the detector-anchor support estimate. This evidence does not justify weakening the disagreement threshold.

## Wave 3 support refinement implemented

Branch: `scene-foundation-v1`

### Room-wide nearward transition rule

Depth support no longer treats the largest absolute local gradient as sufficient floor evidence when near/far orientation is known.

For each sampled image column the candidate now requires:
- a local transition in the physically expected direction: **farther above → nearer below**;
- persistent nearward evidence across a wider vertical context band, not only a narrow pixel edge;
- sufficient transition strength after local/context combination;
- cross-column coherence;
- at least **5 coherent columns** before depth may become support-model evidence;
- meaningful horizontal image coverage so a localized furniture/material edge cannot masquerade as a room-wide support surface;
- the existing bounded perspective-fit residual check.

Sparse/localized candidates continue to fail closed under the existing `incoherent-transitions` state. They may still contribute useful relative depth for occlusion, but they do not become floor/support geometry.

### Why this is safer

A rug edge, furniture edge or material transition can be visually/depth-sharp while existing entirely on the same physical floor plane. A real wall/floor support transition should exhibit persistent scene-depth change across a wider region and across multiple room columns. The refinement therefore changes **evidence admission**, not confidence labeling or canonical geometry.

### New regression

The deterministic support suite now includes a synthetic room with:
- a valid wall/floor nearward transition;
- a narrower foreground material band whose local gradient is deliberately sharper than the true room boundary.

The test requires FormShift to recover the room-wide wall/floor support transition and reject the foreground artifact as the governing support edge.

## Existing Wave 3 safeguards retained

Still active:
- detector-guided connected-component automatic MediaPipe masks;
- whole-room/oversized automatic mask rejection;
- normalized relative-nearness convention (`0` farther → `1` nearer);
- diagnosable detector/depth merge decisions;
- conservative destination-depth occlusion after drag release;
- original prepared-object masks excluded from the source occluder field;
- ghost-resistant deterministic local clean plate using only unmasked surrounding source pixels;
- bounded/feathered explicit AI background repair;
- Prepared Scene cache schema **`prepared-scene-1.3`**;
- source-photo-specific private persistence;
- no canonical measurement/spatial mutation;
- no physics.

## Validation evidence

Functional exact head before this documentation update:

`2b09b8a61c817075fa157377514d1ef75a9df744`

Evidence:
- web Vercel preview `dpl_7et3EfMe2KqtgZNVtAmZoDSVkALQ` — **READY**;
- GitHub exact-head combined status — **Vercel web success + Vercel API success**;
- repository structure verification — pass;
- security/RLS source verification — pass;
- domain tests — pass;
- canonical Arrange/Safari regression suite — pass;
- scene/provider/persistence boundary suite — pass;
- room-wide nearward support regression — pass;
- foreground-material edge rejection regression — pass;
- destination occlusion/mask safety/movement-depth suite — pass;
- ghost-resistant quick-clean regression — pass;
- client TypeScript check — pass;
- `/arrange-prepared` static export — pass.

## Model/provider evaluation note

A lightweight browser semantic-surface model was evaluated as a possible floor/wall aid. SegFormer B0/ADE20K is technically attractive, but the upstream NVIDIA model is published under an `other`/NVIDIA-specific license rather than the straightforward permissive model license required for FormShift's commercial default. It has **not** been added to the application. FormShift will not trade licensing clarity for a short-term perception improvement.

Grounding DINO remains a promising Apache-2.0 open-vocabulary candidate for broader object semantics, but the standard tiny checkpoint is roughly 689 MB and is not appropriate as an automatic iPhone-browser dependency. It remains a later native/server/developer-hosted evaluation candidate rather than part of this release.

## Integrity / privacy boundary

Prepared Scene remains derived-only:
- immutable source photo is never overwritten;
- restore remains exact-`source_asset_id` bound;
- masks/cutouts/backgrounds remain private derived assets;
- deterministic quick fill remains local;
- generative repair remains explicit;
- AI-repaired pixels remain bounded to the derived repair region;
- depth/support/occlusion do not change verified dimensions or canonical spatial versions;
- Support assist remains reversible;
- destination occlusion is visual evidence, not physical geometry;
- physics remains off.

## Immediate physical-device acceptance

1. Hard refresh the stable `/arrange-prepared` preview and wait for Depth Anything to complete.
2. Capture the new **Depth support** line. A good result is either:
   - room-wide evidence reaches at least 5 coherent columns and disagreement drops materially from the prior 18.3 points; or
   - the misleading foreground edge is rejected instead of being reported as accepted.
   A hybrid result is not inherently better than a correct rejection.
3. Move the automatic TV away **before pressing Improve background** and inspect its original location. The quick clean plate must not contain a recognizable duplicate TV, HP advertisement, readable TV text/logo or recognizable screen image.
4. Press **Inspect clean background** and verify the old TV region contains only an approximate background.
5. Press **Improve background** explicitly and confirm the generated repair does not recreate the removed TV/screen/logo.
6. With Support assist on, drag the TV straight downward and confirm the TV stops before crossing the active support boundary.
7. Turn Support assist off and confirm free placement; leave it unsupported, re-enable assist, and confirm correction.
8. Test destination occlusion over visibly foreground content, open wall/floor and the TV's original location.
9. Save/refresh and confirm schema-1.3 scene/background lineage restores correctly.
10. Confirm normal Safari page scrolling resumes immediately after drag release.

## Not yet claimed

- physical-device acceptance of the new room-wide nearward support detector;
- physical-device acceptance of the ghost-resistant quick clean plate on the old TV location;
- physical acceptance of Prepared Scene repair prompt v1.1.0 output quality;
- physical-device acceptance of destination occlusion;
- physical-device acceptance of support drag on/off/re-enable correction;
- calibrated camera intrinsics / vanishing points;
- calibrated floor/wall planes;
- metric depth;
- production-quality automatic household-object coverage;
- automatic person/furniture pixel separation rather than safe deferral;
- physically correct contact shadows/relighting;
- gravity / rigid-body physics;
- production RoomPlan capture/normalization;
- Prepared Scene scale/rotate controls.

## Next decision

Do **not** add Rapier/RealityKit physics yet. The next device run now tests whether room-wide contextual depth evidence can either converge toward the detector-supported wall/floor region or correctly reject the foreground material edge. That is a prerequisite for trustworthy support/collision geometry.

If support and clean-background acceptance pass, continue Wave 3 into stronger source-scene semantics/calibration and broader commercially-cleared object discovery. Physics follows reliable support/collision geometry rather than screen-space or monocular-edge heuristics.

## Authoritative record impact

- `CURRENT-STATE.md`: revision **0.9.24** records the latest physical depth diagnostics, the identified foreground-edge failure mode, the room-wide nearward support refinement, licensing evaluation and exact-head validation evidence.
- `ARCHITECTURE.md`: unchanged; the existing bounded/diagnosable/conservative depth-support architecture already governs this implementation refinement.
- `DESIGN-SYSTEM.md`: unchanged; no durable visible interaction/state contract changed.
- `PROJECT-CONSTITUTION.md`: unchanged; source primacy, privacy, provenance, reversibility and canonical-spatial-truth invariants remain intact.
