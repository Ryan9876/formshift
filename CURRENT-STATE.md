# FormShift Current State

**Revision:** 0.9.15  
**Date:** 2026-08-22  
**Milestone:** corrected detector-backed Prepared Scene physically validated on iPhone through object discovery, movement, depth enrichment, GPT Image background repair, and private `prepared-scene-1.1` persistence; refresh/restore acceptance remains pending

FormShift is a **photo-first spatial augmentation product**. The real captured room image is the primary canvas; structured geometry remains the hidden authority. Plan/rectangle views remain secondary technical verification surfaces.

## Production boundary

Production web remains on the validated Photo Arrange v2.2 baseline. Prepared Scene has **not** been promoted to production.

A backward-compatible production API-only hotfix on `main` allows authenticated FormShift branch previews to use the existing image service while preserving bearer identity and project/space edit authorization. Prepared Scene repair is opt-in through `mode: 'prepared-scene'`; existing single-object Photo Arrange repair remains the default when the mode is omitted.

Production API deployment `dpl_3nQ1HZ2DTFPLrt3nLwXKKPKoCD3C` is READY.

## Corrected physical iPhone evidence — 2026-08-22 12:56 EDT

The corrected Prepared Scene candidate has now passed a materially stronger physical-device test.

Observed on the user's iPhone and corroborated by persisted runtime evidence:

- the old `prepared-scene-1` 14-layer package was bypassed;
- a fresh `prepared-scene-1.1` preparation ran;
- the previous giant wall/floor/whole-room false selections did not reappear;
- automatic preparation produced **2 detector-backed objects** rather than 14 heuristic layers;
- TV detection confidence: **0.9839**;
- couch detection confidence: **0.9712**;
- supplemental unlabeled auto-sweep count: **0**;
- the TV remained a coherent photographed-pixel layer and was moved from normalized x≈0.841 to x≈0.409;
- Depth Anything V2 Small completed through Safari-safe WASM in **6,396 ms**;
- Safari remained responsive through detector inference, depth enrichment, object movement, and AI repair.

This validates the correction that **automatic Prepared Scene layers require detector evidence**. Segmentation still shapes the object mask, but segmentation alone no longer establishes object identity.

## Private Prepared Scene persistence evidence

Fresh corrected quick-cache row:

- id: `d1cbc9f3-d796-4b50-a82c-7a446ab1e39e`;
- schema: `prepared-scene-1.1`;
- background quality: `quick`;
- object count: 2;
- detector: `Xenova/detr-resnet-50` via `transformers.js-wasm`;
- detector latency: **10,706 ms**;
- automatic acceptance: `detector-backed-only`.

Newest repaired row:

- id: `923748d5-3d27-4690-a28f-d6d2faf5a8a0`;
- schema: `prepared-scene-1.1`;
- status: `ready`;
- background quality: `ai_repaired`;
- object count: 2;
- moved TV transform persisted;
- couch transform persisted;
- relative-depth evidence persisted;
- provider/model provenance persisted.

The previous heuristic row `aae3a435-77e2-4f51-b828-2f0228feec2f` remains historical derived data but is not eligible for current-generation restore.

## High-quality background repair — physically validated transport and persistence

The earlier red `Load failed` was traced to Safari CORS preflight blocking the POST before the image model was reached. The production API compatibility fix has now passed physical validation.

A real corrected-candidate request created AI run:

- task: `prepared-scene-background-repair`;
- provider/model: `openai/gpt-image-2`;
- status: `completed`;
- server-recorded latency: **27,148 ms**;
- client-observed end-to-end repair path: about **30.5 s**.

The generic red `Load failed` did not recur. The resulting repaired background was persisted as the newest `prepared-scene-1.1` version.

FormShift still accepts generated pixels only inside the expanded union of accepted prepared-object masks. Unmasked room pixels remain source-photo pixels.

## Current Prepared Scene flow

```text
Immutable source photo
   ↓ immediate display
Current-generation cache lookup for exact source photo
   ├── hit → restore private Prepared Scene package
   └── miss → DETR semantic candidates
                 ↓
              MediaPipe segmentation of detector-backed objects
                 ↓
              Add missed object for unsupported household classes
   ↓
Per-object masks + photographed-pixel cutouts
   ↓
Fast local clean-background plate
   ↓ interaction available
Non-blocking Depth Anything V2 Small enrichment
   ↓
Optional explicit GPT/image-provider background repair
   ↓
Accept repaired pixels only inside object-mask union
   ↓
Private source-bound Prepared Scene version
```

Prepared Scene remains derived evidence and never overwrites the immutable source photograph, canonical measurements, or spatial versions.

## Validation evidence for functional candidate

Functional/guard commit: `cc9ba1a071c9460a96c08c78ab40645ed2b3052a`  
GitHub Actions run: `32585686888` — **success**  
Vercel web preview: `dpl_3z9w5fZyrZm3YPMJ9RdbSzsL8hko` — **READY**  
Stable branch alias: `formshift-web-git-scene-foundation-v1-lew7.vercel.app`

The candidate passed repository/security/domain verification, Arrange/Safari guards, detector-backed acceptance and cache-generation guards, auth/source-lineage guards, client/API TypeScript checks, and production web export.

## Remaining physical acceptance

The next test is deliberately narrow:

1. refresh `/arrange-prepared`;
2. confirm the `prepared-scene-1.1` package restores without rerunning full DETR preparation;
3. confirm the TV returns at its saved moved position and the couch returns as the second detector-backed object;
4. confirm the AI-repaired background restores rather than reverting to the quick local plate;
5. move the TV again and directly inspect its old location;
6. use **Inspect clean background** to judge reconstruction quality;
7. test **Add missed object** on one unsupported household item and verify save/refresh/restore.

## Current limitations / not yet claimed

- physical confirmation of current-generation cache restore after refresh;
- direct visual acceptance of repaired hidden-background quality;
- comprehensive/open-vocabulary automatic household-object recognition;
- perfect automatic masks;
- Prepared Scene scale/rotate controls;
- calibrated camera/floor/wall mapping;
- metric depth;
- calibrated support relationships;
- depth-aware production occlusion;
- gravity / rigid-body physics;
- production RoomPlan capture/normalization.

## Next decision

If refresh/restore and repaired-background visual quality pass, keep Prepared Scene as the shared photo-layer substrate and replace/augment DETR with a stronger open-vocabulary discovery provider behind `ObjectDiscoveryProvider`. Do not revive unlabeled grid heuristics. After object identity/mask coverage is adequate, proceed to calibrated depth/support/occlusion and then physical constraints/physics.

## Authoritative record impact

- `CURRENT-STATE.md`: updated to revision 0.9.15 for the corrected iPhone detector/depth/movement/AI-repair/persistence evidence and narrowed remaining acceptance gate.
- `ARCHITECTURE.md`: unchanged at revision 0.5.4; current behavior conforms to the existing provider and derived-scene architecture.
- `DESIGN-SYSTEM.md`: unchanged; no durable visual or interaction-contract change.
- `PROJECT-CONSTITUTION.md`: unchanged; immutable source, privacy, provenance, reversibility, and canonical-spatial-truth rules remain intact.
