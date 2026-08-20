# FormShift Architecture

**Status:** Authoritative architecture  
**Revision:** 0.5.0  
**Established:** 2026-08-19  
**Last material architecture decision:** 2026-08-20

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
          └── Private Storage: source photos, scans, masks, renders, exports
          │
          ▼
  Scene + spatial orchestration
          │
          ├── Deterministic geometry / BOM / blueprint engines
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
    │   ├── source photos
    │   ├── camera/capability metadata
    │   └── derived scene artifacts
    ├── Measurements
    ├── Surfaces / Openings / Fixed features
    ├── Spatial Versions
    │   ├── objects/transforms
    │   ├── constraints
    │   └── measurement references
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

Photos and renders are not canonical coordinates. They are source evidence or derived scene products.

## 5. Coordinate and measurement model

- room-local right-handed Cartesian coordinates
- +Y up, X-Z floor plane
- canonical length unit: millimeters
- explicit floor polygon, ceiling height, openings, objects, transforms, constraints
- measurement observations retain source, tolerance/confidence, verification state, timestamps, and supersession
- manual correction supersedes rather than erases provenance
- spatial versions are immutable

## 6. Photo-scene model

Every usable room photo may gain a versioned scene-calibration record containing, as capabilities mature:

- source asset/capture ID
- image dimensions/orientation
- camera intrinsics when known
- estimated/calibrated horizon and vanishing points
- floor/wall planes in image coordinates
- mapping from canonical room coordinates to image pixels
- depth estimate or device depth data
- segmentation/object masks
- foreground/background ordering
- confidence/quality state

Scene calibration is derived metadata. It may be recalculated without mutating the source image or spatial version.

## 7. Visualization architecture

FormShift has three visual classes.

### 7.1 Photo augmentation — primary experience

Used for normal user decisions:

- original room photo
- augmented room with proposed Build object
- Arrange visual manipulation
- Organize before/after scene

Rendering should use deterministic object geometry and calibrated camera projection where available. Estimated projection is allowed when explicitly labeled.

### 7.2 Technical geometry views — secondary

Used for exact verification and diagnostics:

- Skia plan/2.5D editor
- measured perspective geometry view
- blueprint views
- collision/clearance overlays

### 7.3 AI pixel synthesis — supporting

Used only where structured rendering cannot reconstruct source pixels safely:

- inpainting background revealed after moving/removing an object
- reconstructing unseen object surfaces
- visual material/style concepts
- polished illustrative end-state imagery

AI-generated pixels never update geometry implicitly.

## 8. Scene augmentation pipeline

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

### v1 fallback

Until camera calibration is implemented, FormShift may project canonical X/Z placement into photo coordinates using an estimated mapping. This output must be labeled **Estimated augmentation** and Plan remains the fit authority.

## 9. Mode architecture

### Organize

Inputs:

- source photo/scene calibration
- active spatial version
- object semantics and constraints
- prior accepted/rejected proposals

AI proposes strategy/actions. Deterministic geometry validates them. The primary preview is a before/after real-room visualization; Plan is secondary.

### Arrange

Direct manipulation should occur in the photo scene where possible. Hidden geometry keeps scale, dimensions, collision, and position valid. Numeric/Plan editing remains available for precision and unsupported visual cases.

Moving an existing object may require source-mask extraction and inpainting of its former location. Large viewpoint changes from a single photo may require illustrative reconstruction and must be labeled accordingly.

### Build

Flow:

```text
Describe → Normalize → Build deterministic geometry → Validate →
Project/render into real room photo → User reviews/adjusts →
Accept version → Blueprint/BOM/Cost/Effort
```

The photo result is the primary decision surface. Blueprint and Plan remain authoritative for dimensions and construction planning.

## 10. Rendering decisions

- React Native Skia: technical 2D/2.5D precision view and retained drawing support
- web geometry-faithful 3D/scene rendering: Three.js-class path when perspective calibration/mesh fidelity requires it
- iOS geometry/AR: RealityKit
- iOS room capture: RoomPlan behind a native adapter
- photo compositing layer: shared scene-projection contract; implementation may differ between web and iOS
- blueprint: retained/vector model, not AI drawing pixels

Renderer sharing is secondary to correct data contracts and platform quality.

## 11. AI architecture

AI is server-side through Vercel AI SDK / AI Gateway abstraction.

Current/target task families:

- analyze room capture
- classify/describe objects
- infer room use/zones
- propose Organize actions
- normalize Arrange object requests
- normalize Build requests
- explain Build conflicts
- estimate task classifications
- generate/refine visual concept imagery
- segmentation/inpainting/reconstruction where a dedicated vision model is appropriate

State-changing AI output must use versioned schemas and pass entity/unit/range/geometry/authorization validation.

Provider credentials remain server-only. Minimal project context is sent per task. Private images are not logged into general observability streams.

## 12. Backend/data platform

### Supabase

- Auth
- PostgreSQL
- private Storage
- RLS/storage policies
- optional Realtime

Core relational records include profiles/access, projects/members/spaces, assets/captures, measurements, spatial versions, AI runs, Organize records, saved layouts, Build records, BOM/cost/effort, exports, jobs, and audit events.

Scene-calibration/mask/render metadata may be added relationally or as typed derived-asset metadata when implemented.

### Vercel

- Expo web static hosting
- separate TypeScript API/functions project
- AI orchestration
- authenticated RLS-scoped Supabase operations
- export/scene jobs where runtime characteristics fit

Long-running image/vision work may move to a job/worker architecture if Vercel limits or cost become material.

## 13. Build architecture

Current supported Class A archetype: freestanding open shelving/storage.

Deterministic engine owns:

- dimensions/components
- placement envelope
- collision/containment
- unsupported-span rule
- materials quantity
- planning cost inputs
- effort characteristics
- retained blueprint geometry

Atomic Build acceptance writes Build records, measurement provenance, and the new spatial version together.

Image augmentation represents that validated object visually but does not replace the deterministic Build engine.

## 14. Blueprint/export architecture

Blueprints derive from validated retained geometry and support plan/location, front/side elevations, component/cut views, dimensions, clearances, notes, and verification state.

PDF/export artifacts bind to exact Build/spatial versions. AI-generated images are never used as blueprint geometry.

## 15. Security/privacy

- Google through Supabase Auth for current private release
- invitation/allowlist required in addition to authentication
- RLS and private Storage enforce authorization
- source room photos and derived masks/depth/renders are private household data
- server-only provider/API keys
- project deletion must include derived scene artifacts
- no service-role dependency in normal client runtime

## 16. Versioning and reversibility

Preserve:

- immutable source captures
- spatial-version lineage
- measurement corrections
- accepted/rejected Organize metadata
- Arrange alternatives
- Build versions
- scene calibration revisions
- rendered/AI visual artifacts bound to their source capture + spatial version
- exports bound to exact source versions

## 17. Reliability and observability

Record privacy-safe correlation IDs, project/user IDs, task/model/prompt version, model latency/usage, geometry validation failures, capture/scene-analysis failures, export failures, and auth denials.

Do not log OAuth tokens or raw private images into ordinary logs.

## 18. Rollout sequence from 0.5.0

1. Build Augmentation v1: real photo primary, estimated projection, Plan fallback
2. persistent photo-scene calibration contract
3. calibrated camera/floor/wall mapping
4. geometry-faithful Build projection with perspective/contact/occlusion
5. Arrange photo manipulation + object masks
6. background inpainting/reconstruction for moved objects
7. Organize real-photo before/after proposals
8. iOS RoomPlan/RealityKit enhanced pipeline
9. multi-photo/depth refinement
10. dedicated export/package hardening and broader Build archetypes

## 19. Reconsideration triggers

Revisit architecture if:

- browser rendering cannot provide acceptable calibrated augmentation fidelity
- RealityKit/RoomPlan requires stronger iOS-native separation
- segmentation/inpainting workloads exceed Vercel runtime/cost limits
- scene-derived storage materially exceeds private-group assumptions
- public distribution becomes a goal
- live retail/catalog integration becomes core

## 20. Revision note — 0.5.0

Revision 0.5.0 reverses the user-facing visualization hierarchy established implicitly by earlier implementation work. The canonical geometry model remains unchanged as the authority, but real-photo augmentation is now the primary presentation and interaction surface. Plan/rectangle views are secondary technical tools.

Prior architecture revisions remain preserved in Git history.
