# FormShift Dependency License Register

**Status:** implementation dependency control  
**Last reviewed:** 2026-08-21

FormShift prefers permissive open-source dependencies for commodity algorithms. This register is not legal advice; it records the licenses verified during implementation so non-commercial model variants are not adopted accidentally.

| Dependency / model | FormShift use | License / terms | Current status |
|---|---|---|---|
| MediaPipe / Interactive Segmenter | Local photographed-object candidate segmentation | Apache-2.0 | Active production-compatible selection dependency |
| Transformers.js `@huggingface/transformers` 4.2.0 | Browser model runtime | Apache-2.0 | Scene Foundation candidate |
| Depth Anything V2 **Small** | Relative monocular depth | Apache-2.0 | Scene Foundation candidate |
| Depth Anything V2 Base / Large / Giant | Larger depth variants | CC-BY-NC-4.0 | **Prohibited as default commercial FormShift dependencies** unless licensing changes or separate rights are obtained |
| Apple RoomPlan | LiDAR-assisted iOS room capture | Apple platform framework; proprietary | Existing capability-detection adapter; full capture deferred |
| Apple RealityKit | Future iOS scene/physics/AR | Apple platform framework; proprietary | Planned, not current runtime dependency |

## Dependency rule

Before adding or upgrading a vision, depth, generation, physics, rendering, or training dependency:
1. verify the exact package/model/checkpoint license;
2. verify commercial-use rights for the exact weights, not only the surrounding source code;
3. record the version/model identity here;
4. preserve provider boundaries so a dependency can be replaced without changing canonical FormShift state;
5. never treat an AI/model output as verified spatial truth solely because the dependency is approved.

## Planned candidates not yet adopted

The following are architectural candidates only and are not yet production dependencies:
- SAM 2 for alternative segmentation evaluation
- Three.js for calibrated web geometry rendering
- Rapier for web physical constraints/rigid-body simulation after support geometry is reliable
- FLUX.2 Klein 4B for optional local image editing/rendering

Their exact package/model versions and licenses must be reverified at adoption time.
