# FormShift Current State

**Revision:** 0.9.30  
**Date:** 2026-08-23  
**Milestone:** Wave 3 target-local Safari refinement remains build-validated and awaiting direct brush-alignment proof. A new iPhone screenshot physically confirms lower-half object manipulation, resize/rotation and Safari drag stability. FormShift now also has a confidence-bounded derived placement-assessment engine for support-aware scene reasoning.

FormShift is a **photo-first spatial augmentation product**. The real captured room image remains the primary canvas; structured geometry remains the hidden authority. Plan/rectangle views remain secondary technical verification surfaces.

## Production boundary

Production web remains on the validated Photo Arrange v2.2 baseline. Prepared Scene, Spatial Import, target-local refinement candidate work and Wave 3 placement assessment have **not** been promoted to production.

No production merge, web promotion, database migration, credential change, Polycam API provisioning or physics integration occurred in this cycle.

## Latest physical iPhone evidence

The latest supplied screenshot shows the selected TV:
- successfully lifted into editable-object mode;
- moved well into the lower half of the room photograph;
- resized and rotated;
- still directly manipulable after substantial page movement;
- not causing Safari to take over the gesture or scroll the page during the active object drag.

This is a **physical pass for the current object-manipulation path** and confirms that the 0.9.29 target-local refinement adapter did not regress the previously validated lower-half drag/Safari behavior.

The screenshot does **not** contain an active Add/Remove refinement stroke, so it does not close the 0.9.29 brush-coordinate gate. Physical acceptance still requires one short visible refinement stroke remaining directly under the user's finger.

The screenshot also demonstrates an important product boundary: the canonical single-object fallback editor is still a free 2D photo-placement tool. A TV can be rotated and moved onto the rug, where it reads visually like a flat pasted card. This is not accepted as physically plausible scene placement. Support/perspective semantics belong in Prepared Scene / calibrated scene rendering rather than being hard-coded into the generic fallback editor.

## 0.9.29 target-local refinement candidate

The canonical web adapter uses the refinement surface's target-local PointerEvent `offsetX/offsetY` as the primary Safari refinement coordinate source before forwarding into the frozen Photo Arrange v2.2 editor.

Primary path:

```text
trusted iPhone pointer
→ target-local offsetX / offsetY
→ refinement-surface rendered coordinates
→ normalized forwarded pointer
→ frozen Photo Arrange editor
→ rendered-rect/layout-stage scaling
→ FormShift zoom/pan inverse
→ normalized immutable source-image coordinate
```

Raw `clientX/clientY`, browser chrome motion and `visualViewport` origin are no longer the primary placement source. The legacy client/visual-viewport conversion remains fallback support only.

Permanent regression coverage intentionally corrupts raw browser `clientY` by more than 600 px, changes browser rect and visual-viewport origins, and requires the target-local source coordinate to remain unchanged.

## Wave 3 placement assessment

The latest screenshot made the next realism problem explicit: image manipulation can succeed while the resulting placement is physically implausible.

New module:

`apps/client/src/prepared/placement.ts`

It classifies a Prepared Scene placement as:
- `plausible`
- `questionable`
- `unsupported`
- `unknown`

The assessment uses only **derived support evidence** and never mutates canonical room geometry. It returns:
- expected support class;
- estimated boundary used for the decision;
- normalized support violation when measurable;
- support confidence;
- an explanatory reason;
- a reversible `correctedPosition` generated through the existing support constraint.

Conservative admission rules:
- low-confidence or fallback support evidence returns `unknown` rather than a false physical verdict;
- `surface`/`unknown` objects return `unknown` because the current floor/wall model cannot validate a tabletop/shelf/support surface;
- a wall-supported object materially inside the estimated floor region is `unsupported`;
- a floor-supported object materially separated above the estimated floor region is `unsupported`;
- small support errors are `questionable` rather than hard-invalid;
- no assessment changes measurements, spatial versions, source photography or provider evidence.

The placement assessment is intentionally **not yet surfaced as a calibrated red/green product verdict**. The current monocular support boundary itself has not passed physical acceptance in this room, so a stronger UI claim would manufacture certainty. The next UI integration may expose the result only as clearly labeled Estimated placement evidence until RoomPlan/calibration supplies stronger geometry.

## Validation evidence

Functional exact head:

`2363cce69879f05eb2d07cebaccb19baef91e32a`

Evidence:
- web Vercel preview `dpl_3wXpTh6fyP7X315VQGyTSdW4Rh7p` — **READY**;
- exact-head combined status — **Vercel web success + Vercel API success**;
- repository structure verification — pass;
- security/RLS source verification — pass;
- domain tests — pass;
- canonical Arrange/Safari contract suite — pass;
- target-local refinement/corrupt-client-coordinate regression — pass;
- scene/provider/persistence boundary suite — pass;
- Prepared Scene depth/support/occlusion/quick-clean suite — pass;
- **placement assessment regression — pass**;
- Spatial Import regression/privacy/authority suite — pass;
- client TypeScript check — pass;
- static web export — pass.

The first integrated placement-assessment regression head failed closed because Node's strip-types verifier could not resolve an extensionless TypeScript import. The module was corrected to explicit `.ts` imports; no behavioral threshold or assertion was weakened.

## Physically validated Prepared Scene baseline

Current iPhone evidence proves:
- Prepared Scene survives preview authentication;
- latest source photo remains authoritative;
- Safari uses the safe WASM perception path;
- DETR-backed discovery and detector-guided MediaPipe segmentation reach an interactive state;
- the automatic TV is a tight independent photographed-pixel layer;
- broad unlabeled room-region masks are not auto-promoted;
- Depth Anything V2 Small executes locally on the physical iPhone;
- source-bound Prepared Scene persistence/restore works;
- immutable source photography and canonical measurements/spatial versions remain unchanged;
- ghost-resistant local quick-clean removes the TV without leaving recognizable duplicate TV/HP/screen content;
- normal object manipulation can reach the lower half of the image without Safari scroll takeover.

Mild local-reconstruction banding remains a visual-quality issue, not a source-integrity failure.

## Current support/depth status

Latest physical support evidence remains:
- selected `tv`, expected support `wall`;
- relative nearness 0.06;
- support model center 66%, slope 4.7 points, confidence 79%, source `hybrid`;
- depth support strong 10/13, coherent 10, residual approximately 0.027.

The visible 66% line tracked a foreground hardwood/rug/material transition rather than the far wall/floor/baseboard transition, so that high-confidence hybrid remains **not physically accepted**.

Depth support now retains multiple distinct nearward transitions per sampled column, clusters them into room-wide bands and selects the earliest/uppermost coherent nearward band that passes bounded coverage/residual checks. That correction remains build-validated and still needs another physical run.

## Spatial Import / Polycam benchmark

Protected route: `/spatial-import`.

FormShift can locally inspect:
- Polycam/RoomPlan-style floorplan JSON;
- glTF;
- GLB;
- Polycam Developer Mode/session ZIP inventory.

Imported evidence remains local and carries `canonicalMutationAllowed: false`. There is no Supabase write or automatic measurement adoption.

Structural-evidence hierarchy remains:

```text
LiDAR-capable iPhone
→ validated native RoomPlan/LiDAR structural evidence preferred
→ reviewed external RoomPlan/mesh evidence may supplement/compare
→ single-photo monocular depth remains fallback/augmentation

Non-LiDAR device
→ photo/multi-view evidence + explicit calibration
→ reviewed external mesh/floorplan evidence when supplied
→ monocular results remain Estimated
```

Polycam remains a benchmark/import source rather than a runtime dependency.

## Existing safeguards retained

- source-photo immutability;
- canonical spatial/measurement authority;
- detector-guided connected-component automatic masks;
- person-overlap deferral;
- normalized relative nearness (`0` farther → `1` nearer);
- diagnosable detector/depth support fusion;
- conservative destination occlusion after release;
- ghost-resistant local clean plate;
- mask-bounded explicit AI background repair;
- source-photo-bound Prepared Scene persistence;
- fail-closed preview validation;
- Spatial Import no-upload/no-canonical-mutation boundary;
- no physics.

## Immediate acceptance gates

### A. Canonical Arrange refinement

1. Open the current branch `/arrange` preview and hard refresh.
2. Enter manual selection/refinement.
3. Draw one **short Add stroke** across a distinctive TV edge.
4. The brush ring and teal stroke must remain directly under the finger; any long vertical column fails.
5. Repeat with Remove.
6. Repeat once after vertical page scroll and once after photo zoom/pan.

The latest screenshot already passes lower-half object drag/resize/rotate behavior, so there is no need to repeat a long drag test unless a regression appears.

### B. Prepared Scene support

1. Open `/arrange-prepared`.
2. Wait for the current support/depth analysis.
3. Confirm where the revised Estimated floor boundary lands.
4. With Support assist on, try to move the automatic wall-supported TV materially into the floor region.
5. Turn Support assist off and confirm free placement returns.
6. Re-enable it and confirm reversible correction.

A support verdict is still Estimated until calibrated/RoomPlan evidence exists.

### C. External structural benchmark

For the same room, obtain when available:
1. `original_floorplan.json` or equivalent;
2. GLB or `original.gltf` plus assets;
3. Developer Mode/session ZIP.

## Not yet claimed

- physical brush-alignment acceptance of 0.9.29;
- physical acceptance of the revised support-band selector;
- calibrated wall/floor planes;
- metric depth from the single-photo pipeline;
- physically correct perspective projection onto floor/wall planes;
- physically correct contact shadows/relighting;
- production RoomPlan capture/normalization;
- real Polycam export compatibility beyond deterministic fixtures;
- automatic external-evidence adoption into canonical geometry;
- production-quality household-object coverage;
- automatic person/furniture pixel separation;
- gravity/rigid-body physics;
- Prepared Scene scale/rotate controls.

## Next decision

Close the target-local brush-alignment gate first. In parallel, continue the support path as **derived placement evidence** rather than adding physics. Once RoomPlan/Polycam or explicit calibration supplies trustworthy support/collision geometry, the same placement-assessment contract can graduate from Estimated guidance into the input boundary for Rapier/RealityKit physical constraints.

## Authoritative record impact

- `CURRENT-STATE.md`: revision **0.9.30** records the physical lower-half manipulation pass, still-open brush gate and build-validated derived placement assessment.
- `ARCHITECTURE.md`: unchanged at **0.5.8**; placement assessment implements the existing derived-evidence/support-constraint architecture.
- `DESIGN-SYSTEM.md`: unchanged; no durable interaction contract changed.
- `PROJECT-CONSTITUTION.md`: unchanged; source primacy, reversibility and canonical-spatial-truth invariants remain intact.
