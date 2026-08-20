# FormShift Project Constitution

**Status:** Authoritative durable product baseline  
**Revision:** 0.5.0  
**Established:** 2026-08-19  
**Last material decision:** 2026-08-20  
**Implementation/deployment status:** Tracked only in `CURRENT-STATE.md`.

## 1. Product mission

FormShift is a **photo-first spatial augmentation product** for a small invited group. It helps users understand, reorganize, rearrange, and extend real physical spaces through three connected modes: **Organize, Arrange, and Build**.

The product begins with the user's real room or space imagery. Device-assisted measurement, user-verified dimensions, deterministic spatial geometry, rendering, and AI work together behind that image to make visual decisions useful and trustworthy.

## 2. Fixed experience hierarchy

1. **The real captured photo/scene is the primary user experience.** Users should make Organize, Arrange, and Build decisions in the context of their actual room whenever imagery is available.
2. **Structured geometry is the hidden spatial authority.** The canonical spatial model governs dimensions, position, fit, collision, clearance, quantity arithmetic, and blueprint geometry even when the user is primarily looking at a photograph.
3. **Plan/rectangle views are secondary technical tools.** They exist for verification, measurement correction, diagnostics, and fallback—not as the default product experience.
4. **Augmented visuals must preserve the real room.** New or moved objects should appear in the source scene at plausible scale, perspective, contact, and occlusion. AI-generated or estimated pixels never silently become geometric truth.
5. **Visual confidence is explicit.** A photo augmentation may be Estimated, Calibrated, Geometry-rendered, or Illustrative. The interface must distinguish those states.

## 3. One spatial source of truth

All three modes operate on one versioned structured spatial model. Photos, scans, segmentation masks, depth maps, camera calibration, renders, AI conversations, concept images, and exports are evidence or derived artifacts linked to that model.

A rendered or generated image may never directly overwrite canonical coordinates, measurements, or constraints.

## 4. Mode contracts

### Organize

Entering Organize means: **make this real room work better using what FormShift can see and knows about the space.**

The primary result is a before/after visualization of the same real room, supported by specific moves, rationale, assumptions, and geometry validation. The system should identify clutter, access problems, poor grouping, circulation issues, storage opportunities, and other practical improvements.

### Arrange

Arrange is a photo-first spatial sandbox. Users should be able to move or add visible objects in the real room scene while FormShift preserves the best known dimensions and geometric constraints behind the interaction.

A technical Plan view remains available for exact placement, measurements, and fallback when photo reconstruction is uncertain.

### Build

Build converts a natural-language idea into a structured design, validates it against the real room, and **shows the proposed object in that room photograph before the user relies on the blueprint/BOM/cost/effort package**.

Blueprints and quantities derive from deterministic geometry, not from generated pixels.

## 5. Measurement and accuracy rules

- Canonical internal length unit: millimeters.
- Imperial and metric presentation are user-selectable.
- Every dimension retains source, tolerance/confidence, verification state, and correction history.
- Ordinary photos are never represented as universally exact measurement sources.
- Build-critical dimensions require explicit verification before a design can be labeled Dimension Verified.
- Projects never silently promote between visual/estimated, measured, and dimension-verified states.

## 6. Visualization truth rules

### Geometry-authoritative views

May be used as evidence of fit/clearance when derived from validated spatial state:

- calibrated image projection
- measured perspective render
- plan/2.5D editor
- iOS AR placement
- blueprint views

### Illustrative or estimated views

Useful for visual decision-making but not proof of fit:

- uncalibrated photo overlays
- AI inpainting/reconstruction
- AI-generated concept imagery
- inferred hidden object surfaces

These must carry clear status language such as **Estimated augmentation** or **Illustrative concept — plan dimensions are authoritative**.

## 7. AI rules

AI is core but bounded.

AI may:

- understand room imagery
- classify/describe objects
- infer room use/zones
- propose organization strategies
- normalize Arrange/Build requests
- reconstruct or inpaint missing visual pixels
- generate concept imagery
- explain conflicts and assumptions

AI may not bypass:

- authorization
- measurement provenance
- deterministic geometry validation
- quantity arithmetic
- Build safety rules
- versioning/reversibility
- export/version binding

State-changing AI output must be structured and validated before it becomes committed project state.

## 8. Augmentation architecture principles

Photo augmentation should evolve in layers rather than relying on one opaque image-generation step:

1. immutable source capture
2. camera/perspective calibration when available
3. room surfaces/depth/semantic scene understanding
4. object masks/occlusion relationships
5. geometry-faithful object projection/rendering
6. contact shadow/basic relighting
7. AI reconstruction/inpainting only where source pixels are missing
8. explicit visual-confidence labeling

LiDAR/RoomPlan and multi-photo capture may improve this pipeline but are optional capabilities, not prerequisites for product use.

## 9. Build safety envelope

Furniture-like Class A projects such as shelves, storage, desks, benches, cabinets, and organizers may reach Dimension Verified status when critical dimensions are confirmed.

Installed/non-structural and structural/site-dependent concepts require stronger safeguards and explicit external verification. FormShift does not imply structural, electrical, plumbing, permitting, or building-code approval unless a future jurisdiction-aware capability explicitly implements it.

Blueprints/material lists are planning aids, not stamped professional documents.

## 10. Authentication, privacy, and distribution

- Backend identity: Supabase Auth.
- Current private-release provider: Google only.
- Product access is separately controlled by invitation/allowlist.
- Authorization is enforced by database/storage policy, not visual gating.
- Room imagery, masks, inferred spatial data, dimensions, generated visuals, and exports are private by default.
- TLS in transit; private object storage; RLS on relational data.
- AI providers receive only the minimum required project context.
- No raw OAuth tokens or private room imagery in general logs.
- Project deletion must include owned captures, derived scene artifacts, plans, exports, and spatial data according to documented deletion rules.

Distribution:

- responsive private web app on Vercel
- private iOS build for enhanced camera/RoomPlan/AR workflows
- Android explicitly out of scope
- public marketplace/App Store listing not required

## 11. Durable implementation decisions

Unless explicitly revised:

- shared TypeScript domain across web and iOS
- canonical right-handed coordinates, +Y up, X-Z floor plane, millimeters
- immutable committed spatial versions
- hybrid relational persistence + immutable spatial JSON snapshots
- Supabase for Auth/Postgres/private Storage/RLS
- separate Vercel web and API projects
- server-side AI orchestration through Vercel AI SDK / AI Gateway abstraction
- React Native Skia for technical 2D/2.5D precision editing
- Three.js-class geometry-faithful web rendering path where needed
- RealityKit for iOS AR/3D path
- RoomPlan isolated behind a native adapter/runtime capability check
- retained-vector blueprint geometry; PDF derives from retained geometry, not screenshots
- first end-to-end Build archetype: rectilinear open shelving/storage
- cost estimates use dated/editable planning inputs; missing prices remain missing
- accepted user/AI changes remain reversible through version lineage

## 12. Product quality rule

Implementation convenience must not reverse the experience hierarchy. A technically correct plan editor is not a substitute for the photo augmentation experience when the product goal is to help users see changes in their real space.

## 13. Revision note — 0.5.0

The 2026-08-20 product correction makes photo/scene augmentation explicitly primary. Earlier revisions correctly established structured geometry as authoritative, but the implementation overemphasized plan rectangles as the user-facing workspace. Revision 0.5.0 preserves the spatial model and deterministic safety work while making those systems supporting infrastructure for the real-photo experience.

Prior revision details remain preserved in Git history.
