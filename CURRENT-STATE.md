# FormShift Current State

**Revision:** 0.9.3  
**Date:** 2026-08-21  
**Milestone:** Scene Foundation v1 implemented on an isolated candidate branch; database foundation deployed; application production promotion pending real-device acceptance

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

The active candidate Arrange route now uses one canonical `PhotoArrangeEditor` boundary instead of routing through the active `V17 → V19 → V20` wrapper chain.

- the validated v2.2 interaction/gesture implementation remains frozen underneath the canonical boundary
- object-centered MediaPipe segmentation is isolated into a provider adapter
- the active canonical boundary does not use `MutationObserver`, UI text scraping, programmatic button clicks, or inline-style substring matching to coordinate behavior
- explicit AI background repair remains available in the frozen v2.2 core
- the former V19/V20 source files are retained temporarily as rollback/comparison artifacts and are not deleted before device acceptance

This refactor is preview-build validated but **not yet real-device interaction validated**.

### SceneAnalysis contract

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

### Local depth provider

The web candidate includes an opt-in browser-local `Depth Anything V2 Small` provider through a pinned Transformers.js/ONNX path.

Feature flags default to off:
- `EXPO_PUBLIC_SCENE_INTELLIGENCE_V1=false`
- `EXPO_PUBLIC_SCENE_DEPTH_DIAGNOSTICS=false`

The first enabled run is user-triggered. Relative depth is explicitly labeled **Estimated augmentation** and is not represented as metric distance or proof of fit.

The current scene layer includes support-region and depth-ordering primitives. **Depth-aware occlusion is not yet wired into the production renderer**, and full physics/gravity is intentionally deferred until scene/support geometry is validated.

## Live database state — Scene Intelligence

The dedicated FormShift Supabase project has been updated with two additive migrations:

1. `scene_intelligence_v1`
   - creates `public.scene_analyses`
   - stores derived scene-analysis metadata separately from canonical spatial state
   - RLS enabled
   - authenticated SELECT + INSERT only
   - anonymous SELECT denied
   - project read/edit policies enforced through existing private authorization helpers
2. `scene_intelligence_performance`
   - adds foreign-key indexes for source asset, depth asset, and creator

Live verification confirmed:
- RLS enabled on `scene_analyses`
- authenticated SELECT = allowed
- authenticated INSERT = allowed
- anonymous SELECT = denied
- both scene policies present
- expected scene foreign-key indexes present

No existing room, spatial-version, measurement, photo-arrangement, or source-photo records were mutated by these migrations.

## API authentication hardening

The candidate API now verifies bearer identity with Supabase `auth.getClaims()` through a request-token-scoped client before RLS-scoped database work. Existing active-user, owner, and editable-space authorization checks remain in place.

This change was made because the new security gate correctly rejected the older `getUser(token)` implementation against the repository's intended verified-claims contract. The gate was not weakened.

## Verification and release gates

The candidate adds repository-level release checks for:
- repository/source validation
- security validation
- canonical domain tests
- Arrange v2.2 contract guards
- scene-boundary isolation guards
- client TypeScript checking
- API TypeScript checking
- production web export

A GitHub Actions workflow now runs these checks for pull requests and selected pushes.

Vercel preview deployments for the canonical Arrange refactor have built successfully for both web and API. The candidate remains a preview/draft and has **not** been promoted to production.

The current environment does not provide credible evidence for a complete automated browser gesture suite or physical-iPhone interaction. Those remain release gates rather than being inferred from successful builds.

## Current accuracy boundaries

Not yet claimed:
- real-device validation of the canonical Arrange boundary
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

On the user's iPhone/browser using the candidate preview:
1. open **Arrange** after a hard refresh
2. confirm the latest saved object restores as an active movable object
3. drag it substantially downward
4. choose **Keep placement**
5. drag it again immediately and confirm it remains editable
6. refresh/reopen Arrange and confirm transform restoration
7. change scale/rotation, save, reopen, and confirm restoration
8. select a fresh object and verify short-tap selection still works
9. verify Add / Remove / Pan / Undo / Redo refinement behavior
10. verify room pinch/pan does not accidentally select or move the object
11. lift/save a fresh object with AI repair off and confirm editable restoration
12. run explicit AI background repair and confirm the request starts/completes without affecting selection/gesture behavior

Scene Intelligence should remain off for this first regression pass. It may then be enabled in preview for a separate depth/support evaluation.

## Next implementation decision

If the canonical Arrange candidate passes the device regression gate, merge/promote the refactor and then evaluate Scene Intelligence v1 in preview. The next scene work should calibrate floor/support/depth ordering before enabling occlusion or adding Rapier/RealityKit physics behavior.

Do not reintroduce additional image-space placement heuristics on top of uncalibrated depth.

## Authoritative record impact

- `CURRENT-STATE.md`: revision 0.9.3 records the live Scene Intelligence database migrations and the unpromoted Scene Foundation v1 application candidate.
- `ARCHITECTURE.md`: revision 0.5.2 records the durable SceneAnalysis/provider/persistence and canonical Arrange boundary decisions.
- `DESIGN-SYSTEM.md`: unchanged; existing source/estimated/calibrated confidence language and photo-first interaction rules already cover this cycle.
- `PROJECT-CONSTITUTION.md`: unchanged; existing source integrity, privacy, reversibility, deterministic spatial truth, and measurement-provenance rules already govern the implementation.
