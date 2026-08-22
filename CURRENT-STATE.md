# FormShift Current State

**Revision:** 0.9.12  
**Date:** 2026-08-22  
**Milestone:** Prepared Scene reaches the correct source photo on iPhone; Safari WebGPU runtime defect corrected with WASM fallback; exact candidate passes CI and preview build; physical re-test pending

FormShift is a **photo-first spatial augmentation product**. The real captured room image is the primary canvas; structured geometry remains the hidden authority. Plan/rectangle views remain secondary technical verification surfaces.

## Production baseline

Production remains on `main` with the validated Photo Arrange v2.2 baseline. Prepared Scene has **not** been promoted to production.

The production baseline retains short-tap object selection, Add/Remove refinement, room pan/zoom, object lift, move/scale/rotate, local background reconstruction, explicit GPT Image background repair, editable saved-placement persistence, and immutable source-photo preservation.

## Confirmed production/candidate interaction behavior

Physical-iPhone testing on 2026-08-22 confirmed the selected guitar can be dragged freely across the full room photograph without the object gesture handing off to page scrolling. Normal page scrolling resumes when the object drag ends.

The candidate also now preserves the requested `/arrange-prepared` route through Google authentication and scopes arrangement restore/parent lineage to the exact `source_asset_id` of the current room photo.

Database evidence confirmed the user's newer room photo was uploaded successfully as asset `38684ffa-ccd5-4333-93d8-7e3f06ff0333`, while prior guitar arrangements referenced older source asset `18a3c504-fd4d-4173-84ba-3bd70b63ada5`. Cross-photo arrangement restore is now blocked.

## Prepared Scene v1 candidate

Branch: `scene-foundation-v1`  
Draft PR: `#1 — Scene Foundation + Prepared Scene v1: multi-object room preparation`

Prepared Scene v1 remains a derived, reversible multi-object acceleration path:

```text
Immutable source photo
   ↓
Object discovery
   ├── local DETR ResNet-50
   └── supplemental MediaPipe room sweep
   ↓
Per-object MediaPipe masks + photographed-pixel cutouts
   ↓
One shared deterministic clean-background plate
   ↓
Multiple independent moveable photo layers
   ↓
Non-blocking Depth Anything V2 Small enrichment
```

Current v1 is intentionally move-only and in-memory. Scale/rotate/save and explicit AI background repair remain in the validated fallback editor until Prepared Scene feasibility is proven on the target iPhone.

## Physical test: Prepared Scene route/source-photo fixes confirmed

A physical-iPhone screenshot on 2026-08-22 confirmed two important corrections:

1. the page visibly identifies itself as **Prepared Scene v1**, proving the dedicated route now survives the preview/authentication flow;
2. the newly uploaded room photo is visible, proving the older guitar arrangement is no longer replacing a newer source photograph.

The screenshot also exposed the next concrete failure before object preparation completed.

## Safari WebGPU runtime defect

The iPhone displayed a local inference error equivalent to:

```text
no available backend found
ERR: [webgpu] TypeError ... webgpuInit ... is undefined
```

Root cause: the local Transformers.js providers treated the existence of `navigator.gpu` as sufficient evidence that the ONNX WebGPU backend was usable. Mobile Safari can expose WebGPU while the particular ONNX/Transformers.js WebGPU initialization path is not compatible enough for this workload.

### Correction

Both local Transformers.js providers now use an explicit backend strategy:

- Apple mobile/WebKit does **not** attempt WebGPU for this candidate;
- iPhone/Safari uses local ONNX **WASM** with one thread and proxy disabled;
- non-Apple browsers may attempt WebGPU;
- if WebGPU initialization fails, the provider retries with WASM instead of aborting.

Affected providers:
- DETR ResNet-50 object discovery
- Depth Anything V2 Small depth estimation

Provider telemetry now identifies whether `transformers.js-webgpu` or `transformers.js-wasm` executed.

### Pipeline resilience correction

Prepared Scene no longer treats DETR object-label discovery as a required step.

If DETR still cannot initialize on a device:

```text
DETR unavailable
   ↓
continue, do not fail scene
   ↓
MediaPipe supplemental room sweep
   ↓
shared clean background
   ↓
ready state
   ↓
Add missed object remains available
```

Depth remains non-blocking enrichment; a depth failure does not disable object manipulation.

## Validation evidence for Safari-safe candidate

Application commit: `3576dfea6ae447c4e6daeeda58fb112003cb0f74`  
GitHub Actions run: `32557339314` — **success**  
Vercel web preview: `dpl_F6uw3Ueh55ockpKCERsXkxzyPdy5` — **READY**

The exact application commit passed:
- repository/security/domain verification
- Arrange/Safari contract guards
- scene/Prepared Scene boundary guards
- dedicated-route/auth-return guard
- source-photo arrangement-lineage guard
- Safari-safe detector/depth backend guards
- client TypeScript check
- API TypeScript check
- production web export

Production remains unchanged. This is build evidence, not physical proof that WASM inference performance and memory use are acceptable on the iPhone.

## Prepared Scene physical-device acceptance — next test

Use the exact Safari-safe `/arrange-prepared` preview candidate.

Expected behavior:
1. `/arrange-prepared` remains active after authentication;
2. the newest room photo remains visible;
3. the prior red WebGPU initialization error does not appear;
4. FormShift progresses from `Finding moveable objects` into segmentation/room-sweep progress;
5. object chips/count appear when preparation finishes;
6. at least two prepared objects can be moved independently;
7. if DETR is unavailable but MediaPipe works, the page still reaches ready state rather than error state;
8. **Add missed object** can prepare a manually indicated object;
9. **Inspect clean background** exposes the shared background plate;
10. Safari remains responsive and does not reload under memory pressure.

GitHub Issue `#3` tracks the physical-device acceptance pass.

## Current limitations / not yet claimed

- completed physical-iPhone Prepared Scene acceptance
- acceptable iPhone WASM latency/memory
- comprehensive household-object recognition
- perfect automatic masks
- photorealistic shared clean-background reconstruction
- persisted multi-object Prepared Scenes
- Prepared Scene scale/rotate/save
- calibrated camera/floor/wall mapping
- metric depth
- calibrated support relationships
- depth-aware production occlusion
- gravity / rigid-body physics
- production RoomPlan capture/normalization

## Next decision

If the Safari-safe candidate completes object preparation with acceptable latency and memory use, continue with multi-object persistence and selective high-quality background reconstruction. If local DETR/Depth WASM is too slow or memory-heavy on iPhone, preserve the provider/Prepared Scene architecture and move the heavy automatic perception workload to a controlled server or native execution path rather than weakening the editor.

## Authoritative record impact

- `CURRENT-STATE.md`: revision 0.9.12 records the physical screenshot evidence, Safari WebGPU incompatibility, WASM/fallback correction, pipeline resilience change, and exact CI/preview validation.
- `ARCHITECTURE.md`: unchanged at revision 0.5.3; provider abstraction and local/cloud/native execution flexibility were already architectural requirements. The backend fallback is an implementation correction within that contract.
- `DESIGN-SYSTEM.md`: unchanged; no durable visual-language change.
- `PROJECT-CONSTITUTION.md`: unchanged; existing spatial-truth, privacy, reversibility, and immutable-source rules continue to govern the implementation.
