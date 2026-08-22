# FormShift Current State

**Revision:** 0.9.10  
**Date:** 2026-08-22  
**Milestone:** Prepared Scene v1 has a route-explicit test entrypoint; exact preview and CI validated, physical-iPhone Prepared Scene behavior pending

FormShift is a **photo-first spatial augmentation product**. The real captured room image is the primary canvas; structured geometry remains the hidden authority. Plan/rectangle views remain secondary technical verification surfaces.

## Production baseline

Production remains on `main` with the validated Photo Arrange v2.2 baseline. Prepared Scene has **not** been promoted to production.

The production baseline retains short-tap object selection, Add/Remove refinement, room pan/zoom, object lift, move/scale/rotate, local background reconstruction, explicit GPT Image background repair, editable saved-placement persistence, and immutable source-photo preservation.

## Confirmed Safari drag correction

Physical-iPhone testing on 2026-08-22 confirmed the selected guitar can now be dragged freely across the full room photograph without the active object gesture handing off to page scrolling. Normal page scrolling resumes when the object drag ends.

## Prepared Scene v1 candidate

Branch: `scene-foundation-v1`  
Draft PR: `#1 — Scene Foundation + Prepared Scene v1: multi-object room preparation`

Prepared Scene v1 is a derived multi-object acceleration path:

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

Current v1 behavior is intentionally move-only and in-memory. Scale/rotate/save and explicit AI background repair remain in the validated fallback editor until Prepared Scene feasibility is proven on the target iPhone.

## Activation defect found during physical test

The first Prepared Scene test link used `/arrange?prepared=1`. Physical-device feedback showed no visible behavior change and only the previously restored guitar remained selectable.

Code review determined that the feature existed in the preview build, but activation depended on a query parameter surviving Vercel preview protection, authentication, and navigation. That was too fragile for a release/test boundary.

### Replacement activation boundary

Prepared Scene now has a dedicated route:

`/arrange-prepared`

The route passes `forcePreparedScene` directly into `PhotoArrangeWorkspace`. This forces Prepared Scene before either editor mounts and does not depend on a query parameter, environment variable, or subsequent navigation state.

Ordinary `/arrange` continues to use the validated fallback unless its environment flag is intentionally enabled.

## Validation evidence for route-explicit fix

Application commit: `5ef9fe875f45099a88858f16a600934aebefa3c8`  
GitHub Actions run: `32555434137` — **success**  
Vercel web preview: `dpl_CcG2VHdDZb4p1eVnFS8tRE1ZLeE7` — **READY**

The exact commit passed:
- repository/security/domain verification
- Arrange/Safari contract guards
- scene/Prepared Scene boundary guards
- client TypeScript check
- API TypeScript check
- production web export

Vercel export evidence includes six routes and explicitly includes `/arrange-prepared`.

This is build/route evidence, not physical-iPhone proof that object discovery and multi-object manipulation work correctly.

## Prepared Scene physical-device acceptance

Next test must use the dedicated `/arrange-prepared` preview route.

Expected visible evidence that the correct editor is active:
1. the interface identifies itself as **Prepared Scene v1**
2. the room begins object preparation instead of reopening the saved guitar as the sole active editor object
3. object chips/count appear after preparation
4. at least two different prepared objects can be selected and moved independently
5. if an item is missed, **Add missed object** can create a moveable layer
6. **Inspect clean background** exposes the shared background plate
7. Safari remains responsive during detector/segmentation/depth work
8. source photo and canonical measurements remain unchanged

GitHub Issue `#3` tracks this acceptance pass.

## Current limitations / not yet claimed

- physical-iPhone Prepared Scene acceptance
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

If the dedicated route visibly opens Prepared Scene and local discovery/masking performance is acceptable, continue with multi-object persistence and selective high-quality background reconstruction. If the dedicated route opens Prepared Scene but recognition or mobile memory is poor, keep the provider boundary and change the perception execution strategy rather than rebuilding the editor.

## Authoritative record impact

- `CURRENT-STATE.md`: revision 0.9.10 records the failed query-parameter activation test and the CI/preview-validated dedicated-route correction.
- `ARCHITECTURE.md`: unchanged at revision 0.5.3; Prepared Scene/provider boundaries are already durable architecture.
- `DESIGN-SYSTEM.md`: unchanged; no durable visual-language change.
- `PROJECT-CONSTITUTION.md`: unchanged; existing spatial-truth, privacy, reversibility, and immutable-source rules continue to govern the implementation.
