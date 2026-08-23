# FormShift Current State

**Revision:** 0.9.22  
**Date:** 2026-08-23  
**Milestone:** Prepared Scene feasibility/restore is physically proven; Wave 3 now includes diagnosable depth support, normalized relative nearness, and conservative destination occlusion, exact-head build-validated with physical iPhone acceptance still required

FormShift is a **photo-first spatial augmentation product**. The real captured room image is the primary canvas; structured geometry remains the hidden authority. Plan/rectangle views remain secondary technical verification surfaces.

## Production boundary

Production web remains on the validated Photo Arrange v2.2 baseline. Prepared Scene has **not** been promoted to production.

No production merge, web promotion, database mutation, credential change, or physics integration occurred in this Wave 3 continuation.

## Physically validated baseline retained

Prior iPhone testing proves:

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

Validated device evidence includes:
- Prepared Scene route survives preview authentication;
- latest source photo remains authoritative;
- Safari uses the safe WASM perception path;
- broad unlabeled room-region masks are not auto-promoted;
- TV can move independently;
- person-overlapped couch is conservatively deferred in the tested room;
- explicit GPT Image background repair succeeds and persists;
- source-bound cache restores without rerunning full detector preparation;
- immutable source photography and canonical measurements/spatial versions remain unchanged.

A still screenshot does **not** prove support drag mechanics. Support assist on/off/re-enable correction still requires direct interaction evidence.

## Latest iPhone evidence — 2026-08-23

The latest diagnostic screenshot showed:
- **1 editable automatic object:** `tv`;
- Support assist: **on**;
- center boundary: **60%**;
- slope: **0.0 points across photo**;
- confidence: **68%**;
- support provenance: **`detector-anchors`**;
- Depth Anything V2 Small completed locally in **5,151 ms**;
- background: AI-repaired masked regions.

Interpretation: local depth inference is viable enough to continue evaluating on this iPhone, but the previous UI did not expose why depth-profile evidence failed to become authoritative or hybrid. Thresholds therefore were **not** loosened blindly.

## Wave 3 continuation implemented

Branch: `scene-foundation-v1`

### 1. Diagnosable depth-support decisions

Depth analysis now returns explicit acceptance/rejection evidence instead of silently returning `null`.

Possible depth-profile outcomes include:
- `accepted`;
- `invalid-depth`;
- `insufficient-strong-transitions`;
- `incoherent-transitions`;
- `high-residual`.

Diagnostics include:
- sampled column count;
- strong-transition count;
- robust/coherent sample count;
- average transition strength;
- fitted residual;
- estimated center/slope;
- inferred depth direction and its confidence.

The detector/depth merge also records an explicit decision:
- anchor-only / no depth;
- anchor-only / weak depth;
- depth replaces fallback;
- anchor wins disagreement;
- depth wins disagreement;
- hybrid agreement.

Material disagreement remains visible rather than being converted into false precision.

### 2. Normalized relative-nearness contract

Raw Depth Anything grayscale values are no longer persisted directly as if their orientation were universal.

FormShift now estimates whether larger or smaller depth values correspond to nearer pixels. Object depth is normalized into a single product convention:

```text
0 = relatively farther
1 = relatively nearer
```

If depth direction is ambiguous, FormShift does not fabricate object nearness. Source object depth is sampled from the object's original photographed location, not its later edited location.

This corrects a latent ambiguity in prior `approximateDepth` values. `SUPPORT_MODEL_VERSION` is now **3**, so prior support/depth-v2 cache evidence is refined instead of silently trusted.

Prepared Scene storage schema remains `prepared-scene-1.2`; no database migration was required.

### 3. Conservative destination-depth occlusion

After depth enrichment and after object drag release, FormShift can derive an occlusion-rendered cutout for a moved prepared object.

Rules:
- the full cutout remains visible while dragging so interaction stays responsive;
- occlusion settles after release;
- source pixels must be materially nearer than the moved object before they hide it;
- small depth differences are ignored to prevent noisy edge flicker;
- original Prepared Scene object-mask regions are excluded from source occlusion so the old TV at its original photographed position cannot incorrectly hide the moved TV;
- the effect is derived rendering only and never changes source photography or canonical coordinates;
- failures are fail-soft: the ordinary cutout remains usable.

The diagnostics show how many prepared layers currently have destination-depth masking applied.

### 4. Existing Wave 3 safeguards remain

Still active:
- detector-guided connected-component MediaPipe masks;
- conservative person/furniture deferral;
- whole-room/oversized mask rejection;
- x-dependent estimated support model;
- detector/depth hybrid support only on bounded agreement;
- Safari-safe WASM fallback;
- 45-second model-init and 30-second inference recovery ceilings;
- source-photo-specific persistence/restore;
- mask-bounded explicit AI reconstruction;
- no canonical measurement/spatial mutation;
- no physics.

## Validation and correction evidence

The fail-closed preview gate rejected the first integrated head. Root cause was a **test precision defect**, not a behavior failure: JavaScript computed `1 - 0.8` as `0.19999999999999996`, while the new regression required strict equality to `0.2`.

The assertion was corrected to numerical tolerance without weakening the nearness or occlusion thresholds.

Functional exact head before this documentation update:

`fc2e248e08e8eb5a912c6f46b1941d7555f33b78`

Exact-head evidence:
- web Vercel deployment `dpl_AgykauqTxYgryyQ3fT1DkXvW9LFp` — **READY**;
- API Vercel deployment `dpl_23nDprLeg8JLxfUJ6eN4pFndDkb1` — **READY**;
- combined GitHub commit status reports both Vercel checks **success**;
- repository structure verification — pass;
- security/RLS source verification — pass;
- domain tests — pass;
- canonical Arrange/Safari regression suite — pass;
- scene/provider/persistence boundary suite — pass;
- depth diagnostics/support fusion/occlusion/mask safety/movement-depth regression suite — pass;
- client TypeScript check — pass;
- `/arrange-prepared` static export — pass.

The stable branch route remains protected by Vercel preview authentication. A protected-route fetch correctly redirects to Vercel SSO rather than exposing the private preview anonymously.

## Integrity / privacy boundary

Prepared Scene remains derived-only:
- immutable source photo is never overwritten;
- restore remains exact-`source_asset_id` bound;
- masks/cutouts/backgrounds remain private derived assets;
- AI-repaired pixels remain mask-bounded;
- depth/support/occlusion do not change verified dimensions or canonical spatial versions;
- Support assist remains reversible;
- destination occlusion is visual evidence, not geometry;
- physics remains off.

## Immediate physical-device acceptance

Hard-refresh the stable `/arrange-prepared` preview once because support-model version 3 invalidates/refines older ambiguous depth evidence.

1. Wait for Depth Anything to complete.
2. Capture the new **Depth support** diagnostic line. It now states exactly why the profile was accepted/rejected, sample counts, residual, near-direction confidence, merge decision, and disagreement.
3. Select the automatic **TV** layer and inspect its detector-guided cutout around all edges.
4. With Support assist on, drag the TV clearly below the estimated boundary and confirm the TV itself is constrained.
5. Turn Support assist off and confirm free placement returns; leave it unsupported, re-enable, and confirm correction.
6. Move the TV so it overlaps a visibly foreground part of the room. After release, verify the TV becomes partially hidden only where source depth is materially nearer.
7. Move it over open wall/floor and verify it does not develop noisy holes.
8. Move it over the TV's original photographed location and verify its old source depth does not incorrectly occlude the moved TV.
9. Save changes and refresh. Detector preparation should remain reusable; depth may rerun non-blockingly to restore destination occlusion evidence.
10. Confirm normal Safari page scrolling resumes immediately after drag release.

## Not yet claimed

- physical-device acceptance of destination occlusion;
- physical-device acceptance of automatic TV mask quality;
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

Do **not** add Rapier/RealityKit physics yet. The next physical test now has enough diagnostics to tell us whether the depth-profile algorithm itself is weak on this room or whether detector/depth disagreement is the limiting factor. Destination-depth occlusion should also be judged on the real iPhone before advancing to calibrated support/collision geometry.

If this slice passes device acceptance, the next Wave 3 engineering priority is broader commercially-cleared object discovery plus stronger source-scene semantics/calibration. Physics follows reliable support/collision geometry rather than screen-space estimates.

## Authoritative record impact

- `CURRENT-STATE.md`: revision **0.9.22** records diagnosable support decisions, normalized nearness, conservative destination occlusion, validation failures/corrections, and exact-head evidence.
- `ARCHITECTURE.md`: revision **0.5.6** records the durable normalized-depth and destination-occlusion contracts.
- `DESIGN-SYSTEM.md`: unchanged; existing Estimated augmentation and diagnostic-confidence rules already govern the visible behavior.
- `PROJECT-CONSTITUTION.md`: unchanged; immutable-source, privacy, provenance, reversibility and canonical-spatial-truth rules remain intact.
