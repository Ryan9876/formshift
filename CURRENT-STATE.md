# FormShift Current State

**Revision:** 0.9.23  
**Date:** 2026-08-23  
**Milestone:** Wave 3 automatic TV masking is physically improved; the latest iPhone evidence exposed clean-background ghosting, and a ghost-resistant local/AI reconstruction generation is now exact-head build-validated with physical acceptance pending

FormShift is a **photo-first spatial augmentation product**. The real captured room image is the primary canvas; structured geometry remains the hidden authority. Plan/rectangle views remain secondary technical verification surfaces.

## Production boundary

Production web remains on the validated Photo Arrange v2.2 baseline. Prepared Scene has **not** been promoted to production.

No production merge, web promotion, database migration, credential change, or physics integration occurred in this Wave 3 continuation.

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
- explicit GPT Image background repair has previously succeeded and persisted;
- source-bound Prepared Scene persistence/restore works;
- immutable source photography and canonical measurements/spatial versions remain unchanged.

## Latest iPhone screenshot evidence — 2026-08-23

The latest supplied screenshot materially advances automatic TV-mask acceptance.

Confirmed from the screenshot:
- the **automatic TV** is selected as an independent photographed-pixel layer;
- the cyan selection bounds are tight around the TV rather than encompassing a broad wall/room region;
- the TV has been moved independently into the upper-right of the room;
- **Support assist on** is visibly active;
- the **Estimated floor region** diagnostic remains visible over the real room photo;
- the room remains visible and undimmed beneath the derived scene.

The same screenshot exposes a blocking realism defect in the prior clean-background path: the TV's original photographed location remains recognizably visible/ghosted after the TV is moved. The prior quick clean plate therefore fails the commercial-quality illusion even though automatic object isolation itself is substantially improved.

The screenshot does **not** prove that wall support constrains the TV during a direct downward drag. Support Assist on/off/re-enable correction remains an open physical acceptance item.

## Prior Wave 3 spatial-intelligence slice retained

### Diagnosable depth/support decisions

Depth analysis records explicit acceptance/rejection evidence rather than silently returning no result. Outcomes include:
- `accepted`;
- `invalid-depth`;
- `insufficient-strong-transitions`;
- `incoherent-transitions`;
- `high-residual`.

Diagnostics retain sampled/strong/robust counts, transition strength, fit residual, estimated center/slope, inferred depth direction and direction confidence. Detector/depth merge decisions explicitly record anchor-only, depth replacement, disagreement winner, or hybrid agreement.

### Normalized relative nearness

Usable relative depth follows one product convention:

```text
0 = relatively farther
1 = relatively nearer
```

Provider grayscale direction is inferred rather than assumed. Ambiguous direction withholds nearness instead of fabricating it. Source object nearness is sampled from the original photographed location.

`SUPPORT_MODEL_VERSION` remains **3**.

### Conservative destination-depth occlusion

After drag release, source pixels may occlude a moved cutout only when their normalized relative nearness is materially greater. Small depth differences are ignored; original Prepared Scene object masks are excluded from the source occluder field; ambiguous depth disables the effect; failures fall back to the complete cutout. This remains **Estimated augmentation**, not calibrated geometry.

## Wave 3 continuation — clean-background integrity

Branch: `scene-foundation-v1`

### 1. Root cause of the visible TV ghost

The prior quick clean-background algorithm constructed fill imagery from shifted/blurred copies of the entire source photograph. For a large high-contrast object such as the TV, this could re-sample recognizable portions of the removed object into its own former location.

That implementation has been replaced.

### 2. Ghost-resistant deterministic quick clean plate

The new local `quickInpaint` path:
- never uses a masked/removed-object pixel as fill evidence;
- finds nearest unmasked boundary evidence along the row and column for each masked pixel;
- interpolates horizontal and vertical candidates and combines them deterministically;
- applies bounded feathering at the removal edge;
- leaves unmasked source pixels unchanged;
- avoids per-pixel temporary allocations to reduce iPhone garbage-collection pressure;
- remains local, fast, deterministic and provider-free.

This is still an approximate clean plate, not photorealistic reconstruction. Its job is to prevent an obviously duplicated removed object while manipulation remains immediate.

### 3. Stronger removal-mask coverage

Quick and high-quality repair masks now use bounded image-scale-aware expansion around prepared-object masks. This is intended to include thin screen bezels, edge halos, small shadows and segmentation edge uncertainty without allowing broad scene rewriting.

High-quality repair acceptance remains feathered and mask-bounded: pixels outside the derived repair region remain the immutable source photograph.

### 4. High-quality AI repair anti-ghost contract

Prepared Scene background repair prompt version is now **`prepared-scene-repair-v1.1.0`**.

The provider is explicitly instructed to:
- completely remove masked screen/image content, text, logos, reflected colors, edge halos, mounting shadow and attached details;
- never copy, redraw, ghost, echo or reconstruct recognizable removed-object content inside the repair region;
- treat masked source pixels as evidence of what must disappear rather than content to preserve;
- infer replacement primarily from surrounding unmasked boundary context;
- preserve people and every unmasked object;
- avoid redesign, restyling, replacement objects, text/logos and camera changes.

Generated pixels are still accepted only inside the bounded/feathered removal region.

### 5. Prepared Scene cache generation advanced

Prepared Scene schema is now **`prepared-scene-1.3`** and new background assets use:
- `prepared_scene_background_quick_v2`;
- `prepared_scene_background_ai_v2`.

This is an intentional derived-cache generation change, not a database migration. Old `prepared-scene-1.2` packages remain historical records but are not silently restored as the current clean-background implementation. The next physical test therefore requires one fresh preparation.

### 6. Regression coverage

A synthetic high-contrast-object test now proves:
- every masked pixel is reconstructed;
- the bright removed object does not remain at the center of the removal region;
- unmasked source RGBA pixels remain exact.

Scene-boundary verification also requires:
- ghost-resistant quick inpaint;
- bounded/feathered repair masks;
- Prepared Scene schema 1.3;
- v2 background asset kinds;
- anti-ghost AI repair prompt v1.1.0.

## Validation and correction evidence

The fail-closed preview gate correctly rejected the first integrated clean-background head because TypeScript 6's DOM typings would not accept a `Uint8ClampedArray<ArrayBufferLike>` directly as an `ImageData` buffer.

The fix copies the inpaint result into an owned `Uint8ClampedArray` backed by a concrete `ArrayBuffer` before constructing `ImageData`. This was a compatibility/type-safety correction; no removal/repair thresholds were weakened.

Functional exact head before this documentation update:

`5e2da8450cd85ab35d4b0c946a4deefa00f69fec`

Validation evidence:
- web Vercel deployment `dpl_CmwKtaYBbvgKTgq5EmpkzEWWjbTD` — **READY**;
- GitHub combined status on `5e2da8450cd85ab35d4b0c946a4deefa00f69fec` — **Vercel web success + Vercel API success**;
- the API repair-prompt generation itself has READY deployment evidence at `dpl_3Y3t9F9Erw3S4ih1vwxCTTPCW4J7` on commit `44c582c221860e9d1f1d38b78105e9985b83344f`; later client-only API deployments may be canceled/deduplicated by Vercel;
- repository structure verification — pass;
- security/RLS source verification — pass;
- domain tests — pass;
- canonical Arrange/Safari regression suite — pass;
- scene/provider/persistence boundary suite — pass;
- depth diagnostics/support/occlusion/mask-safety suite — pass;
- ghost-resistant quick-clean regression — pass;
- client TypeScript check — pass;
- `/arrange-prepared` static export — pass.

## Integrity / privacy boundary

Prepared Scene remains derived-only:
- immutable source photo is never overwritten;
- restore remains exact-`source_asset_id` bound;
- masks/cutouts/backgrounds remain private derived assets;
- deterministic quick fill uses only local source pixels;
- generative repair remains explicit rather than automatic;
- AI-repaired pixels remain bounded to the derived repair region;
- depth/support/occlusion do not change verified dimensions or canonical spatial versions;
- Support Assist remains reversible;
- destination occlusion is visual evidence, not geometry;
- physics remains off.

## Immediate physical-device acceptance

Hard-refresh the stable `/arrange-prepared` preview once. Schema 1.3 intentionally causes one fresh preparation so the ghost-prone previous clean plate cannot be silently restored.

1. Wait for the automatic TV layer to become moveable.
2. Move the TV away **before pressing Improve background**.
3. Inspect the original TV location. The quick clean plate must not contain a recognizable duplicate TV, HP advertisement, readable TV text/logo or recognizable screen image.
4. Press **Inspect clean background** and verify the old TV location contains only an approximate background, not recognizable TV content.
5. Press **Improve background** explicitly. Inspect again: the high-quality repair must not recreate a TV, HP logo, ad text or recognizable screen imagery.
6. Capture the **Depth support** diagnostic line so the exact rejection/merge reason, sample counts, residual, direction confidence and disagreement are known.
7. With Support Assist on, drag TV straight downward and confirm the TV itself stops before crossing the displayed wall/floor boundary.
8. Turn Support Assist off and confirm free placement; leave the TV unsupported, re-enable assist, and confirm correction.
9. Test destination occlusion over visibly foreground content, open wall/floor and the TV's original location.
10. Save/refresh and confirm the schema-1.3 scene restores correctly.
11. Confirm normal Safari page scrolling resumes immediately after drag release.

## Not yet claimed

- physical-device acceptance of the new ghost-resistant quick clean plate;
- physical-device acceptance of Prepared Scene repair prompt v1.1.0 output quality;
- physical-device acceptance of destination occlusion;
- full physical acceptance of automatic TV-mask edge quality beyond the latest screenshot bounds;
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

Do **not** add Rapier/RealityKit physics yet. The latest screenshot showed that realistic source removal is a more immediate commercial-quality blocker than adding physical simulation.

If the schema-1.3 quick clean plate and explicit AI repair pass the real-room test, continue Wave 3 with the already-open support-drag/destination-occlusion acceptance and then broader commercially-cleared household object discovery plus stronger source-scene semantics/calibration. Physics follows reliable support/collision geometry rather than screen-space estimates.

## Authoritative record impact

- `CURRENT-STATE.md`: revision **0.9.23** records the latest iPhone screenshot, the clean-background ghosting defect, the ghost-resistant reconstruction generation, validation correction and physical acceptance boundary.
- `ARCHITECTURE.md`: revision **0.5.7** records the durable clean-plate, repair-mask and cache-generation contracts.
- `DESIGN-SYSTEM.md`: unchanged; existing Estimated augmentation, source-photo primacy and confidence-state rules already cover the visible behavior.
- `PROJECT-CONSTITUTION.md`: unchanged; immutable-source, privacy, provenance, reversibility and canonical-spatial-truth invariants remain intact.
