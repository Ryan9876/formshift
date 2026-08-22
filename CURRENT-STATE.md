# FormShift Current State

**Revision:** 0.9.8  
**Date:** 2026-08-22  
**Milestone:** Prepared Scene v1 application candidate passes CI and preview build; physical-iPhone Prepared Scene acceptance pending

FormShift is a **photo-first spatial augmentation product**. The real captured room image is the primary canvas; structured geometry remains the hidden authority. Plan/rectangle views are secondary technical verification surfaces.

## Production baseline

Production remains on `main` with the validated Photo Arrange v2.2 baseline. **Prepared Scene has not been promoted to production.**

The production baseline retains short-tap selection, Add/Remove refinement, pan/zoom, object lift, move/scale/rotate, local background reconstruction, explicit GPT Image background repair, editable saved-placement persistence, and immutable source-photo preservation.

The v2.1 screen-Y perspective/contact experiment remains rolled back.

## Confirmed Safari drag correction

The Scene Foundation candidate previously exposed a Mobile Safari failure where the selected guitar stopped around the middle/lower photograph and the same touch began scrolling the page.

The replacement gesture bridge tracks the selected-object pointer through Safari retargeting and blocks native page scrolling only during the active object drag. It does not change saved transforms or position bounds.

**Physical-iPhone evidence:** on 2026-08-22 the user confirmed the guitar can now be moved freely across the room photograph. The specific lower-half/page-scroll regression is considered resolved.

## Prepared Scene v1

Branch: `scene-foundation-v1`  
Draft PR: `#1`  
Validated application commit: `e9a3f2bb379d25bafe23953017dcc0cafab4388a`

Prepared Scene v1 implements a multi-object acceleration path so expensive perception work can happen once when a photo loads rather than repeating a single-object lift/reconstruction workflow for every item.

### Pipeline

```text
Immutable source photo
   ↓ immediately visible
Local object discovery
   ├── DETR ResNet-50 detector
   └── supplemental MediaPipe sweep of uncovered room regions
   ↓
Per-object MediaPipe masks + photographed-pixel cutouts
   ↓
Shared deterministic local clean-background plate
   ↓
Multiple independent moveable photo layers
   ↓ non-blocking enrichment
Depth Anything V2 Small relative-depth evidence
```

### Object discovery and correction

Prepared Scene uses an explicit `ObjectDiscoveryProvider` boundary.

The first browser/iPhone feasibility provider is the quantized ONNX conversion `Xenova/detr-resnet-50` through Transformers.js. Because DETR has a limited COCO vocabulary, FormShift also performs a lightweight MediaPipe room sweep over detector-uncovered regions. Those supplemental layers may be labeled generically as `object`.

A user can choose **Add missed object** and tap near the center of an omitted object. The existing MediaPipe segmentation path then creates another independent layer.

### Multi-object editor behavior

When Prepared Scene is enabled:
- prepared objects are independent photographed-pixel layers
- any prepared object can be selected and dragged without first lifting another object
- dragging uses Safari-safe global pointer continuation
- page scrolling is suppressed only during active object movement
- object chips expose the prepared layer set
- **Reset positions** returns all layers to their source-image locations
- **Inspect clean background** hides all layers for direct reconstruction review

Prepared Scene v1 deliberately implements **move-only, in-memory editing** for this feasibility test. Scale/rotate, committed persistence and explicit AI repair remain available in the validated fallback editor until the new object/discovery/background model proves viable on the target iPhone.

### Shared clean background

The shared background plate is derived locally from the union of prepared object masks. Masked source pixels are removed from the derived canvas and filled from neighboring/blurred image evidence.

This is a fast deterministic approximation, **not photorealistic inpainting**. Its purpose in v1 is to validate the one-background/many-object architecture and expose where selective AI reconstruction will be needed.

### Depth enrichment

Depth Anything V2 Small runs after the room becomes editable when the device can support it. It adds relative-depth evidence to prepared objects without blocking movement.

Depth is estimated and non-metric. It never updates verified room measurements or canonical coordinates.

## Feature boundary and rollback

Prepared Scene is disabled by default and can be enabled for evaluation through:
- `EXPO_PUBLIC_PREPARED_SCENE_V1=true`, or
- preview query parameter `prepared=1`

When disabled, Arrange uses the validated canonical Photo Arrange editor. There is no migration requirement and no source-photo mutation.

## Persistence and integrity boundary

Prepared Scene v1 is intentionally ephemeral:
- no Prepared Scene database table
- no Prepared Scene write into `photo_arrangements`
- no canonical spatial-version mutation
- no measurement mutation
- no source-photo overwrite
- reload causes the room to be prepared again

The existing RLS-protected `scene_analyses` foundation remains deployed from the Scene Foundation cycle, but Prepared Scene persistence is deferred until device behavior is known.

## Verification evidence

GitHub Actions run `32554764503` completed successfully for application commit `e9a3f2bb379d25bafe23953017dcc0cafab4388a`.

Passed gates:
- repository verification
- security verification
- domain tests
- Arrange/Safari contract guards
- scene/Prepared Scene boundary guards
- client TypeScript check
- API TypeScript check
- production web export

Matching Vercel web preview deployment `dpl_E1Pu3ZUn5uNea9YNWWV3NTtiFqBs` reached **READY** for that exact application commit.

This is code/build evidence, not physical-iPhone Prepared Scene acceptance.

## Prepared Scene physical-device acceptance

Open the exact preview with `prepared=1` and authenticate normally.

Validate:
1. source photo appears before preparation completes
2. Safari remains responsive during model loading/preparation
3. automatic prepared-object count becomes non-zero, or manual add remains usable
4. at least two distinct prepared objects can move independently
5. dragging can traverse the full photo without page-scroll handoff
6. note whether the guitar is automatically prepared
7. if not, **Add missed object** can add the guitar
8. moved objects expose the shared background plate rather than the original object pixels
9. **Inspect clean background** shows no transparent/black holes
10. normal page scrolling works outside active object drags
11. depth, if completed, reports latency without having blocked movement
12. Safari does not reload/crash from memory pressure
13. reload reprocesses the room rather than implying persistence
14. immutable source photo remains unchanged

Detailed checklist: `docs/PREPARED-SCENE-V1-ACCEPTANCE.md`.

## Current limitations / not yet claimed

- Prepared Scene physical-iPhone acceptance
- comprehensive household-object recognition
- perfect automatic masks
- photorealistic clean-background reconstruction
- persisted multi-object scenes
- Prepared Scene scale/rotate/save
- calibrated camera/floor/wall mapping
- metric depth
- calibrated support relationships
- depth-aware production occlusion
- perspective-correct physical scaling
- contact shadows/relighting
- gravity or rigid-body physics
- native iOS Prepared Scene execution
- production RoomPlan capture/normalization

## Next decision after device test

- If discovery, masks and mobile performance are good: persist Prepared Scene and restore multi-object scale/rotate/save semantics.
- If recognition coverage is the weakness: evaluate a broader open-vocabulary detector behind `ObjectDiscoveryProvider`.
- If local memory/latency is the weakness: keep lightweight local correction/depth where useful and move automatic room preparation to a controlled worker/server path.
- Do not introduce Rapier/RealityKit physics until reliable support/collision geometry exists.

## Authoritative record impact

- `CURRENT-STATE.md`: revision 0.9.8 records the user-confirmed Safari drag fix and CI/preview-validated Prepared Scene application candidate.
- `ARCHITECTURE.md`: revision 0.5.3 establishes Prepared Scene as a durable derived multi-object acceleration layer and `ObjectDiscoveryProvider` boundary.
- `DESIGN-SYSTEM.md`: unchanged; existing photo-first, confidence and source-integrity rules cover this feasibility slice.
- `PROJECT-CONSTITUTION.md`: unchanged; existing spatial-truth, privacy, reversibility and immutable-source rules continue to govern the implementation.
