# FormShift Current State

**Revision:** 0.9.14  
**Date:** 2026-08-22  
**Milestone:** iPhone screenshot isolated Prepared Scene background-repair failure to production API CORS; compatibility hotfix is deployed; low-confidence unlabeled auto-layers are removed and stale cache generation is bypassed; corrected candidate passes CI and preview deployment; physical re-test pending

FormShift is a **photo-first spatial augmentation product**. The real captured room image is the primary canvas; structured geometry remains the hidden authority. Plan/rectangle views remain secondary technical verification surfaces.

## Production boundary

Production web remains on the validated Photo Arrange v2.2 baseline. Prepared Scene has **not** been promoted to production.

A backward-compatible **production API-only** hotfix was deployed on `main` so authenticated FormShift branch previews can use the existing server image service without promoting experimental UI code:

- main API commit: `674c7b5e86598ca0c671338766b1a3551ac923db`;
- production API deployment: `dpl_3nQ1HZ2DTFPLrt3nLwXKKPKoCD3C` — **READY**;
- controlled FormShift preview origins matching `formshift-web-git-*-lew7.vercel.app` may pass CORS;
- bearer identity and editable project/space authorization remain mandatory;
- `mode: 'prepared-scene'` is opt-in;
- ordinary Photo Arrange requests still use the existing single-object repair behavior when `mode` is omitted.

The production web deployment triggered by that API-only main commit was canceled, so no Prepared Scene UI was promoted by the hotfix.

## Physical iPhone evidence

Physical testing on 2026-08-22 has established:

- `/arrange-prepared` survives preview authentication;
- the newest uploaded room photo stays active instead of being replaced by an arrangement from an older photo;
- Safari-safe ONNX WASM inference reaches an interactive Prepared Scene;
- a real photographed TV was automatically isolated and could be moved independently;
- moving the TV exposed the shared clean-background plate;
- Safari remained responsive during the tested preparation;
- the fast local background contains visible ghosting and is not commercial-quality reconstruction.

The latest user screenshot added two important findings:

1. the red **Load failed** message was produced when **Improve background** attempted to call the image service;
2. a very large cyan selected region showed that the supplemental unlabeled room sweep was auto-promoting broad wall/floor/room regions as moveable objects.

Both findings were investigated against runtime/database evidence rather than treated as cosmetic UI defects.

## Prepared Scene cache evidence from the screenshot session

The private cache itself succeeded before the screenshot failure.

Latest saved row from that test:

- Prepared Scene id: `aae3a435-77e2-4f51-b828-2f0228feec2f`;
- source asset: `38684ffa-ccd5-4333-93d8-7e3f06ff0333`;
- status: `ready`;
- background quality: `quick`;
- object count: **14**;
- DETR provider: `Xenova/detr-resnet-50` through `transformers.js-wasm`;
- detector processing: **8165 ms**;
- supplemental unlabeled layers: **10**.

Storage verification found all expected private derived files:

- 1 shared background;
- 14 masks;
- 14 cutouts.

No missing storage object explained the screenshot error. This proves Prepared Scene persistence creation and private asset upload worked for that session, although refresh/restore behavior still requires direct iPhone confirmation.

## Root cause of `Load failed`

Production API runtime logs at the time of the screenshot showed three `OPTIONS /api/ai/repair-background` requests and **no following POST**. Supabase had no corresponding `ai_runs` record.

Therefore:

```text
Improve background
   ↓
Safari CORS preflight
   ↓
production API did not authorize branch-preview Origin
   ↓
browser blocked POST
   ↓
no FormShift repair handler execution
   ↓
no image-model request
```

The model, cache, and mask compositor did not cause that failure. The production API hotfix described above corrects the origin/endpoint compatibility boundary. Physical browser confirmation is still required.

The branch client also now converts transport failures into a repair-specific message explaining that the optional enhancement could not reach the image service and that the fast local background remains usable, rather than surfacing the browser's generic `Load failed` text.

## Automatic-object quality correction

The screenshot and persisted object metadata showed that broad unlabeled MediaPipe grid masks were not reliable automatic object-discovery evidence. Examples included regions occupying roughly 15–19% of the entire image and touching large room boundaries.

The prior assumption—"a successful segmentation result from a room-grid seed is probably an object"—has been rejected.

The corrected rule is:

> **Automatic Prepared Scene layers require detector evidence. Segmentation shapes pixels; it does not by itself establish object identity.**

Current behavior:

- DETR proposes semantic object candidates;
- MediaPipe segments only those detector-backed candidates automatically;
- duplicate same-label masks are suppressed using overlap/containment checks;
- unlabeled room-grid segmentation is no longer auto-promoted to a moveable object;
- household objects outside DETR's limited COCO vocabulary remain available through explicit **Add missed object**;
- a future broader open-vocabulary detector can replace/supplement DETR behind `ObjectDiscoveryProvider` without reintroducing grid heuristics.

This intentionally prefers fewer credible automatic layers over a larger set containing walls, floors or whole-room regions.

## Prepared Scene cache generation correction

The 14-layer package created by the older heuristic remains historical derived data but must not be restored into the corrected editor.

Prepared Scene persistence now uses generation schema:

`prepared-scene-1.1`

Both restore lookup and parent lookup require the current generation. Older `prepared-scene-1` rows and assets are preserved for provenance but are bypassed by the new candidate. The next iPhone load should therefore perform one fresh detector-backed preparation and cache the corrected package; subsequent loads should restore that new package.

This is derived-state invalidation only. Source photos, measurements and spatial versions are untouched.

## Current Prepared Scene flow

```text
Immutable source photo
   ↓ immediate display
Current-generation cache lookup for exact source photo
   ├── hit → restore private Prepared Scene package
   └── miss → DETR candidate discovery
                 ↓
              MediaPipe segmentation of detector-backed candidates
                 ↓
              Add missed object for unsupported household classes
   ↓
Per-object masks + photographed-pixel cutouts
   ↓
Fast local clean-background plate
   ↓ interaction available
Non-blocking Depth Anything V2 Small enrichment
   ↓
Optional explicit high-quality background repair
   ↓
Accept generated pixels only inside prepared-object mask union
   ↓
Private source-bound Prepared Scene version
```

Prepared Scene remains derived evidence and never overwrites the source photograph, canonical measurements, or spatial versions.

## Explicit high-quality background repair

**Improve background** remains explicit because room imagery is private household data.

The image-repair path:

- sends the source photograph plus the union of accepted object masks;
- uses `mode: 'prepared-scene'`;
- records a dedicated `prepared-scene-background-repair` AI task when the server request executes;
- reconstructs the hidden regions as one coherent room;
- composites back **only pixels inside the prepared-object mask union**;
- preserves original source pixels everywhere else;
- leaves the fast local background usable if remote enhancement fails.

The default configured image model remains `openai/gpt-image-2` unless the server environment overrides it.

## Prepared Scene persistence/security foundation

Supabase migrations `prepared_scenes_v1` and `prepared_scenes_performance` are deployed to project `oomtpnqprxykcjzrlfgc`.

`public.prepared_scenes` stores source-bound derived versions with private asset lineage, background quality, object transforms, provider metadata, creator and status.

Security/performance state:

- RLS enabled;
- authenticated SELECT + INSERT only;
- anonymous SELECT denied;
- project-reader SELECT policy;
- project-editor INSERT policy with creator/project-space checks;
- private storage authorization remains project-path scoped;
- covering Prepared Scene foreign-key indexes are deployed.

Prepared Scene does not write `measurement_observations`, `spatial_versions`, or canonical geometry.

## Validation evidence for corrected candidate

Functional/guard commit: `cc9ba1a071c9460a96c08c78ab40645ed2b3052a`  
GitHub Actions run: `32585686888` — **success**  
Vercel web preview: `dpl_3z9w5fZyrZm3YPMJ9RdbSzsL8hko` — **READY**  
Stable branch alias: `formshift-web-git-scene-foundation-v1-lew7.vercel.app`

The exact functional candidate passed:

- repository/security/domain verification;
- Arrange/Safari regression guards;
- scene/Prepared Scene boundary guards;
- detector-backed automatic-object acceptance guard;
- old cache-generation invalidation guard;
- dedicated route/auth-return guard;
- source-photo lineage guard;
- Safari-safe detector/depth inference guards;
- Prepared Scene persistence/source-lineage guards;
- explicit masked-repair guards;
- client TypeScript check;
- API TypeScript check;
- production web export.

This is build/deployment evidence. It is **not yet physical proof** that the production API CORS hotfix now allows the iPhone repair POST or that `prepared-scene-1.1` restores correctly after refresh.

## Next physical-device acceptance

Use `/arrange-prepared` on the stable branch alias and hard refresh once.

Expected sequence:

1. the old 14-layer `prepared-scene-1` package is ignored;
2. one fresh detector-backed preparation runs;
3. the large room-region cyan masks from the old unlabeled sweep do not reappear;
4. detector-backed objects such as the TV may appear automatically;
5. use **Add missed object** for furniture/items DETR does not know;
6. wait for **saved privately**;
7. refresh and confirm the corrected scene restores without full reprocessing;
8. move the TV to expose its old location;
9. press **Improve background** and keep objects still until it finishes;
10. confirm the red generic `Load failed` is gone and the repair either completes or gives the new specific fallback message;
11. if repair completes, move the TV again and compare the old location;
12. use **Inspect clean background** to judge the repaired plate directly.

## Current limitations / not yet claimed

- physical confirmation of `prepared-scene-1.1` cache restore;
- physical confirmation of successful Prepared Scene image-service POST after the CORS hotfix;
- commercial-quality hidden-background reconstruction;
- comprehensive automatic household-object recognition;
- open-vocabulary automatic discovery;
- perfect automatic masks;
- Prepared Scene scale/rotate controls;
- calibrated camera/floor/wall mapping;
- metric depth;
- calibrated support relationships;
- depth-aware production occlusion;
- gravity / rigid-body physics;
- production RoomPlan capture/normalization.

## Next decision

If the corrected cache and repair path validate on iPhone, keep this detector-backed Prepared Scene substrate and move to a stronger open-vocabulary discovery provider rather than reviving grid heuristics. After object identity/mask quality is adequate, proceed to calibrated depth/support/occlusion and only then physical constraints/physics.

## Authoritative record impact

- `CURRENT-STATE.md`: revision 0.9.14 records the screenshot evidence, successful private cache creation, CORS root cause, deployed production API compatibility fix, detector-backed automatic-layer correction, cache-generation invalidation and exact CI/preview evidence.
- `ARCHITECTURE.md`: unchanged at revision 0.5.4; the correction brings implementation back into the existing provider architecture where `ObjectDiscoveryProvider` supplies object evidence and segmentation supplies masks. No new durable architecture is introduced.
- `DESIGN-SYSTEM.md`: unchanged; no durable visual-language or interaction-contract change.
- `PROJECT-CONSTITUTION.md`: unchanged; immutable source, privacy, provenance and canonical-spatial-truth rules remain intact.
