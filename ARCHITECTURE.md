# FormShift Architecture

**Status:** Authoritative architecture  
**Revision:** 0.5.3  
**Established:** 2026-08-19  
**Last material architecture decision:** 2026-08-22

## 1. Architecture decision

FormShift uses a shared TypeScript/React Native architecture for web and iOS, with native iOS modules where Apple-only camera/RoomPlan/RealityKit capabilities materially improve fidelity.

The primary product experience is **photo/scene augmentation**. The canonical spatial model remains authoritative behind that experience.

```text
Private user
   │
   ├── Web (Expo static export on Vercel)
   └── iOS (Expo/RN + native adapters)
          │
          ▼
      Supabase Auth
      Google + invite gate
          │
          ├── Postgres: project/spatial/build/version/provenance state
          └── Private Storage: source photos, scans, masks, depth, renders, exports
          │
          ▼
  Scene + spatial orchestration
          │
          ├── Deterministic geometry / BOM / blueprint engines
          ├── Derived SceneAnalysis providers
          ├── Derived PreparedScene object/background layers
          ├── Photo-scene calibration / projection / occlusion pipeline
          └── Server AI orchestration (Vercel AI SDK / AI Gateway)
```

## 2. Architectural priorities

1. photo-first usefulness in the user's real space
2. spatial/measurement integrity
3. private household-data protection
4. coherent Organize / Arrange / Build state
5. deterministic fit/collision/quantity correctness
6. reversible user/AI changes
7. high-quality iOS camera/AR experience
8. responsive web review/editing
9. safe structured AI integration
10. operational simplicity, observability, and recoverability

## 3. Platform scope

### Web

Primary capabilities:
- project/room management
- photo upload/capture where browser allows
- photo-first Organize/Arrange/Build review
- manual calibration/measurement correction
- technical Plan view
- Build brief/design/BOM/blueprint review
- derived scene analysis where a browser-local provider is appropriate
- progressive Prepared Scene generation where mobile/browser memory permits
- exports/sharing

The browser is not required to reproduce RoomPlan capture.

### iOS

Primary capture/AR platform:
- standard photo capture
- optional RoomPlan/LiDAR capture
- camera calibration/depth where available
- RealityKit geometry-faithful in-scene placement
- native spatial interaction where browser fidelity is insufficient

Unsupported iPhones retain standard photo/manual workflows.

### Android

Out of scope.

## 4. Canonical project model

All modes operate on one project graph:

```text
Project
└── Space
    ├── Captures
    │   ├── immutable source photos
    │   ├── camera/capability metadata
    │   └── derived scene artifacts
    ├── Measurements
    ├── Surfaces / Openings / Fixed features
    ├── Spatial Versions
    │   ├── objects/transforms
    │   ├── constraints
    │   └── measurement references
    ├── Scene Analyses
    ├── Prepared Scenes (derived)
    ├── Organize proposals
    ├── Arrange alternatives
    ├── Build requests/plans
    │   ├── components
    │   ├── placement
    │   ├── materials
    │   ├── cost/effort
    │   └── retained blueprint geometry
    └── Exports
```

Photos, depth maps, masks, Prepared Scene layers and renders are not canonical coordinates. They are source evidence or derived scene products.

## 5. Coordinate and measurement model

- room-local right-handed Cartesian coordinates
- +Y up, X-Z floor plane
- canonical length unit: millimeters
- explicit floor polygon, ceiling height, openings, objects, transforms, constraints
- measurement observations retain source, tolerance/confidence, verification state, timestamps and supersession
- manual correction supersedes rather than erases provenance
- spatial versions are immutable

No vision/depth/AI provider may silently promote inferred pixels into verified measurements.

## 6. SceneAnalysis contract

Every usable room photo may gain one or more versioned `SceneAnalysis` records. Scene analysis is **derived evidence**, separable from canonical spatial state and safe to recompute or supersede.

The typed v1 contract supports:
- source photo/capture identity
- provider, model and model-version provenance
- processing timestamp and latency
- relative depth artifact
- support surfaces such as floor, wall, tabletop and shelf
- object evidence hooks and approximate depth
- confidence state: unknown / estimated / calibrated / measured
- explicit notes/limitations

Future revisions may add:
- camera intrinsics
- horizon / vanishing points
- calibrated floor/wall planes
- canonical-room-to-image projection
- device depth
- segmentation/object masks
- foreground/background ordering
- lighting/environment estimates

Scene-analysis changes never mutate a source image, measurement observation or spatial version implicitly.

### 6.1 PreparedScene contract

`PreparedScene` is a derived, photo-editing acceleration layer built from one immutable source photo. Its purpose is to do expensive perception work once so Arrange, Organize and later Build visualizations can reuse the result instead of segmenting/reconstructing on every interaction.

Prepared Scene v1 contains:
- source photo identity
- automatic object-discovery provenance
- per-object semantic label/confidence
- per-object mask and photographed-pixel cutout
- independent image-space transform
- mobility classification: movable / conditional / fixed
- expected support class: floor / wall / surface / unknown
- optional relative-depth evidence
- one shared derived clean-background plate
- explicit notes/limitations

The target flow is:

```text
Immutable room photo
   ↓ immediate display
Automatic object discovery
   ↓
Per-object segmentation / cutout preparation
   ↓
Shared clean-background reconstruction
   ↓ object interaction becomes available
Relative depth + support enrichment in background
   ↓
Prepared Scene
   ├── object layer A
   ├── object layer B
   ├── object layer C
   └── clean room plate
```

Preparation is progressive: users should see the source photo immediately; slower depth/refinement work must not unnecessarily block basic object manipulation.

Prepared Scene is **not canonical spatial truth**. Image-space transforms, inferred support and relative depth do not update verified dimensions or canonical coordinates unless a later calibrated mapping explicitly validates that transition.

Prepared Scene v1 is intentionally ephemeral during feasibility testing. Persistence is added only after multi-object preparation quality, memory use and latency are validated on the target iPhone/browser. The immutable source photo remains unchanged regardless of Prepared Scene lifecycle.

## 7. Scene provider architecture

Commodity vision capability is accessed through provider boundaries rather than embedded directly into product state or UI logic.

```text
Scene / PreparedScene orchestration
   │
   ├── ObjectDiscoveryProvider
   │    ├── DETR ResNet-50 local/browser candidate
   │    └── future open-vocabulary/native provider
   │
   ├── Segmentation provider
   │    ├── current object-centered MediaPipe path
   │    ├── isolated Prepared Scene batch MediaPipe path
   │    └── future SAM/native alternatives
   │
   ├── DepthProvider
   │    ├── Depth Anything V2 Small (web/local candidate)
   │    └── future device/native provider
   │
   └── future calibration / semantics providers
```

Provider output must include provenance and confidence. Providers may be replaced without changing canonical room contracts.

### Object discovery v1

The first Prepared Scene browser candidate uses a quantized ONNX conversion of DETR ResNet-50 through Transformers.js. It is deliberately a lightweight feasibility provider rather than the final semantic vocabulary. Because DETR is COCO-trained, automatic discovery will miss household classes outside that vocabulary. The editor therefore retains an explicit user-added-object path through interactive segmentation.

An open-vocabulary detector may supplement/replace DETR only after mobile memory and latency are measured. That change remains behind `ObjectDiscoveryProvider`.

### Depth v1

The initial browser candidate uses Depth Anything V2 Small locally through a pinned Transformers.js/ONNX path. Its output is relative monocular depth, not metric distance. It remains **Estimated augmentation** until calibrated against known scene/device evidence.

Feature flags default scene intelligence, diagnostics and Prepared Scene off until preview/device acceptance.

## 8. Visualization architecture

FormShift has three visual classes.

### 8.1 Photo augmentation — primary

Used for normal user decisions:
- original room photo
- prepared multi-object room scene
- augmented room with proposed Build object
- Arrange visual manipulation
- Organize before/after scene

Rendering should use deterministic object geometry and calibrated camera projection where available. Estimated projection is allowed only when explicitly labeled.

### 8.2 Technical geometry views — secondary

Used for exact verification and diagnostics:
- Skia plan/2.5D editor
- measured perspective geometry view
- depth/calibration diagnostics
- blueprint views
- collision/clearance overlays

### 8.3 AI pixel synthesis — supporting

Used only where structured rendering cannot reconstruct source pixels safely:
- background inpainting after moving/removing an object
- reconstructing unseen surfaces
- visual material/style concepts
- polished illustrative end-state imagery

AI-generated pixels never update geometry implicitly.

## 9. Scene augmentation pipeline

Target pipeline:

```text
Immutable source photo
   ↓
Object discovery + masks + Prepared Scene clean plate
   ↓
Camera / floor / wall calibration
   ↓
Scene understanding + depth + support relationships
   ↓
Canonical spatial object placement where calibrated
   ↓
Geometry-faithful projection/render
   ↓
Occlusion + contact + lighting treatment
   ↓
Optional AI inpainting/reconstruction
   ↓
Labeled augmented scene
```

Until camera calibration is implemented, estimated mapping may be used only as explicitly labeled visualization. Plan/canonical geometry remains fit authority.

## 10. Arrange architecture

Direct manipulation occurs in the photo scene where possible. Hidden geometry keeps dimensions and future collision/position constraints authoritative.

A committed photo arrangement is an **editable derived-scene version**, not only a flattened image. Its persistence contract retains:
- composite result asset for display/history
- object-free background when available
- accepted mask
- photographed-object cutout
- object transform metadata
- parent arrangement lineage

Complete saved arrangements reopen as movable objects over their object-free background. Legacy/incomplete arrangements may fall back to the flattened composite and require re-selection.

### Prepared Scene fast path

When Prepared Scene is enabled and validated, Arrange should prefer a precomputed layered room so recognized objects are immediately selectable/movable and share one clean background plate. Missing/incorrect objects retain interactive add/refine correction rather than forcing full scene preparation to be perfect.

The validated single-object editor remains the fallback until Prepared Scene meets device-quality gates. Disabling `EXPO_PUBLIC_PREPARED_SCENE_V1` must restore that fallback without data migration or source-photo mutation.

### Canonical editor boundary

The application route owns one canonical `PhotoArrangeEditor` boundary for the validated fallback. Versioned experimental wrappers must not remain the normal coordination mechanism.

The currently validated v2.2 gesture/selection implementation may remain frozen behind that boundary while refactoring proceeds. New providers/rendering behavior must compose through explicit interfaces or semantic component boundaries rather than:
- `MutationObserver` state detection
- rendered text scraping
- programmatic control clicks
- inline-style substring matching

The current object-centered MediaPipe selector is isolated behind a transitional provider adapter. Prepared Scene uses a distinct MediaPipe module instance so its batch preparation cannot inherit or mutate that compatibility adapter.

Scene realism work must remain isolated from the validated short-tap/pan/pinch/refinement gesture contract.

## 11. Organize architecture

Inputs:
- source photo / scene analysis / Prepared Scene
- active spatial version
- object semantics and constraints
- prior accepted/rejected proposals

AI proposes strategy/actions. Deterministic geometry validates them. The primary result is a before/after real-room visualization; Plan is secondary verification.

Prepared Scene should become the reusable photo-layer substrate for Organize once its object discovery and correction workflow is validated.

## 12. Build architecture

Flow:

```text
Describe → Normalize → deterministic geometry → Validate →
Project/render into real room photo → User reviews/adjusts →
Accept version → Blueprint/BOM/Cost/Effort
```

Current Class A archetype: freestanding open shelving/storage.

The deterministic Build engine owns dimensions, components, placement envelope, collision/containment, span rules, quantities, cost inputs, effort characteristics and retained blueprint geometry. Image augmentation never replaces that authority.

## 13. Rendering decisions

- React Native Skia: technical 2D/2.5D precision views
- web calibrated geometry/scene rendering: Three.js-class path when needed
- iOS geometry/AR: RealityKit
- iOS room capture: RoomPlan behind a native adapter
- web physical simulation: Rapier-class path only after support/collision geometry is reliable
- photo compositing: shared scene-projection contract, platform-specific implementation allowed
- blueprint: retained/vector geometry, never AI drawing pixels

Physics does not precede spatial evidence. Gravity/support behavior must operate on calibrated/confirmed scene geometry rather than a screen-space heuristic.

## 14. Backend and derived scene persistence

### Supabase

Supabase owns Auth, PostgreSQL, private Storage and RLS/storage policies.

`public.scene_analyses` stores versioned derived-scene metadata separately from canonical measurements/spatial versions. Depth images are private assets in `formshift-private` and are referenced from scene-analysis rows.

Authorization:
- anonymous: no scene-analysis access
- authenticated project readers: SELECT
- authenticated project editors: INSERT for their own derived analysis

Scene records are append-oriented derived evidence. Supersession/recalculation must preserve provenance rather than overwrite source truth.

Prepared Scene v1 does not add a database table during feasibility testing. When persistence is adopted, prepared object masks/cutouts/clean plates must remain private derived assets with project-scoped RLS/Storage authorization and explicit source lineage.

### Vercel

Vercel hosts the Expo web export, separate TypeScript API/functions project and server AI orchestration. Long-running vision/image work may move to a worker architecture if runtime/cost becomes material.

## 15. AI architecture

AI is server-side through the Vercel AI SDK / AI Gateway abstraction for tasks that require remote models. Current/target tasks include room interpretation, object/zone labels, Organize actions, Build normalization, conflict explanation and image reconstruction/concepts.

State-changing AI output must use versioned schemas and pass entity/unit/range/geometry/authorization validation.

Provider/API keys remain server-only. Private images are not logged into ordinary observability streams.

Local open-source perception models may run in the browser/device when privacy, latency and memory budgets are acceptable. Their outputs remain derived evidence subject to the same provenance/confidence boundaries.

## 16. Security and privacy

- Google through Supabase Auth for current private release
- invitation/allowlist in addition to authentication
- RLS and private Storage enforce authorization
- source room photos, masks, depth and renders are private household data
- API bearer identity is verified before RLS-scoped server work
- server-only provider/API keys
- project deletion must include derived scene artifacts
- no service-role dependency in normal client runtime

Prepared Scene processing should prefer local/browser execution where practical. No derived object layer may overwrite the immutable source photo.

## 17. Versioning and reversibility

Preserve:
- immutable source captures
- spatial-version lineage
- measurement corrections
- scene-analysis revisions/provider provenance
- Prepared Scene provider/model provenance once persisted
- accepted/rejected Organize metadata
- editable Arrange alternatives/assets/transforms
- Build versions
- rendered/AI visual artifacts bound to source + version
- exports bound to exact source versions

Feature-flagged scene providers must have a clean fallback to the last validated photo-editing behavior.

## 18. Reliability and observability

Record privacy-safe correlation IDs and relevant task/provider/model versions, latency, geometry validation failures, scene-analysis failures, Prepared Scene discovery/segmentation failures, export failures and auth denials.

Release gates should include repository/security/domain checks, client/API typechecks, production web export, interaction regression coverage where available, preview deployment and physical-device acceptance for gesture-sensitive changes.

Prepared Scene evaluation must separately measure object discovery coverage, per-object segmentation quality, time-to-first-editable-object, full preparation latency, memory pressure and clean-background quality.

Do not infer device acceptance from a successful build.

## 19. Rollout sequence

1. preserve/validate editable Photo Arrange v2.2 baseline
2. canonical Arrange boundary + regression gates
3. persistent SceneAnalysis/provider contract
4. Prepared Scene v1 progressive multi-object feasibility behind independent feature flag
5. broaden object discovery/correction workflow based on device evidence
6. local depth/support evaluation and Prepared Scene enrichment
7. calibrated camera/floor/wall mapping and depth ordering
8. depth-aware occlusion/contact rendering
9. physical constraint engine / Rapier or RealityKit integration where supported
10. photo-first Organize visualization using Prepared Scene/shared scene engine
11. calibrated Build visualization
12. RoomPlan/RealityKit production capture/AR path
13. local/cloud image-provider routing
14. private-beta hardening and broader Build archetypes

## 20. Reconsideration triggers

Revisit architecture if:
- browser rendering cannot provide acceptable calibrated augmentation fidelity
- local Prepared Scene model loading exceeds iPhone memory/latency budgets
- RealityKit/RoomPlan requires stronger iOS-native separation
- segmentation/depth/inpainting workloads exceed browser/Vercel limits or cost
- scene-derived storage materially exceeds private-group assumptions
- public distribution becomes a goal
- live retail/catalog integration becomes core

## 21. Revision note — 0.5.3

Revision 0.5.3 establishes `PreparedScene` as a derived multi-object acceleration layer: automatic object discovery, independent masks/cutouts, a shared clean-background plate, mobility/support semantics and background depth enrichment are prepared progressively from the immutable source photo. Prepared Scene is independently feature-flagged, ephemeral during feasibility testing, cannot mutate canonical measurements, and must fall back cleanly to the validated single-object editor. Commodity object discovery is now explicitly behind `ObjectDiscoveryProvider`; the first local/browser candidate is DETR ResNet-50, with interactive MediaPipe retained for missed-object correction.

Revision 0.5.2 established `SceneAnalysis` as versioned derived evidence with provider/model provenance, relative depth and support-surface contracts, private RLS-protected persistence, and feature-flagged provider execution. It also established a single canonical Photo Arrange boundary: scene/vision providers may evolve without coordinating editor behavior through DOM observers, rendered-text scraping, programmatic UI clicks, or version-wrapper chains. The validated v2.2 interaction core remains protected until replacement behavior passes real-device acceptance.

Revision 0.5.1 made committed Photo Arrange results explicitly reconstructable editing state: background + mask + photographed-object cutout + transform + lineage remain editable while the flattened composite is a convenience/history artifact.

Revision 0.5.0 made real-photo augmentation the primary experience while retaining canonical geometry as authority and Plan/rectangle views as secondary technical tools.

Prior architecture revisions remain preserved in Git history.
