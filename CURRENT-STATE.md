# FormShift Current State

**Revision:** 0.9.7  
**Date:** 2026-08-22  
**Milestone:** Prepared Scene v1 implemented as a feature-flagged multi-object feasibility candidate; production remains on Photo Arrange v2.2

FormShift is a **photo-first spatial augmentation product**. The real captured room image is the primary canvas; structured geometry remains the hidden authority. Plan/rectangle views are secondary technical verification surfaces.

## Production application baseline

Production remains on `main` with the validated Photo Arrange v2.2 baseline. No Prepared Scene application code has been promoted to production.

Production baseline capabilities include:
- short-tap photographed-object selection
- candidate mask preview and Add / Remove refinement
- Pan/review mode and room zoom
- explicit object lift
- direct move plus scale/rotation
- local object-free background reconstruction
- explicit authenticated AI background reconstruction through `openai/gpt-image-2`
- editable saved-placement persistence using background + mask + cutout + transform + lineage
- immutable source-room-photo preservation

The earlier v2.1 perspective/contact experiment remains rolled back. No screen-Y placement heuristic has been restored to production.

## Safari full-photo drag validation

The Scene Foundation candidate previously exposed a Mobile Safari failure in which a selected guitar stopped following the finger around the middle/lower portion of the photograph and the same gesture handed off to page scrolling.

The replacement gesture bridge:
- tracks the active selected-object pointer outside the moving handle
- forwards retargeted pointer movement back to the object
- blocks native page scrolling only while an object drag is active
- restores normal page scrolling immediately after pointer up/cancel
- does not alter normalized position bounds, transform math or source-photo integrity

**Physical-iPhone evidence:** on 2026-08-22 the user confirmed that the guitar could be moved freely across the photo after the gesture-bridge fix. This closes the specific lower-half/page-scroll regression. The broader Arrange acceptance checklist remains separate.

## Prepared Scene v1 candidate

Implementation branch: `scene-foundation-v1`  
Draft PR: `#1 — Scene Foundation v1: depth evidence, RLS persistence, and CI guards`

Prepared Scene v1 implements the requested fast-path concept: process a room photo once into multiple derived object layers plus one shared clean background so users do not need to repeat the single-object lift workflow for every recognized item.

### Progressive preparation pipeline

```text
Immutable source photo
   ↓ immediate display
Local object discovery
   ├── DETR ResNet-50 candidate detection
   └── supplemental MediaPipe room sweep for uncovered regions
   ↓
Per-object MediaPipe masks + photographed-pixel cutouts
   ↓
One shared deterministic local clean-background plate
   ↓
Multiple independent moveable photo layers
   ↓ background enrichment
Depth Anything V2 Small relative-depth evidence
```

The photo remains visible while preparation occurs. Depth enrichment starts only after basic object preparation is ready and is not required for movement.

### Automatic object discovery

Prepared Scene v1 uses:
- `ObjectDiscoveryProvider` boundary
- local/browser `Xenova/detr-resnet-50` through Transformers.js/ONNX as the first detector candidate
- a lightweight grid-based MediaPipe room sweep over detector-uncovered regions to find additional distinct objects outside DETR's COCO vocabulary
- duplicate/oversized/low-confidence filtering
- an `Add missed object` mode that lets the user tap the center of an omitted object and create a new independent layer through MediaPipe

Automatic semantic labels are explicitly incomplete in v1. Supplemental sweep objects may be labeled generically as `object`.

### Multi-object editor

When Prepared Scene is enabled:
- all prepared layers are displayed over one shared clean background
- any prepared object can be tapped and dragged independently
- the object drag uses a Safari-safe global continuation and suppresses page scrolling only during the active drag
- object chips expose recognized/prepared layers
- `Reset positions` returns all layers to their source image positions
- `Inspect clean background` hides object layers so reconstruction quality can be evaluated directly

Prepared Scene v1 currently supports direct one-finger movement only. Scale/rotate, committed persistence and AI background repair remain in the validated fallback editor during this feasibility pass.

### Shared clean background

Prepared Scene creates one local derived background plate from the union of prepared object masks. Masked source pixels are removed from the derived canvas and replaced using a deterministic neighboring-pixel/blur fill.

This is intended to make movement immediate and provide one reusable hidden-background approximation. It is **not claimed photorealistic** and is expected to be upgraded with selective local/cloud inpainting after object discovery/mask quality is validated.

### Depth enrichment

Depth Anything V2 Small runs locally after objects become moveable when supported. It adds relative depth evidence per object for later support/occlusion work.

Depth remains estimated, non-metric evidence. It does not update canonical measurements or verified spatial coordinates.

## Feature boundary and rollback

Prepared Scene is independently disabled by default.

It can be enabled in a preview by either:
- `EXPO_PUBLIC_PREPARED_SCENE_V1=true`, or
- explicit preview query parameter `prepared=1`

With Prepared Scene disabled, Arrange returns to the validated canonical `PhotoArrangeEditor` path without migration or source-data changes.

## Data integrity and persistence boundary

Prepared Scene v1 is intentionally **ephemeral** during feasibility testing:
- no Prepared Scene database table has been added
- no photo-arrangement row is written from the Prepared Scene editor
- no canonical spatial version or measurement is mutated
- no source room photo is overwritten
- reloading the preview reprocesses the room

The existing `scene_analyses` database foundation remains deployed and RLS-protected from the prior Scene Foundation cycle. Prepared Scene persistence will be designed only after mobile latency, memory, discovery quality and correction UX are validated.

## Verification state

Automated release guards now require:
- Prepared Scene to remain independently feature-flagged
- the canonical Arrange fallback to remain present
- explicit DETR provider identity
- MediaPipe object preparation, shared clean-background creation and Depth Anything integration
- no Prepared Scene Supabase/canonical persistence writes during v1
- no legacy DOM observer/text-click coupling in the scene/preparation layers

A full CI run on the Prepared Scene implementation before the final room-sweep expansion passed repository/security/domain/scene guards, client TypeScript, API TypeScript and production web export. The exact latest room-sweep application head is undergoing the same CI gate; production promotion is not implied by preview/build success.

The exact room-sweep application commit has also reached a READY Vercel web preview. Physical-iPhone Prepared Scene behavior remains unvalidated until the dedicated acceptance pass below.

## Prepared Scene v1 device acceptance

Using an exact preview with `prepared=1`:
1. confirm the source room photo appears before preparation completes
2. confirm Safari remains responsive while models load/process
3. record the automatic prepared-object count
4. tap and move at least two different automatically prepared objects independently
5. confirm object drag can cross the full photo without page-scroll handoff
6. check whether the guitar is prepared automatically
7. if not, use **Add missed object**, tap the guitar near its center, and confirm it becomes independently moveable
8. move objects away from their original positions and inspect the exposed background
9. use **Inspect clean background** to evaluate the shared plate directly
10. verify cleaned areas do not become transparent/black
11. confirm normal page scrolling works when no object drag is active
12. if depth completes, record its reported latency and verify movement was available independently of depth
13. watch for Safari reload/crash/memory pressure during detection + segmentation + depth
14. refresh and confirm Prepared Scene reprocesses rather than pretending persistence exists
15. confirm the original source photograph remains unchanged

Detailed checklist: `docs/PREPARED-SCENE-V1-ACCEPTANCE.md`.

## Current accuracy boundaries

Not yet claimed:
- Prepared Scene physical-iPhone acceptance
- comprehensive household-object recognition
- perfect masks for every automatic object
- photorealistic shared background reconstruction
- persisted multi-object Prepared Scenes
- Prepared Scene scale/rotate workflow
- calibrated camera/floor/wall mapping
- metric depth from a normal photograph
- calibrated floor/support snapping
- depth-aware production occlusion
- perspective-aware physical scaling
- physically correct contact shadows
- gravity/rigid-body simulation
- native iOS Prepared Scene execution
- production RoomPlan capture/normalization

## Next decision after test

Use the physical-iPhone Prepared Scene test to choose among three paths:
- if discovery/segmentation quality is good and memory/latency is acceptable, persist Prepared Scene and restore scale/rotate/save semantics on the multi-object layer model
- if semantic coverage is the main weakness, evaluate a broader open-vocabulary detector behind `ObjectDiscoveryProvider`
- if local model memory/latency is the main weakness, keep local segmentation/depth but move automatic discovery/preparation to a controlled worker/server path

Do not add Rapier/RealityKit physics until reliable support/collision geometry exists.

## Authoritative record impact

- `CURRENT-STATE.md`: revision 0.9.7 records the user-confirmed Safari full-photo drag fix and the Prepared Scene v1 implementation/test boundary.
- `ARCHITECTURE.md`: revision 0.5.3 establishes Prepared Scene as a durable derived multi-object acceleration layer and adds `ObjectDiscoveryProvider`.
- `DESIGN-SYSTEM.md`: unchanged; existing photo-first, confidence-labeling and source-integrity interaction rules cover this feasibility slice.
- `PROJECT-CONSTITUTION.md`: unchanged; Prepared Scene preserves existing spatial-truth, privacy, reversibility and immutable-source rules.
