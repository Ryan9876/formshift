# FormShift Architecture

**Status:** Authoritative architecture  
**Revision:** 0.5.8  
**Established:** 2026-08-19  
**Last material architecture decision:** 2026-08-23

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
          └── Private Storage: source photos, masks, cutouts, depth, backgrounds, renders, exports
          │
          ▼
  Scene + spatial orchestration
          │
          ├── Deterministic geometry / BOM / blueprint engines
          ├── Derived SceneAnalysis providers
          ├── Provider-neutral SpatialImportEvidence
          ├── Source-bound PreparedScene object/background layers
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
- progressive Prepared Scene generation/restoration
- local inspection/comparison of supported external spatial exports
- explicit server-assisted image reconstruction when the user requests it
- exports/sharing

The browser is not required to reproduce RoomPlan capture. External spatial import in the current web implementation is diagnostic/local evidence inspection, not an authority-changing ingestion path.

### iOS

Primary capture/AR platform:
- standard photo capture
- **preferred RoomPlan/LiDAR structural capture on supported devices**
- camera calibration/depth where available
- RealityKit geometry-faithful in-scene placement
- native spatial interaction where browser fidelity is insufficient

On LiDAR-capable devices, direct RoomPlan structural evidence should supersede single-photo monocular support heuristics when the native capture contract is available and validated. Unsupported iPhones retain standard photo/manual/import-assisted workflows.

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
    ├── Scene Analyses (derived)
    ├── Spatial Imports (derived external evidence)
    ├── Prepared Scenes (derived, source-bound)
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

Photos, external meshes/floorplans, depth maps, masks, Prepared Scene layers and renders are not canonical coordinates merely because they contain metric data. They are source evidence or derived scene products until an explicit reviewed adoption path creates/supersedes canonical measurements or spatial versions.

## 5. Coordinate and measurement model

- room-local right-handed Cartesian coordinates
- +Y up, X-Z floor plane
- canonical length unit: millimeters
- explicit floor polygon, ceiling height, openings, objects, transforms, constraints
- measurement observations retain source, tolerance/confidence, verification state, timestamps and supersession
- manual correction supersedes rather than erases provenance
- spatial versions are immutable

No vision/depth/AI/import provider may silently promote inferred or external geometry into verified measurements.

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

Future revisions may add camera intrinsics, horizon/vanishing points, calibrated floor/wall planes, canonical-room-to-image projection, device depth, richer semantic masks, foreground/background ordering, and lighting/environment estimates.

Scene-analysis changes never mutate a source image, measurement observation or spatial version implicitly.

## 6.1 PreparedScene contract

`PreparedScene` is a derived photo-editing acceleration layer built from **one immutable source room photo**. Expensive perception/preparation work is performed once and then reused by Arrange, Organize and later Build visualization rather than repeated for every object interaction.

Prepared Scene contains:
- exact source-photo asset identity
- provider/model provenance
- per-object semantic label/confidence
- per-object mask and photographed-pixel cutout
- independent image-space transform
- mobility class: movable / conditional / fixed
- expected support: floor / wall / surface / unknown
- optional normalized relative-nearness evidence
- one shared derived clean-background plate
- background quality/provenance
- immutable parent/version lineage
- explicit limitations/confidence

Target flow:

```text
Immutable room photo
   ↓ immediate display
Source-bound cache lookup
   ├── hit → restore Prepared Scene
   └── miss → object discovery + segmentation
                   ↓
             object layers
                   ↓
      ghost-resistant quick clean plate
                   ↓ interaction available
             depth/support enrichment
                   ↓
        destination-depth occlusion
                   ↓
        optional explicit AI repair
                   ↓
         private Prepared Scene version
```

Preparation is progressive: source imagery appears immediately; slower discovery, persistence, depth or high-quality reconstruction must not unnecessarily block basic manipulation.

Prepared Scene is **not canonical spatial truth**. Image-space transforms, inferred support, relative nearness and derived occlusion do not update verified dimensions or canonical coordinates unless later calibrated mapping explicitly validates that transition.

### Source lineage invariant

A Prepared Scene may restore only onto the exact `source_asset_id` from which it was derived. Parent Prepared Scene versions must remain on that same source lineage. Derived state from one photograph must never replace or overlay a newer/different room photograph implicitly.

### Persistence model

Prepared Scene persistence is append-oriented and private:
- `public.prepared_scenes` stores source lineage, parent lineage, background quality, object metadata/transforms and provider metadata;
- masks, cutouts and clean-background images are private `assets` stored in `formshift-private`;
- later versions may reuse immutable mask/cutout/background assets rather than duplicate unchanged bytes when their semantic generation remains compatible;
- saving movement creates a new derived version rather than overwriting the source photograph;
- Prepared Scene persistence never writes canonical measurement or spatial-version tables.

The current Prepared Scene cache schema is **`prepared-scene-1.3`**. A material change to clean-background semantics, depth interpretation, object-layer meaning or another persisted derived contract must advance the appropriate generation/schema marker rather than silently reinterpret old derived artifacts. Historical packages remain historical evidence; they are not automatically treated as current.

Provider metadata may retain bounded perception diagnostics and normalized-nearness provenance. Destination-occluded cutouts are currently recomputable rendering artifacts rather than canonical spatial state.

## 6.2 SpatialImportEvidence contract

`SpatialImportEvidence` is a provider-neutral, non-authoritative representation of spatial data supplied from an external capture/reconstruction system. Its purpose is to compare mature structural evidence against FormShift's current room model and to avoid reimplementing commodity capture/reconstruction capability unnecessarily.

The v1 contract supports:
- source provider/format/file metadata;
- explicit coordinate convention/unit evidence;
- glTF/GLB scene, mesh, primitive, vertex, material and image metadata;
- metric scene bounds when glTF accessor bounds and transforms make them derivable;
- RoomPlan/CapturedRoom-style walls, floors, doors, windows, openings, objects, sections, confidence/category counts, polygon evidence and metric bounds;
- Developer Mode/session archive inventory for likely keyframe, depth, confidence and camera/pose artifacts;
- diagnostic comparison with the current canonical `SpatialSnapshot`;
- warnings/limitations and evidence confidence;
- a hard `canonicalMutationAllowed: false` boundary in the current contract.

Current baseline formats are:
- RoomPlan/CapturedRoom-compatible JSON;
- glTF JSON;
- GLB embedded glTF metadata;
- ZIP central-directory inventory for raw capture/session packages.

### Authority boundary

```text
External capture/export
        ↓
SpatialImportEvidence
        ↓
diagnostic comparison
        ↓
human/provider review
        ↓
explicit future adoption workflow
        ↓
canonical measurements / SpatialSnapshot
```

An import is **not** a measurement acceptance event. Metric external evidence can become a candidate for later adoption only through a separate typed workflow that validates source/provider/version, units, coordinate mapping, confidence, project/space binding and human/system review. The current Spatial Import Lab has no such authority.

### Polycam reference role

Polycam is a clean-room **reference capture/reconstruction benchmark and optional external evidence source**, not a FormShift runtime dependency. FormShift may inspect user-exported Polycam/RoomPlan/glTF/GLB/raw packages through the generic import contract.

Polycam Enterprise Content API access is not a baseline dependency. A future API adapter is justified only if it reduces meaningful workflow burden without becoming required for capture, rendering, canonical geometry or user data access.

### Capture-source hierarchy

For structural evidence:

```text
LiDAR-capable iPhone
→ validated native RoomPlan/LiDAR evidence preferred
→ reviewed external RoomPlan/mesh evidence may supplement/compare
→ monocular photo depth remains fallback/augmentation

Non-LiDAR device
→ photo / multi-view evidence + explicit calibration
→ reviewed external mesh/floorplan evidence when supplied
→ monocular estimates remain labeled estimated
```

This hierarchy does not make imported external data automatically authoritative; it prioritizes stronger capture evidence over weaker heuristics when both are available.

## 7. Scene provider architecture

Commodity vision and external spatial capability are accessed through provider boundaries rather than embedded directly into product state or UI logic.

```text
Scene / PreparedScene orchestration
   │
   ├── ObjectDiscoveryProvider
   │    ├── DETR ResNet-50 local/browser candidate
   │    └── future open-vocabulary/native provider
   │
   ├── Segmentation provider
   │    ├── current object-centered MediaPipe path
   │    ├── detector-guided Prepared Scene MediaPipe path
   │    └── future SAM/native alternatives
   │
   ├── DepthProvider
   │    ├── Depth Anything V2 Small local candidate
   │    └── future device/native/server provider
   │
   ├── SpatialImportInspector
   │    ├── RoomPlan JSON
   │    ├── glTF / GLB metadata
   │    └── raw-session ZIP inventory
   │
   └── future calibration / semantics providers
```

Provider output must include provenance and confidence. Providers may be replaced without changing canonical room contracts.

### Object discovery v1

The first Prepared Scene browser candidate uses a quantized ONNX DETR ResNet-50 model through Transformers.js. It is a feasibility provider rather than the final semantic vocabulary. Because DETR is COCO-trained, household classes outside that vocabulary will be missed.

Only detector-backed candidates may become automatic movable layers. Unknown or unsupported objects use the explicit **Add missed object** correction path rather than an unlabeled whole-room sweep. An open-vocabulary detector may supplement or replace DETR only behind `ObjectDiscoveryProvider` after commercial license, device memory and latency are validated.

### Segmentation v1

MediaPipe remains the current interactive segmentation engine. Automatic Prepared Scene segmentation is not accepted as a raw tap mask: the detector bounding box is supplied as a guide, connected mask components are scored against detector overlap/size/seed distance, and only the best bounded component is eligible for the automatic layer. A second detector/mask agreement gate rejects oversized or room-scale masks.

Manual **Add missed object** retains the unguided object-centered path because no trustworthy detector box exists for that user-corrected object.

### Depth and estimated support v1

The initial browser candidate uses Depth Anything V2 Small. Its output is relative monocular depth, not metric distance, and remains **Estimated augmentation** until calibrated against known device/scene evidence.

Prepared Scene may derive an independent `depth-profile` support estimate by sampling bounded vertical transitions across the relative-depth field. That evidence is robustly fit, residual-checked and confidence-bounded. It may be conservatively fused with detector/object contact anchors:

```text
floor-object contact anchors ─┐
                              ├─ conservative agreement/fallback merge → PreparedSupportModel
relative depth profile ───────┘
```

Support provenance is explicit: `detector-anchors`, `object-anchors`, `depth-profile`, `hybrid`, or `fallback`. A `hybrid` result means two independent estimated evidence sources agreed closely enough to combine; it does **not** mean calibrated floor geometry. If sources materially disagree, the stronger bounded estimate wins rather than manufacturing precision.

Depth-support analysis is diagnosable. A rejected profile records whether the cause was invalid depth, too few strong transitions, incoherent transitions, or excessive fit residual. A usable profile records sample counts/strength/residual and the merge decision records whether detector anchors, depth, or a hybrid ultimately controlled the estimated support model. Thresholds should be tuned from this evidence rather than by making a failed result appear more confident.

### Relative-nearness normalization

Provider grayscale direction is not assumed to be universal. FormShift estimates whether larger or smaller depth values represent nearer source pixels and normalizes usable object/source evidence into one derived convention:

```text
0 = relatively farther
1 = relatively nearer
```

If direction confidence is insufficient, object nearness and depth-derived occlusion are withheld rather than fabricated. Prepared-object source nearness is sampled from the object's original photographed location, not from its later edited destination.

This normalized nearness is still monocular/relative evidence. It is not metric depth and cannot become physical collision geometry without calibration.

### Browser inference fallback and stall recovery

A browser exposing WebGPU does not prove the ONNX WebGPU path is usable. Current compatibility contract:
- Apple mobile/WebKit uses ONNX WASM with a conservative thread configuration;
- other browsers may attempt WebGPU;
- failed WebGPU initialization falls back to WASM;
- detector model initialization is bounded to 45 seconds and inference to 30 seconds;
- depth model initialization is bounded to 45 seconds and inference to 30 seconds;
- DETR failure/timeout may not abort Prepared Scene; manual correction remains available;
- depth failure/timeout may not block object manipulation.

The time bounds are recovery ceilings, not performance targets. Device telemetry should drive later optimization.

## 8. Visualization architecture

FormShift has three visual classes.

### 8.1 Photo augmentation — primary

Used for normal decisions:
- original room photo
- prepared multi-object room scene
- augmented Build object in the actual room
- Arrange manipulation
- Organize before/after scene

Rendering should use deterministic object geometry and calibrated camera projection where available. Estimated projection is allowed only when explicitly labeled.

### 8.2 Technical geometry views — secondary

Used for exact verification/diagnostics:
- Skia plan/2.5D editor
- measured perspective geometry view
- depth/calibration diagnostics
- spatial-import comparison diagnostics
- blueprint views
- collision/clearance overlays

### 8.3 AI pixel synthesis — supporting

Used only where structured rendering cannot reconstruct source pixels safely:
- background inpainting after moving/removing objects
- reconstructing unseen surfaces
- visual material/style concepts
- polished illustrative end-state imagery

AI-generated pixels never update geometry implicitly.

### 8.4 Destination-depth occlusion — estimated derived rendering

Before calibrated scene geometry exists, Prepared Scene may use normalized relative nearness to make a moved photographed cutout appear behind source-scene foreground pixels.

The current conservative contract is:
- object dragging renders the full cutout to preserve interaction responsiveness;
- occlusion is recomputed after drag release and after depth enrichment;
- source depth must be materially nearer than the moved object before object alpha is reduced;
- small depth differences are ignored to avoid unstable holes/flicker;
- source pixels inside original Prepared Scene object masks are excluded from the occluder field so the object's old photographed location cannot self-occlude the moved layer;
- ambiguous depth direction disables the effect;
- failure falls back to the unoccluded cutout;
- the effect changes pixels/alpha only and never mutates source imagery, object dimensions or canonical coordinates.

This is an **Estimated augmentation** effect, not calibrated occlusion. Calibrated camera/depth/geometry should supersede it when available.

## 9. Background reconstruction integrity

Prepared Scene needs an immediate local clean-background approximation so object manipulation never depends on a remote image-generation round trip. However, the approximation must not visibly reproduce the object being removed.

### Quick clean-plate contract

The fast deterministic path must:
- derive its replacement evidence only from **unmasked** source pixels around the removed region;
- never use pixels inside the removed-object mask as fill evidence for that same region;
- preserve every unaffected source pixel outside the bounded removal/feather region;
- remain deterministic, local and inexpensive enough for mobile interaction;
- be treated as an approximate interaction background, not photorealistic reconstruction.

The current implementation uses nearest unmasked horizontal/vertical boundary evidence with interpolation and bounded edge feathering. It intentionally prefers a bland but non-duplicated approximation over a visually recognizable ghost of the removed object.

### Removal-mask coverage

Object masks may be expanded by a small image-scale-aware bounded radius before quick fill or high-quality reconstruction. Expansion exists to cover segmentation edge uncertainty, thin bezels, halos and small source shadows; it must not become a broad scene-edit license.

High-quality generated pixels are accepted through a feathered bounded removal region so seams can soften without replacing unrelated source pixels.

### Explicit high-quality repair

High-quality reconstruction remains an **explicit** user action. The user-visible scene must remain usable if the remote model fails.

```text
immutable source photo
   + bounded expanded object-mask union
   ↓
authenticated image-repair provider
   ↓
generated repaired candidate
   ↓
feathered mask-bounded acceptance/compositing
   ↓
derived clean background
```

The generated candidate is never accepted wholesale. Unmasked/unaffected pixels remain the source photograph even if the provider modifies them.

The Prepared Scene repair prompt must treat masked source content as **removal evidence**, not as semantic content to reproduce. The current prompt generation explicitly forbids copying/redrawing/ghosting recognizable removed screens, logos, text, reflected content, edges and object details inside the reconstructed region.

This preserves spatial/source integrity while allowing a generative model to infer pixels that never existed in the original photograph.

### Background-generation versioning

Because clean backgrounds are persisted derived artifacts, a material change to the removal/fill/acceptance semantics requires a new Prepared Scene/background generation. An old ghost-prone clean plate must not silently restore merely because its source photo and object masks are otherwise valid.

Current background artifact kinds are:
- `prepared_scene_background_quick_v2`;
- `prepared_scene_background_ai_v2`.

## 10. Scene augmentation pipeline

Target pipeline:

```text
Immutable source photo / preferred structural capture / reviewed import evidence
   ↓
Prepared Scene object discovery + masks + ghost-resistant clean plate
   ↓
Camera / floor / wall calibration
   ↓
Scene understanding + normalized relative depth + support relationships
   ↓
Canonical spatial object placement where calibrated/adopted
   ↓
Geometry-faithful projection/render
   ↓
Occlusion + contact + lighting treatment
   ↓
Optional AI reconstruction within bounded masks
   ↓
Labeled augmented scene
```

Until camera calibration exists, estimated mapping/occlusion may be used only as explicitly labeled visualization. Imported evidence also remains non-authoritative until explicitly reviewed/adopted. Plan/canonical geometry remains fit authority.

## 11. Arrange architecture

Direct manipulation occurs in the photo scene where possible. Hidden geometry keeps dimensions and future collision/position constraints authoritative.

A committed single-object photo arrangement is an editable derived-scene version, not only a flattened image. Its persistence retains composite result, object-free background when available, accepted mask, photographed-object cutout, transform metadata and parent lineage.

### Prepared Scene fast path

When Prepared Scene is enabled and validated, Arrange should prefer a precomputed layered room so recognized objects are immediately selectable/movable and share one clean background plate. Missing/incorrect objects retain interactive add/refine correction rather than requiring automatic perception to be perfect.

The validated single-object editor remains the fallback until Prepared Scene meets device-quality gates. Disabling the Prepared Scene path must restore the fallback without source-photo mutation.

### Canonical editor boundary

The application route owns one canonical `PhotoArrangeEditor` boundary for the validated fallback. Versioned experimental wrappers must not remain the normal coordination mechanism.

New providers/rendering behavior must use explicit interfaces/state rather than `MutationObserver`, rendered text scraping, programmatic control clicks or inline-style substring matching.

Scene realism work remains isolated from the validated short-tap/pan/pinch/refinement gesture contract.

## 12. Organize architecture

Inputs:
- source photo / SceneAnalysis / Prepared Scene
- active spatial version
- object semantics and constraints
- prior accepted/rejected proposals

AI proposes strategy/actions; deterministic geometry validates them. The primary result is a before/after real-room visualization; Plan is secondary verification.

Prepared Scene should become the reusable photo-layer substrate for Organize once object discovery/correction quality is sufficient.

## 13. Build architecture

```text
Describe → Normalize → deterministic geometry → Validate →
Project/render into real room photo → User reviews/adjusts →
Accept version → Blueprint/BOM/Cost/Effort
```

Current Class A archetype: freestanding open shelving/storage.

The deterministic Build engine owns dimensions, components, placement envelope, collision/containment, span rules, quantities, cost inputs, effort characteristics and retained blueprint geometry. Image augmentation never replaces that authority.

## 14. Rendering decisions

- React Native Skia: technical 2D/2.5D precision views
- web calibrated scene rendering: Three.js-class path when needed
- iOS geometry/AR: RealityKit
- iOS room capture: RoomPlan behind a native adapter; preferred structural source on validated LiDAR devices
- external mesh/floorplan evidence: provider-neutral SpatialImportEvidence; no Polycam-specific renderer required
- web physical simulation: Rapier-class path only after support/collision geometry is reliable
- photo compositing: shared scene-projection contract with platform-specific implementation allowed
- blueprint: retained/vector geometry, never AI-drawn blueprint pixels

Physics does not precede spatial evidence. Gravity/support behavior must operate on calibrated/confirmed scene geometry rather than a screen-space heuristic or monocular-nearness rendering effect.

## 15. Backend and derived-scene persistence

### Supabase

Supabase owns Auth, PostgreSQL, private Storage and RLS/storage policies.

`public.scene_analyses` stores versioned derived-scene metadata separately from canonical measurements/spatial versions.

`public.prepared_scenes` stores private source-bound Prepared Scene versions. Authorization contract:
- anonymous: no access
- authenticated project readers: SELECT
- authenticated project editors: INSERT for their own derived versions
- project/space/source lineage is explicit
- private Storage paths begin with project UUID and remain protected by existing project-scoped storage policies

Prepared Scene records are append-oriented. New versions preserve parent lineage instead of rewriting prior derived state.

### Spatial imports

The current v1 Spatial Import Lab is **non-persistent and local-only**. User-selected import bytes stay in the browser process for inspection; the lab does not upload them to Vercel, Supabase or Polycam and does not create assets/measurements/spatial versions.

If spatial imports later become persistent project evidence, they must use private project-scoped storage, explicit source/provider/format/version provenance and a separate adoption workflow. Persistence must not imply acceptance as canonical geometry.

### Vercel

Vercel hosts the Expo web export, a separate TypeScript API/functions project, and server AI orchestration. Long-running perception/image workloads may move to a worker architecture if runtime/cost becomes material.

## 16. AI architecture

AI is server-side through Vercel AI SDK / AI Gateway for tasks requiring remote models. Current/target tasks include room interpretation, Organize actions, Build normalization, conflict explanation and image reconstruction/concepts.

State-changing structured AI output must use versioned schemas and pass entity/unit/range/geometry/authorization validation.

Prepared Scene high-quality background repair is a distinct image task with versioned prompt/provider/model/latency provenance. It does not mutate source imagery or canonical geometry. Prompt changes that materially alter image semantics are versioned so output evidence can be traced to the exact behavior requested.

Provider/API keys remain server-only. Private images are not logged into ordinary observability streams.

Local open-source perception models may run in browser/device when privacy, latency and memory budgets are acceptable. Their outputs remain derived evidence subject to the same provenance/confidence boundaries. A new model is not admitted to the commercial product solely because code is available; model/license terms must be sufficiently clear for intended use.

## 17. Security and privacy

- Google through Supabase Auth for current private release
- invitation/allowlist in addition to authentication
- RLS and private Storage enforce authorization
- source room photos, masks, cutouts, depth, clean backgrounds and renders are private household data
- API bearer identity is verified before RLS-scoped server work
- server-only provider/API keys
- project deletion must include derived scene artifacts
- no service-role dependency in normal client runtime
- generative background repair remains explicit rather than an automatic upload side effect
- Spatial Import Lab is authenticated and local-only in v1; imported files are not uploaded/network-fetched by the inspection path
- Polycam/API credentials are not required by the baseline spatial-import architecture

No derived or imported layer may overwrite the immutable source photo or canonical geometry implicitly.

## 18. Versioning and reversibility

Preserve:
- immutable source captures
- spatial-version lineage
- measurement corrections
- SceneAnalysis revisions/provider provenance
- Prepared Scene source/parent lineage and provider provenance
- reusable derived asset identity for masks/cutouts/backgrounds when generation-compatible
- external spatial-evidence source/provider/format/version provenance if such evidence becomes persisted
- accepted/rejected Organize metadata
- editable Arrange alternatives/assets/transforms
- Build versions
- AI visual artifacts bound to source/version
- exports bound to exact source versions

Feature-flagged scene providers retain a clean fallback to the last validated photo-editing behavior.

Support/depth behavior uses a generation/version marker when its semantic interpretation changes. Clean-background behavior likewise advances its persisted generation when the fill/removal/acceptance contract materially changes. Older ambiguous or known-defective derived evidence must be recomputed or explicitly migrated rather than silently reinterpreted.

External import parsers/adapters are versioned evidence translators. A parser change must not silently reinterpret previously adopted measurements; any future adoption step must record the importer/provider/version used.

## 19. Reliability and observability

Record privacy-safe correlation IDs plus relevant task/provider/model/prompt/importer versions, latency, geometry-validation failures, scene-analysis failures, Prepared Scene discovery/segmentation/cache failures, spatial-import parse/comparison failures, image-repair failures, export failures and auth denials.

Release gates include repository/security/domain checks, client/API typechecks, production web export, interaction regression coverage where available, preview deployment and physical-device acceptance for gesture-sensitive or visually critical changes.

Wave 3 preview gating adds a fail-closed build boundary for the web candidate: the Vercel web preview runs repository/security/domain/Arrange/scene/Prepared-Support/**Spatial-Import** verification plus the client TypeScript check **before** Expo export. The Spatial-Import gate verifies glTF/GLB metric metadata, RoomPlan evidence, ZIP inventory, canonical comparison, no network upload and no canonical persistence mutation. A failed guard or client typecheck prevents the preview from becoming READY. The separate API Vercel project remains independently required to build successfully; GitHub CI retains the full cross-workspace API typecheck where all workspace dependencies are installed.

Prepared Scene evaluation measures:
- object discovery coverage
- per-object segmentation quality
- time-to-first-editable-object
- full preparation latency
- private-cache save/restore behavior
- mobile memory pressure
- quick clean-plate ghost/duplicate-object rejection
- clean-background boundary/seam quality
- remote repair latency/quality and removed-object reappearance rate
- support-evidence provenance/confidence and detector-vs-depth agreement
- depth-profile rejection reason/sample counts/residual
- inferred depth-direction confidence
- destination-occlusion hidden fraction/stability
- provider timeout/fallback behavior

Spatial-import evaluation measures:
- format/parser compatibility with real exports;
- coordinate/unit/bounds correctness;
- RoomPlan structural count/transform accuracy;
- imported-vs-canonical dimension deltas;
- raw archive evidence-class coverage;
- privacy/no-upload compliance;
- explicit non-mutation/adoption separation.

Do not infer physical/device or real-export compatibility from a successful synthetic/build test.

## 20. Rollout sequence

1. preserve/validate editable Photo Arrange v2.2 baseline
2. canonical Arrange boundary + regression gates
3. persistent SceneAnalysis/provider contract
4. Prepared Scene progressive multi-object feasibility behind independent route/flag
5. source-bound Prepared Scene private persistence + explicit background reconstruction
6. detector-backed object discovery/correction workflow based on device evidence
7. detector-guided masks + relative-depth support-profile/hybrid enrichment
8. diagnosable normalized-nearness + conservative destination-depth occlusion
9. ghost-resistant clean plate + bounded high-quality reconstruction acceptance
10. provider-neutral spatial import/reference benchmark with real RoomPlan/Polycam/glTF evidence
11. expand/validate native RoomPlan structural capture on LiDAR iPhones
12. explicit image-space calibration fallback for non-LiDAR photos
13. calibrated source-scene semantics, camera/floor/wall mapping and depth-aware occlusion/contact rendering
14. physical constraint engine / Rapier or RealityKit integration where supported
15. photo-first Organize visualization using Prepared Scene/shared scene engine
16. calibrated Build visualization
17. local/cloud image-provider routing and quality/cost optimization
18. private-beta hardening and broader Build archetypes

## 21. Reconsideration triggers

Revisit architecture if:
- browser rendering cannot provide acceptable calibrated augmentation fidelity
- local Prepared Scene model loading exceeds iPhone memory/latency budgets
- automatic household-object coverage remains inadequate after a broader provider evaluation
- relative-depth direction cannot be inferred robustly enough for stable destination occlusion
- deterministic local clean plates remain visually unacceptable even as an interaction placeholder
- remote repair repeatedly recreates masked source objects despite bounded masks/prompting
- RoomPlan/import evidence proves sufficient to remove additional monocular structural heuristics
- external spatial formats prove too unstable to normalize safely behind one evidence contract
- a paid provider API becomes necessary rather than optional for core operation
- RealityKit/RoomPlan requires stronger iOS-native separation
- segmentation/depth/inpainting workloads exceed browser/Vercel limits or cost
- Prepared Scene derived storage materially exceeds private-group assumptions
- public distribution becomes a goal
- live retail/catalog integration becomes core

## 22. Revision note — 0.5.8

Revision 0.5.8 adds a provider-neutral external spatial-evidence layer after Polycam was selected as a clean-room reference benchmark for mature room capture/reconstruction. The protected web Spatial Import Lab locally inspects RoomPlan/CapturedRoom JSON, glTF/GLB scene metadata and raw-session ZIP inventories, compares supported metric evidence against the current FormShift `SpatialSnapshot`, and has no persistence or canonical mutation authority. Polycam remains an optional benchmark/import source rather than a runtime or Enterprise-API dependency. On validated LiDAR-capable iPhones, native RoomPlan structural evidence is now the preferred architecture over increasingly complex single-photo support heuristics; monocular depth remains an estimated fallback/augmentation path. Any future external-evidence adoption into canonical measurements/spatial versions must be explicit, typed, provenance-preserving and separately reviewed. Physics remains gated behind calibrated/confirmed support and collision geometry.