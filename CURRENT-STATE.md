# FormShift Current State

**Revision:** 0.9.11  
**Date:** 2026-08-22  
**Milestone:** Prepared Scene preview activation and room-photo lineage defects corrected; exact application commit passes CI and preview build, physical-iPhone Prepared Scene behavior pending

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

## Physical-test defects found after dedicated-route build

A second physical-device test still displayed the validated guitar editor. The user also uploaded a new room photo, but Arrange continued showing the older room image with the previously moved guitar.

The supplied screenshot visibly showed the fallback editor controls (`Arrange object`, `Background ready`, `Keep placement`) rather than Prepared Scene controls. Two independent root causes were confirmed.

### Root cause 1 — web authentication discarded the requested preview route

`AuthProvider` hard-coded the web Google OAuth callback to `${origin}/`. Every Vercel preview hostname is a separate browser origin/session, so opening `/arrange-prepared` commonly required signing in again. After Google authentication, the callback returned to `/`; subsequent navigation could enter ordinary `/arrange`, losing the dedicated Prepared Scene route.

**Correction:** before web OAuth starts, FormShift stores a sanitized requested route in session storage. Once the authenticated session is established, the app restores that route and removes the one-time return record. The OAuth callback itself remains the known root URL, avoiding dependency on arbitrary callback-path allowlisting.

The dedicated `/arrange-prepared` route still passes `forcePreparedScene` directly into `PhotoArrangeWorkspace`, so after route restoration it cannot silently choose the fallback editor.

### Root cause 2 — saved arrangements were restored across different source photos

`loadLatestPhotoArrangement(projectId, spaceId)` previously selected the newest committed arrangement for the space without filtering `source_asset_id`.

Database evidence on 2026-08-22 confirmed:
- latest room-photo asset: `38684ffa-ccd5-4333-93d8-7e3f06ff0333`, created `2026-08-22 06:03:18+00`
- prior guitar arrangements referenced older room-photo asset `18a3c504-fd4d-4173-84ba-3bd70b63ada5`

The upload therefore succeeded; stale arrangement restore was replacing the newly selected source visually.

**Correction:** arrangement restore now first resolves the current/latest room-photo asset and only restores a committed `photo_arrangements` row whose `source_asset_id` matches it. Parent-arrangement lineage is likewise restricted to the same source asset, preventing version chains from crossing between photographs.

This enforces the existing architecture rule that derived arrangements remain bound to their source capture.

## Validation evidence for combined correction

Application commit: `d92eed7bd98649c85ea8cfbb6678446b6736686b`  
GitHub Actions run: `32556170856` — **success**  
Vercel web preview: `dpl_DSb2i6GXTtp1XPJBg8xJSg66S6tx` — **READY**

The exact application commit passed:
- repository/security/domain verification
- Arrange/Safari contract guards
- scene/Prepared Scene boundary guards
- new dedicated-route/auth-return guard
- new source-photo arrangement-lineage guard
- client TypeScript check
- API TypeScript check
- production web export

Production remains unchanged. This is code/build/data evidence, not physical-iPhone proof that Prepared Scene object discovery and multi-object manipulation now behave correctly.

## Prepared Scene physical-device acceptance

Next test must use the dedicated `/arrange-prepared` preview route on the corrected build.

Expected visible evidence:
1. after Vercel/Google authentication, the browser returns to `/arrange-prepared` rather than `/`
2. the interface identifies itself as **Prepared Scene v1**
3. the newly uploaded room photo is shown; the old guitar arrangement must not replace it
4. room object preparation begins automatically
5. object chips/count appear after preparation
6. at least two different prepared objects can be selected and moved independently
7. if an item is missed, **Add missed object** can create a moveable layer
8. **Inspect clean background** exposes the shared background plate
9. Safari remains responsive during detector/segmentation/depth work
10. source photo and canonical measurements remain unchanged

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

If the corrected route visibly opens Prepared Scene on the new source photo and local discovery/masking performance is acceptable, continue with multi-object persistence and selective high-quality background reconstruction. If Prepared Scene opens correctly but recognition or mobile memory is poor, keep the provider boundary and change the perception execution strategy rather than rebuilding the editor.

## Authoritative record impact

- `CURRENT-STATE.md`: revision 0.9.11 records the screenshot/device evidence, successful new-photo upload, auth-return defect, cross-photo arrangement-lineage defect, corrections, and exact CI/preview validation.
- `ARCHITECTURE.md`: unchanged at revision 0.5.3; source-bound derived-artifact lineage and Prepared Scene/provider boundaries were already established architectural requirements, and this work enforces them rather than changing them.
- `DESIGN-SYSTEM.md`: unchanged; no durable visual-language change.
- `PROJECT-CONSTITUTION.md`: unchanged; existing spatial-truth, privacy, reversibility, and immutable-source rules continue to govern the implementation.
