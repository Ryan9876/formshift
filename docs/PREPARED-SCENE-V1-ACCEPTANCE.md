# Prepared Scene v1 Acceptance

Prepared Scene is an experimental, derived-only preview. Production remains on the validated Arrange fallback until this checklist passes on the target iPhone/browser.

## Entry

Open the exact preview with `prepared=1` and authenticate normally.

## Preparation

- [ ] Source room photo appears before analysis completes.
- [ ] `Prepared Scene v1` status progresses without freezing/crashing Safari.
- [ ] Automatic object count becomes non-zero for a normal furnished room, or the fallback `Add missed object` path remains usable.
- [ ] Detector/model latency is shown.
- [ ] The supplemental room sweep may add generic `object` layers for household items outside DETR's vocabulary.
- [ ] `Inspect clean background` shows one shared derived clean-room plate.
- [ ] Cleaned areas are approximate but do not become transparent/black.

## Multi-object interaction

- [ ] Tap and move at least two different automatically prepared objects independently.
- [ ] Moving one object does not move another object.
- [ ] Object drag can cross the full photo without handing off to page scrolling.
- [ ] Page scrolling returns after the object drag ends.
- [ ] If the guitar is not automatically prepared, `Add missed object` can add it by tapping near its center.
- [ ] A manually added object can be moved independently.
- [ ] `Reset positions` returns all layers to their original image positions.

## Depth enrichment

- [ ] Objects become moveable before depth is required.
- [ ] If Depth Anything runs successfully, model latency appears and selected objects show relative-depth evidence.
- [ ] Failure/unsupported depth does not prevent object movement.

## Integrity

- [ ] The immutable source photo remains unchanged.
- [ ] No canonical measurement or spatial version changes merely from preparing/moving layers.
- [ ] Reloading the preview reprocesses Prepared Scene v1; persistence is intentionally not claimed yet.

## Known v1 limits

- Prepared Scene v1 currently supports direct one-finger movement, not the fallback editor's full scale/rotate/save workflow.
- Object discovery uses COCO-trained DETR plus a supplemental MediaPipe room sweep; semantic labels will be incomplete.
- The quick clean plate is deterministic/local and is not expected to equal photorealistic AI inpainting yet.
- Occlusion, calibrated support, gravity and rigid-body physics are not active.
