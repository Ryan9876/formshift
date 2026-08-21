# FormShift Current State

**Revision:** 0.9.6  
**Date:** 2026-08-21  
**Milestone:** Scene Foundation v1 candidate passes complete CI and preview export; production promotion pending real-device Safari gesture acceptance

FormShift is a **photo-first spatial augmentation product**. The real captured room image is the primary canvas; structured geometry remains the hidden authority. Plan/rectangle views are secondary technical verification surfaces.

## Production application baseline

The production application remains the validated Photo Arrange v2.2 baseline on `main`.

Production baseline capabilities include:
- short-tap photographed-object selection without Safari taking over the gesture
- candidate mask preview and Add / Remove refinement
- explicit Pan/review mode and room zoom
- explicit object lift
- direct object move plus scale/rotation
- local object-free background reconstruction
- explicit authenticated AI background reconstruction through `openai/gpt-image-2`
- editable saved-placement persistence using background + mask + cutout + transform + lineage
- immutable source-room-photo preservation

The previously validated AI repair production test completed successfully with `openai/gpt-image-2` in 24,880 ms and materially improved the removed-object background relative to the deterministic local fallback.

The v2.1 image-space perspective/contact experiment remains rolled back because real-device testing showed it could prevent object selection. No screen-Y placement heuristic has been restored to production.

## Scene Foundation v1 candidate

Implementation branch: `scene-foundation-v1`  
Draft PR: `#1 — Scene Foundation v1: depth evidence, RLS persistence, and CI guards`

The candidate implements the next-cycle architectural foundation while leaving production application traffic unchanged.

### Canonical Arrange boundary

The active candidate Arrange route uses one canonical `PhotoArrangeEditor` boundary instead of routing through the active `V17 → V19 → V20` wrapper chain.

- the validated v2.2 interaction/editing implementation remains underneath the canonical boundary
- object-centered MediaPipe segmentation is isolated into a provider adapter
- the active canonical boundary does not use runtime `MutationObserver`, UI-state text scraping, or programmatic button clicks to coordinate editor behavior
- explicit AI background repair remains available in the v2.2 core
- former V19/V20 source files remain temporarily as rollback/comparison artifacts until device acceptance

This refactor is preview-build and CI validated but **not yet fully real-device interaction validated**.

## Real-device finding — object drag hands off to page scrolling

The iPhone acceptance pass established a specific failure mode:

- the restored guitar is movable
- when dragged to roughly the middle/lower portion of the room photo, the guitar stops following the finger
- the same finger then begins vertically scrolling the surrounding page
- therefore the failure is a browser gesture-handoff problem, not a spatial position limit

Code inspection confirms the saved-position clamp already permits normalized object centers from `0.02` through `0.98` in both axes.

### First workaround — rejected

The first candidate attempted to keep the transparent selected-object handle active by expanding it over the photo while CSS `:active` was present.

Physical-device testing showed that workaround did **not** solve the problem: Safari still transferred the gesture to page scrolling around the middle of the photo.

That CSS active-state workaround has been removed from the candidate and is no longer the intended solution.

### Current Safari gesture bridge

The replacement remains isolated in the canonical web boundary and does not change Arrange transform math.

While a gesture begins directly on the selected-object move handle:
- the canonical boundary records the active pointer ID(s)
- a capture-phase `window.pointermove` listener continues tracking the pointer if Safari retargets it away from the moving handle
- when a trusted pointer event is no longer targeted at the original move handle, an equivalent pointer event is forwarded to that original handle so the existing v2.2 transform code continues to receive movement
- a capture-phase, **non-passive** `document.touchmove` listener calls `preventDefault()` only while an object drag is active, preventing the browser from converting the active object drag into page scrolling
- pointer up/cancel immediately clears the bridge and normal page scrolling resumes

Unchanged:
- normalized `0.02–0.98` position bounds
- object scale/rotation math
- saved transform schema
- source-photo integrity
- outside-object room gestures when no object drag is active

Functional gesture bridge commit: `2af366c1ade33c374e83845f6330802c33669188`  
Arrange regression guard: `b5d028d073ff660b0c824cd95c8e21ea7f8965c4`

The lower-photo drag is **not claimed fixed until the physical iPhone re-test passes**.

## SceneAnalysis contract

The candidate adds a typed, versioned derived-scene contract containing:
- source photo identity
- relative depth artifact provenance
- provider/model/model-version metadata
- support surfaces
- object evidence hooks
- confidence state
- processing latency
- notes/limitations

Scene analysis is derived evidence. It cannot silently mutate:
- room measurements
- physical object dimensions
- canonical spatial coordinates
- measurement provenance
- immutable source photographs

## Local depth provider

The web candidate includes an opt-in browser-local `Depth Anything V2 Small` provider through a pinned Transformers.js/ONNX path.

Feature flags default to off:
- `EXPO_PUBLIC_SCENE_INTELLIGENCE_V1=false`
- `EXPO_PUBLIC_SCENE_DEPTH_DIAGNOSTICS=false`

The first enabled run is user-triggered. Relative depth is explicitly labeled **Estimated augmentation** and is not represented as metric distance or proof of fit.

The current scene layer includes support-region and depth-ordering primitives. **Depth-aware occlusion is not yet wired into the production renderer**, and full physics/gravity is intentionally deferred until scene/support geometry is validated.

## Live database state — Scene Intelligence

The dedicated FormShift Supabase project has two deployed additive migrations:

1. `scene_intelligence_v1`
   - creates `public.scene_analyses`
   - stores derived scene-analysis metadata separately from canonical spatial state
   - RLS enabled
   - authenticated SELECT + INSERT only
   - anonymous SELECT denied
   - project read/edit policies enforced through existing private authorization helpers
2. `scene_intelligence_performance`
   - adds foreign-key indexes for source asset, depth asset, and creator

Live verification confirmed RLS, expected grants/policies, anonymous denial, and the expected scene foreign-key indexes. No existing room, spatial-version, measurement, photo-arrangement, or source-photo records were mutated by these migrations.

## API authentication hardening

The candidate API verifies bearer identity with Supabase `auth.getClaims()` through a request-token-scoped client before RLS-scoped database work.

The verified-claims path now fails closed when the SDK returns an error, missing claims, or a missing subject. Existing active-user, owner, and editable-space authorization checks remain in place.

## CI/release hardening

The candidate CI exercises:
- repository/source validation
- security validation
- canonical domain tests
- Arrange v2.2 contract guards
- Safari active-object drag/scroll-handoff guards
- scene-boundary isolation guards
- client TypeScript checking
- API TypeScript checking
- production web export

The first complete typecheck exposure found and corrected three previously masked client contract issues:
- optional saved-arrangement asset IDs are now narrowed before Map lookup/signing
- native/non-web `PhotoArrangeEditor` accepts the same `baseSpatialVersionId` prop contract as the canonical workspace
- the React Native `absoluteFillObject` runtime compatibility used by the existing Arrange overlay now has an explicit TypeScript compatibility declaration

The subsequent API typecheck exposed and corrected nullable `getClaims()` data handling.

GitHub Actions run `32499563718` completed successfully on candidate head `e91df864dcf805387218dc0ff57581c0b22c54d7`. Repository/security/domain/Arrange/scene guards, client typecheck, API typecheck, and production web export all passed. Matching Vercel web preview deployment `dpl_4n9awo7joipaP9mzuwmyEJy6EuKk` reached READY on that exact commit. The remaining release gate is physical-iPhone interaction acceptance; CI/build success is not treated as proof that Safari gesture handoff is resolved.

## Current accuracy boundaries

Not yet claimed:
- confirmed resolution of the lower-half drag/page-scroll handoff on iPhone
- completed real-device validation of the canonical Arrange boundary
- calibrated camera/floor/wall mapping
- metric depth from a normal photograph
- calibrated floor snapping
- depth-aware production occlusion
- perspective-aware physical scaling
- physically correct contact shadows
- gravity/rigid-body simulation
- calibrated relighting
- native iOS continuous photo manipulation
- production RoomPlan capture/normalization
- dedicated persisted blueprint PDF

## Required real-device acceptance before application promotion

Using the candidate preview with Scene Intelligence **off**:
1. hard refresh **Arrange**
2. confirm the latest saved guitar restores active/movable
3. drag the guitar continuously from its current position through the lower half to near the bottom edge
4. confirm the page does **not** scroll while that object drag remains active
5. release the guitar and confirm normal page scrolling immediately returns
6. drag the guitar back upward
7. verify a gesture beginning outside the selected object still navigates the room rather than moving the object
8. choose **Keep placement** near the lower portion of the room
9. drag again immediately and confirm it remains editable
10. refresh/reopen Arrange and confirm the lower transform restores
11. change scale/rotation, save, reopen, and confirm restoration
12. select a fresh object and verify short-tap selection plus Add / Remove / Pan / Undo / Redo
13. verify room pinch/pan does not accidentally select or move the object
14. lift/save a fresh object with AI repair off and confirm editable restoration
15. run explicit AI background repair and confirm the request starts/completes without affecting interaction

Scene Intelligence may be enabled in preview only after this regression pass succeeds.

## Next implementation decision

If the Safari gesture bridge passes the full-photo guitar drag and the remaining canonical Arrange device checks, merge/promote the refactor and then evaluate Scene Intelligence v1 in preview.

The next scene work remains floor/support/depth-order calibration before production occlusion or Rapier/RealityKit physics.

Do not reintroduce image-space placement heuristics on top of uncalibrated depth.

## Authoritative record impact

- `CURRENT-STATE.md`: revision 0.9.6 records the complete CI pass and exact READY preview while preserving the pending physical-iPhone acceptance boundary.
- `ARCHITECTURE.md`: unchanged in this correction; durable SceneAnalysis/provider/persistence and canonical Arrange decisions remain revision 0.5.2.
- `DESIGN-SYSTEM.md`: unchanged; no durable visual-language or interaction-policy change was required.
- `PROJECT-CONSTITUTION.md`: unchanged; source integrity, privacy, reversibility, deterministic spatial truth, and measurement-provenance rules continue to govern the implementation.
