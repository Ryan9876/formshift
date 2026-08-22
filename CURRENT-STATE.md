# FormShift Current State

**Revision:** 0.9.13  
**Date:** 2026-08-22  
**Milestone:** Prepared Scene is physically proven on iPhone; source-bound private caching and explicit masked high-quality background repair are implemented and build-validated; database support is deployed; device validation of persistence/repair remains pending

FormShift is a **photo-first spatial augmentation product**. The real captured room image is the primary canvas; structured geometry remains the hidden authority. Plan/rectangle views remain secondary technical verification surfaces.

## Production baseline

Production remains on `main` with the validated Photo Arrange v2.2 baseline. Prepared Scene has **not** been promoted to production.

The production baseline retains short-tap object selection, Add/Remove refinement, room pan/zoom, object lift, move/scale/rotate, local background reconstruction, explicit GPT Image background repair, editable saved-placement persistence, and immutable source-photo preservation.

## Physical iPhone evidence

Physical testing on 2026-08-22 has now established:

- the validated guitar can be dragged across the full photo without Safari handing the gesture to page scrolling;
- `/arrange-prepared` survives preview authentication and opens the Prepared Scene editor;
- the newest uploaded room photo remains the active source rather than being replaced by a saved arrangement from an older photo;
- Safari-safe WASM inference reaches Prepared Scene instead of failing in the ONNX WebGPU initialization path;
- at least one real photographed object (the TV) was automatically prepared as an independent layer and could be moved on the iPhone.

The TV test materially validates the **Prepared Scene interaction architecture**, but not its commercial quality. The same screenshot showed two remaining quality gaps clearly: the quick clean-background plate left visible ghosting at the TV's original location, and automatic object coverage remained sparse.

GitHub Issue `#3` remains the physical-device acceptance record.

## Prepared Scene candidate

Branch: `scene-foundation-v1`  
Draft PR: `#1 — Scene Foundation + Prepared Scene v1: multi-object room preparation`

Current target flow:

```text
Immutable source photo
   ↓ immediate display
Cache lookup for exact source photo
   ├── hit → restore private Prepared Scene package
   └── miss → local preparation
                 ├── DETR object discovery where available
                 └── MediaPipe supplemental room sweep
   ↓
Per-object masks + photographed-pixel cutouts
   ↓
Fast local clean-background plate
   ↓ interaction available
Non-blocking Depth Anything V2 Small enrichment
   ↓
Optional explicit high-quality background repair
   ↓
Private source-bound Prepared Scene version
```

Prepared Scene remains derived evidence and never overwrites the source photograph, canonical measurements, or spatial versions.

## Prepared Scene private persistence — deployed database foundation

Two new Supabase migrations are **deployed** to project `oomtpnqprxykcjzrlfgc`:

- `prepared_scenes_v1`
- `prepared_scenes_performance`

`public.prepared_scenes` stores immutable, source-bound derived scene packages with:

- project/space identity;
- exact `source_asset_id` lineage;
- optional parent Prepared Scene lineage;
- private clean-background asset reference;
- background quality (`quick` / `ai_repaired`);
- per-object derived metadata/transforms;
- provider/model metadata;
- creator/timestamps/status.

Security/performance verification after migration:

- RLS enabled;
- authenticated SELECT + INSERT only;
- anonymous SELECT denied;
- project-reader SELECT policy;
- project-editor INSERT policy with creator/project-space checks;
- covering indexes for source, space, project, parent, background asset, and creator foreign key;
- existing private-storage policies authorize paths by the leading project UUID, so the new `${projectId}/${spaceId}/prepared/...` path shape is compatible with the current private bucket contract.

The latest Supabase performance advisor no longer reports an unindexed Prepared Scene foreign key. It still reports older `photo_arrangements` foreign-key indexing debt and expected unused-index notices. The security advisor reports two pre-existing warnings unrelated to Prepared Scene: the shelving acceptance SECURITY DEFINER RPC is executable by authenticated users, and leaked-password protection is disabled.

## Prepared Scene cache behavior implemented

The candidate now attempts to restore a Prepared Scene for the **exact current room-photo asset** before rerunning perception.

A cached scene restores:

- clean background;
- per-object mask and cutout assets;
- image-space transforms;
- mobility/support semantics;
- available relative-depth evidence;
- provider provenance.

If no usable cache exists, the room is prepared locally. Fresh preparation becomes interactive before persistence completes, and a private derived version is cached afterward. Users can explicitly **Save scene / Save changes** after manipulating objects.

Prepared assets use the existing private bucket and are registered in `assets` with dedicated derived kinds:

- `prepared_scene_background_quick_v1`
- `prepared_scene_background_ai_v1`
- `prepared_scene_object_mask_v1`
- `prepared_scene_object_cutout_v1`

Persistence does not write `measurement_observations`, `spatial_versions`, or ordinary Photo Arrange records.

## Broader automatic discovery

The supplemental MediaPipe room sweep was expanded from 12 to 20 probes and the maximum automatic prepared-object count from 14 to 18. This is still a bounded feasibility approach, not a claim of complete household-object recognition. DETR remains a lightweight semantic provider with incomplete COCO vocabulary; **Add missed object** remains the correction path.

## Explicit high-quality clean-background repair

Prepared Scene now exposes **Improve background** as an explicit action rather than silently uploading household imagery.

The repair path:

```text
immutable source photo
   +
union of prepared-object masks
   ↓
authenticated image-repair request
   ↓
photorealistic reconstruction candidate
   ↓
accept only pixels inside expanded prepared-object masks
   ↓
clean background plate
   ↓
private Prepared Scene version
```

The image service supports a Prepared Scene multi-object repair task and logs the provider/model/latency. The default configured image model remains `openai/gpt-image-2` unless the server environment overrides it.

Important integrity rule: FormShift does **not** accept the generated image wholesale. Only repaired pixels inside the prepared-object mask union are composited back into the immutable source-photo coordinate frame. Unmasked room pixels remain source pixels even if the provider attempted unrelated changes.

If cloud repair fails, the fast local clean plate remains usable. Adding another missed object intentionally returns the background state to `quick` until that new hidden region is repaired again.

## Safari inference contract

Local Transformers.js providers use the current compatibility rule:

- Apple mobile/WebKit: ONNX WASM, one thread, proxy disabled;
- non-Apple browsers: WebGPU may be attempted;
- WebGPU initialization failure falls back to WASM;
- DETR failure does not abort Prepared Scene; MediaPipe room sweep continues;
- depth failure never blocks object movement.

## Validation evidence for current candidate

Current exact branch head: `145bee5c9572e840e39fe0f2ff8b7ef8478b0d5a`  
GitHub Actions run: `32561509006` — **success**  
Vercel web preview: `dpl_76aAjk8tc1cqZ9kAjHhTgaYwqDF7` — **READY**  
Vercel API preview: `dpl_AaeekafjQ4DAGxAkDn7FHcvNwfoE` — **READY**

The exact branch head passed:

- repository/security/domain verification;
- Arrange/Safari regression guards;
- scene/Prepared Scene boundary guards;
- dedicated route/auth-return guard;
- source-photo lineage guards;
- Safari-safe inference guards;
- Prepared Scene persistence/source-lineage guards;
- explicit masked-repair guards;
- client TypeScript check;
- API TypeScript check;
- production web export.

An earlier CI run correctly caught a TypeScript narrowing error in Prepared Scene restore; that defect was corrected before this validated head.

This is **code/build/deployed-database evidence**, not physical proof that cache upload/restore and AI clean-background quality work acceptably on the iPhone.

## Next physical-device acceptance

Use the stable branch preview `/arrange-prepared` route.

Test in this order:

1. let the room reach Ready and allow the initial private cache to finish;
2. move the TV and at least one other prepared/missed object;
3. tap **Save changes**;
4. refresh and verify the object positions restore without repeating the full discovery workflow;
5. tap **Improve background** and wait for completion;
6. move the TV away from its original location again;
7. inspect whether the old-TV ghosting is materially reduced;
8. tap **Inspect clean background** to evaluate the repaired plate directly;
9. use **Add missed object** on an object the automatic pass did not prepare;
10. save, refresh, and verify the added object also restores.

Do not interpret the quick local background as the target photorealistic result; it is the immediate fallback while explicit repair runs.

## Current limitations / not yet claimed

- physical validation of Prepared Scene private cache upload/restore;
- physical validation of Prepared Scene high-quality background repair;
- commercial-quality hidden-background reconstruction;
- comprehensive automatic household-object recognition;
- perfect automatic masks;
- Prepared Scene scale/rotate controls;
- calibrated camera/floor/wall mapping;
- metric depth;
- calibrated support relationships;
- depth-aware production occlusion;
- gravity / rigid-body physics;
- production RoomPlan capture/normalization.

## Next decision

If iPhone persistence and masked repair validate, keep Prepared Scene as the shared photo-layer substrate and move next to depth ordering/support surfaces. If repair quality is weak, retain the cache/mask architecture and change the reconstruction provider rather than rebuilding object manipulation. If automatic recognition remains too sparse, evaluate a broader discovery provider behind `ObjectDiscoveryProvider` before increasing client-side complexity.

## Authoritative record impact

- `CURRENT-STATE.md`: revision 0.9.13 records physical Prepared Scene proof, deployed private persistence foundation, broader discovery, explicit masked background repair, and exact CI/Vercel validation.
- `ARCHITECTURE.md`: updated separately because Prepared Scene persistence and masked AI-repair boundaries are now durable architecture, not an ephemeral feasibility assumption.
- `DESIGN-SYSTEM.md`: unchanged; existing photo-first, explicit AI action, and confidence-label rules still apply.
- `PROJECT-CONSTITUTION.md`: unchanged; this implementation enforces existing immutable-source, privacy, provenance, and reversibility rules.
