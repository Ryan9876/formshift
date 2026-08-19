# FormShift System & Product Design Specification v0.3

**Status:** Implementation-foundation baseline — not implemented, not deployed  
**Date:** 2026-08-19  
**Project kind:** Greenfield  
**Product name:** FormShift  
**Phase:** Implementation foundation complete; application code not yet started

---

## 1. Executive product definition

FormShift is a private web + iOS spatial-planning application that lets users capture a room/space, understand what is in it, improve its organization, freely experiment with object placement, and design new furnishings/builds for the space.

Every project has three persistent modes:

- **Organize** — FormShift infers that the goal is to make the current room work better and proactively proposes changes.
- **Arrange** — the user directly rearranges existing objects or adds new objects while preserving dimension fidelity.
- **Build** — the user describes something to create; FormShift designs it, validates fit, visualizes it, and produces a blueprint, materials, cost estimate, and effort estimate.

The system combines AI reasoning and image understanding with deterministic geometry and a versioned measurement-aware spatial model.

### Product promise

> **Shape the space around you.**

Capture what exists. Improve it. Try alternatives. Build what is missing.

---

## 2. Product/platform scope

### In scope

- private owner + invited friends
- responsive web app
- native iOS app
- photo capture/upload
- optional LiDAR/RoomPlan enhanced capture on supported iPhones
- manual measurement and correction
- room/object understanding
- Organize recommendations with before/after visuals
- direct Arrange editor
- AI-assisted object addition
- Build design for furnishings/storage and broader conceptual projects
- dimensioned drawings
- materials/BOM
- projected cost range
- projected time/effort range
- PDF export
- Google + Apple sign-in

### Out of scope

- Android
- public marketplace launch as an MVP requirement
- stamped/professional construction documents
- guaranteed exact measurement from arbitrary photos
- structural certification
- automatic code compliance claims
- guaranteed retailer inventory/quotes
- electrical/plumbing/HVAC engineering
- autonomous physical movement/robotics

---

## 3. Core state model

The durable source of truth is a versioned spatial model:

```text
Project
└── Space
    ├── Captures
    ├── Surfaces / Openings / Fixed Features
    ├── Objects
    ├── Measurements
    ├── Constraints
    ├── Spatial Versions
    ├── Organize Proposals
    ├── Arrange Layouts
    ├── Build Requests / Plans
    └── Exports
```

AI conversation and generated images cannot substitute for this model.

### Accuracy states

**Visual / Estimated**  
Useful for organization and concept work; unverified geometry remains visibly estimated.

**Measured**  
Dimensions have device/manual/scale evidence and retain tolerance/provenance.

**Dimension Verified**  
All build-critical dimensions for the specific plan have been explicitly confirmed.

No automatic promotion occurs.

---

## 4. Capture and measurement

### Standard capture

Web and all supported iPhones can:

- take/upload one or more room images
- identify/correct room type
- mark visible walls/openings/fixed items
- review AI-detected objects
- add scale/manual measurements
- correct geometry

### LiDAR-enhanced iOS capture

On supported Apple hardware, FormShift exposes an enhanced RoomPlan-based scan that may capture room geometry, dimensions, and recognized room features/furniture more efficiently.

LiDAR is a capability enhancement, not a dependency. Unsupported devices never see a failed requirement; they use standard capture.

### Measurement contract

Every dimension stores:

- entity/target
- value
- canonical unit
- display unit
- source
- uncertainty/tolerance
- capture/device context
- verification state
- creator
- timestamps
- correction/supersession history

All geometry is internally stored in millimeters.

---

## 5. Organize mode

### User intent contract

The user should not have to prompt “optimize this room.” Entering Organize is itself that intent.

FormShift analyzes the current spatial state to identify practical opportunities such as:

- obstructed access
- poor circulation
- unrelated items mixed together
- frequently used objects placed inconveniently
- underused storage areas
- cluttered visual/functional zones
- blocked openings
- inefficient wall/floor use
- unnecessary duplicate placement
- opportunities to consolidate or create zones

### Organize result

The system should return a small ranked set of useful proposals rather than a long generic advice list.

Each proposal contains:

- target result
- exact objects affected
- proposed location/orientation changes
- constraints respected
- explanation of why it is better
- confidence/assumptions
- geometry-faithful before/after view
- optional AI-generated photorealistic end-state concept
- Accept / Edit / Reject

### Concept imagery rule

AI concept images are inspiration only. They are labeled illustrative and cannot silently change dimensions/coordinates. The structured plan remains authoritative.

### Acceptance examples

- Given a cluttered home-office photo and basic geometry, Organize identifies at least one actionable improvement and provides a valid proposed layout.
- A proposal never moves a fixed object.
- A proposal with a collision/opening conflict is repaired or rejected before presentation as feasible.
- Accepting a proposal creates a new layout version and preserves the previous layout.

---

## 6. Arrange mode

Arrange is an interactive manipulation environment for the current space.

### Existing objects

Users can:

- select
- move
- rotate
- delete
- resize when valid
- rename
- mark fixed/movable
- edit dimensions numerically
- duplicate
- align/snap

### Add objects

Users can add:

- a basic dimensioned object/category
- a manually described object
- an object inferred from an uploaded photo, with dimensions confirmed/corrected by the user
- a Build result

A later retailer/catalog integration may add products, but is not required.

### Accuracy behavior

Dragging an object changes its position/orientation, not its known physical dimensions.

The editor continuously exposes:

- wall distance
- nearby object distance
- collisions
- opening/access conflicts
- user-defined clearances
- dimension confidence/status

If the spatial model is estimated, Arrange remains usable but visibly indicates the uncertainty.

### Layout alternatives

Users can branch from the current layout and keep multiple named arrangements for comparison.

---

## 7. Build mode

### Intent

The user can type naturally, for example:

> “I want a 72-inch-wide storage cabinet on this wall, about 18 inches deep, with adjustable shelves.”

or

> “Design a deck outside this door that fits the available area.”

AI converts the request into visible structured fields and assumptions.

### Structured build brief

- type
- purpose
- target placement
- desired/min/max dimensions
- materials/appearance
- capacity/use requirements
- mounting/installation assumptions
- known constraints
- unknown required inputs

### Build pipeline

1. Understand request.
2. Resolve target placement.
3. Identify build-critical dimensions.
4. Ask for/derive allowed measurements with provenance.
5. Generate candidate structured geometry.
6. Run deterministic fit/clearance checks.
7. Show candidate in the room.
8. Let user revise dimensions/style/features.
9. Generate retained/vector blueprint views.
10. Generate deterministic BOM/material quantities.
11. Calculate projected cost range from configured price data.
12. Estimate effort/difficulty from build characteristics and assumed skill level.
13. Export.

### Build classes

#### Class A — furnishing/storage

Examples: shelving, cabinet, storage unit, desk, bench, organizer.

Eligible for Dimension Verified planning output when critical dimensions are confirmed.

#### Class B — installed furnishing

Examples: wall-mounted shelves/cabinets.

Requires explicit assumptions about substrate, fastening, loading and installation; the product does not certify those assumptions.

#### Class C — structural/site-dependent concept

Examples: deck and similar projects.

FormShift can create the spatial concept, preliminary geometry, contextual visualization, blueprint-style planning drawings, and BOM/cost/effort estimates. It must flag external verification requirements such as structure/load, foundation/footings, attachment, stairs/guards and jurisdiction/site conditions. It may not imply structural/code approval.

---

## 8. Blueprint engine

Blueprints come from structured geometry, never from an AI-generated blueprint picture.

As applicable generate:

- plan/location view
- front elevation
- side elevation
- component/cut views
- overall dimensions
- component dimensions
- placement offsets
- clearances
- assumptions/notes
- measurement verification legend

The retained/vector representation should support crisp PDF export and future interactive editing.

### Export status

**Planning Plan** can contain estimated dimensions, clearly marked.

**Dimension-Verified Plan** requires all build-critical dimensions confirmed and current.

Neither status implies professional approval.

---

## 9. Materials, price and effort

### Materials

The BOM derives from build components and deterministic arithmetic.

Each item includes:

- material/component
- quantity
- unit
- dimensions/spec
- calculated requirement
- waste factor
- purchase quantity where known
- confirmation-needed marker

### Price

Cost is presented as a range, not false precision.

Required metadata:

- low / expected / high
- price source/catalog
- as-of date
- region assumption
- waste assumption
- excluded items
- tax/delivery treatment

When pricing data is missing, FormShift marks it missing instead of inventing a current price.

### Effort

Show:

- difficulty tier
- active labor-hour range
- possible elapsed-time range
- assumed DIY skill level
- major tool categories
- steps driving complexity
- external-verification items

---

## 10. AI subsystem

AI is built in, not an optional plug-in.

### Initial AI capabilities

- multimodal room/image understanding
- object identification and semantic description
- room function/zone inference
- organization proposal generation
- end-state concept visualization
- natural-language object creation
- natural-language build normalization
- build candidate generation
- conflict explanation/revision
- difficulty/effort input classification

### Authority boundary

AI cannot authoritatively decide:

- user authorization
- final coordinates without validation
- final measurement verification
- collisions/clearances
- material quantity arithmetic
- blueprint dimension geometry
- cost arithmetic
- Dimension Verified export eligibility

### Vercel integration

AI calls originate from server-side Vercel routes/functions. Model/provider integration is abstracted so tasks can use different multimodal, reasoning, or image models without changing the spatial domain.

All state-changing AI output is structured and validated before it becomes a proposal/version.

---

## 11. Authentication and privacy

### Authentication decision

Use Supabase Auth with:

- Google primary sign-in
- Apple secondary sign-in

Use an application-level invite/allowlist so only approved users can enter the product even if they successfully authenticate with Google/Apple.

No public self-service registration is required.

### Authorization

- projects are private by default
- project membership controls sharing
- PostgreSQL and Storage policies enforce access
- no reliance on hidden UI for security

### Privacy

- encrypted transit
- private object storage
- server-only API keys
- minimal AI task context
- deletion controls
- explicit retention/deletion behavior
- no accidental room-image logging to generic telemetry

---

## 12. Client/deployment architecture

### Web

Responsive app deployed on Vercel.

### iOS

Shared React Native/Expo product application with native modules/development builds for RoomPlan/ARKit-class features.

If native spatial quality proves materially constrained by the shared-client approach, the RoomPlan/canvas layer may become more native without changing the backend/domain contracts.

### Backend

Supabase:

- Auth
- Postgres
- Storage
- RLS

Vercel:

- web hosting
- server APIs/functions
- AI orchestration
- provider routing

GCP is not an MVP dependency.

---

## 13. FormShift interaction model

### Global project shell

All project modes share:

- project/capture state
- room model
- measurement status
- active layout/version
- mode switch
- history/undo/version access

### Mode toggle

`Organize | Arrange | Build`

This control is persistent and prominent. It changes the active toolset without leaving the project.

### AI is contextual

Avoid a large persistent chatbot panel. AI appears where it is useful:

- Organize proposals
- object understanding
- “describe an object”
- “describe what you want to build”
- revision prompts
- explanation drawers

---

## 14. Visual/brand system

### Name

**FormShift**

### Tagline

**Shape the space around you.**

### Logo

Offset layered room contours forming an abstract `F`, with a stable blue datum point. The rear layer visually recesses and the foreground layer bows outward. Subtle opposing motion reinforces spatial depth.

### Parallax-derived design

FormShift adopts the established light Parallax language:

- warm gray / neutral beige workspace
- extremely muted yellow-green and light-brown undertones
- no pink/purple cast
- restrained primary blue `#0D7496`
- soft peach for selected secondary/AI metadata
- clear-glass/clear-ice surfaces
- recessed navigation/top shelf versus lifted workspace
- opposing concave/convex boundaries
- subtle inertial parallax/sheens
- stable sharp text
- reduced-motion fallback

The spatial canvas remains calmer than the surrounding chrome while users measure or drag objects.

---

## 15. Key user flows

### First project

1. Sign in with Google/Apple.
2. Invite authorization verified.
3. Create project / name space.
4. Choose capture method.
5. Capture/upload.
6. Review detected room/objects.
7. Add/correct measurements.
8. Land in project with Organize / Arrange / Build.

### Organize

1. Enter mode.
2. AI analyzes latest spatial state.
3. See prioritized opportunities.
4. Compare end-state examples.
5. Accept/edit/reject.
6. Accepted proposal becomes a new layout version.

### Arrange

1. Enter mode.
2. Manipulate existing objects or add new object.
3. See live dimensions/clearances/conflicts.
4. Save as current or named alternative.

### Build

1. Select target location.
2. Describe build.
3. Review structured brief and missing measurements.
4. Generate candidates.
5. Review in-space design.
6. Revise/confirm.
7. View blueprint/material/cost/effort.
8. Export.

---

## 16. Revised acceptance tests

1. Invited user can sign in with Google on web and access only authorized projects.
2. iOS supports Google and Apple sign-in and resolves access through the same FormShift account model.
3. User can create a room project and capture/upload images.
4. Supported LiDAR iPhone offers enhanced RoomPlan capture; unsupported iPhone still completes the project using standard capture.
5. User can correct detected objects and measurements.
6. Organize returns at least one concrete validated proposal with what/where/why plus a before/after visualization.
7. AI concept imagery is visibly labeled illustrative and cannot alter canonical geometry without a structured proposal.
8. Arrange allows move/rotate/add/remove/numeric editing while retaining object dimensions and measurement status.
9. Arrange flags collision/opening/clearance conflicts.
10. User can create and compare at least two layout alternatives.
11. Build accepts a natural-language shelf/cabinet/storage request and produces a spatially valid editable design.
12. Build renders the proposed item in context using geometry-faithful placement.
13. Build generates dimensioned blueprint views from structured geometry.
14. BOM quantities are traceable to build components and explicit waste assumptions.
15. Build shows low/expected/high cost estimate with source/as-of assumptions or explicitly identifies missing prices.
16. Build shows difficulty and time/effort range with assumptions.
17. A requested design that cannot fit returns conflicts and alternatives instead of an unqualified plan.
18. Deck request is permitted but surfaces structural/site/code verification boundaries and cannot be mislabeled as structurally/code verified.
19. Dimension-Verified export is blocked until build-critical dimensions are confirmed.
20. User can delete a project and associated owned assets through the UI.
21. Web and iOS present consistent FormShift branding and Organize/Arrange/Build mode behavior.
22. Reduced-motion setting disables decorative parallax without removing functionality.

---

## 17. Recommended MVP vertical slice

Do not build all subsystems horizontally first. Prove the complete product loop with one room and one simple build:

1. auth + invite gate
2. project/capture
3. manual measurement ledger
4. spatial/object editor
5. Arrange
6. Organize AI with one validated proposal
7. Build: freestanding shelf
8. in-space preview
9. blueprint
10. BOM
11. cost/effort estimate
12. PDF export
13. then add RoomPlan/LiDAR
14. then image-generation concept views
15. then broaden Build archetypes and Class C concepts

This sequence tests whether the shared spatial model actually supports the whole product before expensive capability expansion.

---

## 18. Implementation gate

Before code implementation, produce the Implementation Foundation Pack containing:

- database schema + migrations + RLS policy model
- canonical TypeScript/domain schemas
- Organize/Arrange/Build state machines
- screen/interaction map
- renderer decision/POC plan
- iOS RoomPlan capability contract
- AI task schemas, prompts/evaluation fixtures, fallback policy
- first shelf archetype geometry/material contract
- price catalog + effort-estimate contract
- threat model/privacy/deletion/retention design
- vertical-slice backlog + tests

---

## 19. Specification status

| Area | State |
|---|---|
| Product mission | Approved baseline |
| Name/brand direction | FormShift selected |
| Platforms | Web + iOS |
| Android | Excluded |
| Modes | Organize / Arrange / Build fixed |
| AI | Core planned capability |
| LiDAR | Optional enhanced iOS capability |
| Auth | Google + Apple via Supabase + invite gate |
| Web hosting | Vercel target |
| Backend | Supabase target |
| Spatial source of truth | Fixed |
| Build safety boundary | Fixed baseline |
| Parallax-derived visual direction | Fixed baseline |
| Final logo artwork | Not generated/approved |
| Implementation | Not started |
| Deployment | Not started |


---

## v0.3 Implementation Foundation Addendum

The companion Implementation Foundation Pack is authoritative for implementation detail.

New locked decisions:

- React Native Skia shared precision editor
- Three.js web 3D preview
- RealityKit iOS 3D/AR preview
- RoomPlan local native adapter
- canonical +Y-up X-Z-floor millimeter coordinate contract
- immutable spatial snapshots with relational security/ownership data
- explicit source-version/idempotency handling
- detailed RLS and private Storage policy model
- structured AI task contracts and release eval thresholds
- prompt-injection/data-minimization rules
- first deterministic Build archetype: rectilinear shelving
- dated price snapshots and deterministic effort arithmetic
- staged implementation backlog and friend-beta gates

This addendum does not authorize a deployment claim. The project remains unimplemented until Milestone 0 work begins and un-deployed until actual deployment evidence exists.
