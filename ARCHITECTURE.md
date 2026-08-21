# FormShift Architecture

**Status:** Authoritative architecture  
**Revision:** 0.5.2  
**Established:** 2026-08-19  
**Last material architecture decision:** 2026-08-21

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

Photos, depth maps, masks and renders are not canonical coordinates. They are source evidence or derived scene products.

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

## 7. Scene provider architecture

Commodity vision capability is accessed through provider boundaries rather than embedded directly into product state or UI logic.

```text
SceneAnalysis orchestration
   │
   ├── DepthProvider
   │    ├── Depth Anything V2 Small (web/local candidate)
   │    └── future device/native provider
   │
   ├── Segmentation provider
   │    ├── current object-centered MediaPipe path
   │    └── future SAM/native alternatives
   │
   └── future calibration / semantics providers
```

Provider output must include provenance and confidence. Providers may be replaced without changing canonical room contracts.

### Depth v1

The initial browser candidate uses Depth Anything V2 Small locally through a pinned Transformers.js/ONNX path. Its output is relative monocular depth, not metric distance. It remains **Estimated augmentation** until calibrated against known scene/device evidence.

Feature flags default scene intelligence and diagnostics off until preview/device acceptance.

## 8. Visualization architecture

FormShift has three visual classes.

### 8.1 Photo augmentation — primary

Used for normal user decisions:
- original room photo
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
Camera / floor / wall calibration
   ↓
Scene understanding + depth + masks
   ↓
Canonical spatial object placement
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

### Canonical editor boundary

The application route owns one canonical `PhotoArrangeEditor` boundary. Versioned experimental wrappers must not remain the normal coordination mechanism.

The currently validated v2.2 gesture/selection implementation may remain frozen behind that boundary while refactoring proceeds. New providers/rendering behavior must compose through explicit interfaces or semantic component boundaries rather than:
- `MutationObserver` state detection
- rendered text scraping
- programmatic control clicks
- inline-style substring matching

The current object-centered MediaPipe selector is isolated behind a transitional provider adapter. This allows later SAM/native evaluation without coupling the room editor to a specific model.

Scene realism work must remain isolated from the validated short-tap/pan/pinch/refinement gesture contract.

## 11. Organize architecture

Inputs:
- source photo / scene analysis
- active spatial version
- object semantics and constraints
- prior accepted/rejected proposals

AI proposes strategy/actions. Deterministic geometry validates them. The primary result is a before/after real-room visualization; Plan is secondary verification.

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

### Vercel

Vercel hosts the Expo web export, separate TypeScript API/functions project and server AI orchestration. Long-running vision/image work may move to a worker architecture if runtime/cost becomes material.

## 15. AI architecture

AI is server-side through the Vercel AI SDK / AI Gateway abstraction for tasks that require remote models. Current/target tasks include room interpretation, object/zone labels, Organize actions, Build normalization, conflict explanation and image reconstruction/concepts.

State-changing AI output must use versioned schemas and pass entity/unit/range/geometry/authorization validation.

Provider/API keys remain server-only. Private images are not logged into ordinary observability streams.

## 16. Security and privacy

- Google through Supabase Auth for current private release
- invitation/allowlist in addition to authentication
- RLS and private Storage enforce authorization
- source room photos, masks, depth and renders are private household data
- API bearer identity is verified before RLS-scoped server work
- server-only provider/API keys
- project deletion must include derived scene artifacts
- no service-role dependency in normal client runtime

## 17. Versioning and reversibility

Preserve:
- immutable source captures
- spatial-version lineage
- measurement corrections
- scene-analysis revisions/provider provenance
- accepted/rejected Organize metadata
- editable Arrange alternatives/assets/transforms
- Build versions
- rendered/AI visual artifacts bound to source + version
- exports bound to exact source versions

Feature-flagged scene providers must have a clean fallback to the last validated photo-editing behavior.

## 18. Reliability and observability

Record privacy-safe correlation IDs and relevant task/provider/model versions, latency, geometry validation failures, scene-analysis failures, export failures and auth denials.

Release gates should include repository/security/domain checks, client/API typechecks, production web export, interaction regression coverage where available, preview deployment and physical-device acceptance for gesture-sensitive changes.

Do not infer device acceptance from a successful build.

## 19. Rollout sequence

1. preserve/validate editable Photo Arrange v2.2 baseline
2. canonical Arrange boundary + regression gates
3. persistent SceneAnalysis/provider contract
4. local depth/support evaluation behind feature flag
5. calibrated camera/floor/wall mapping and depth ordering
6. depth-aware occlusion/contact rendering
7. physical constraint engine / Rapier or RealityKit integration where supported
8. photo-first Organize visualization using the shared scene engine
9. calibrated Build visualization
10. RoomPlan/RealityKit production capture/AR path
11. local/cloud image-provider routing
12. private-beta hardening and broader Build archetypes

## 20. Reconsideration triggers

Revisit architecture if:
- browser rendering cannot provide acceptable calibrated augmentation fidelity
- RealityKit/RoomPlan requires stronger iOS-native separation
- segmentation/depth/inpainting workloads exceed browser/Vercel limits or cost
- scene-derived storage materially exceeds private-group assumptions
- public distribution becomes a goal
- live retail/catalog integration becomes core

## 21. Revision note — 0.5.2

Revision 0.5.2 establishes `SceneAnalysis` as versioned derived evidence with provider/model provenance, relative depth and support-surface contracts, private RLS-protected persistence, and feature-flagged provider execution. It also establishes a single canonical Photo Arrange boundary: scene/vision providers may evolve without coordinating editor behavior through DOM observers, rendered-text scraping, programmatic UI clicks, or version-wrapper chains. The validated v2.2 interaction core remains protected until replacement behavior passes real-device acceptance.

Revision 0.5.1 made committed Photo Arrange results explicitly reconstructable editing state: background + mask + photographed-object cutout + transform + lineage remain editable while the flattened composite is a convenience/history artifact.

Revision 0.5.0 made real-photo augmentation the primary experience while retaining canonical geometry as authority and Plan/rectangle views as secondary technical tools.

Prior architecture revisions remain preserved in Git history.
