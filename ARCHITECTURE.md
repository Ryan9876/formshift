# FormShift Architecture

**Status:** Authoritative architecture; Milestone 0 implementation in progress  
**Revision:** 0.4.2  
**Established:** 2026-08-19  
**Implementation:** Repository and dedicated Supabase backend implemented; Supabase schema/RLS/storage/bootstrap validated; dependency-resolved client/API and physical-device validation incomplete  
**Deployment:** Supabase backend deployed/verified; Vercel web/API and iOS distribution not deployed

## 1. Architecture decision

FormShift will use a **shared TypeScript/React Native application architecture for web and iOS**, with native iOS modules for RoomPlan/ARKit/RealityKit-class capabilities where the browser cannot provide the required spatial fidelity. The web client is deployed on Vercel; the native iOS client is privately distributed to the small user group.

The backend uses Supabase for identity, PostgreSQL, private file storage, and row-level authorization. Server-side AI orchestration runs through a separate Vercel API/functions application using the Vercel AI SDK / AI Gateway abstraction or an equivalent provider adapter. The Expo client does not depend on Expo server rendering or Expo API Routes in production.

```text
                     Invited users
                          │
               ┌──────────┴──────────┐
               │                     │
        Responsive Web            iOS App
           Vercel              Expo/RN native build
               │                     │
               └──────────┬──────────┘
                          │
                 Supabase Auth
              Google identity
                    + invite gate
                          │
          ┌───────────────┼────────────────┐
          │               │                │
      Postgres        Private Storage   Realtime/events
   spatial/project     photos/scans/      where useful
      state            renders/exports
          │               │
          └───────┬───────┘
                  │
          Server orchestration
            Vercel Functions
                  │
          ┌───────┴────────┐
          │                │
       AI Gateway       Deterministic
   multimodal/text/      domain engines
    image providers   geometry/BOM/blueprint
          │                │
          └───────┬────────┘
                  │
             Versioned model
```

## 2. Architectural priorities

1. spatial/measurement integrity
2. private household-data protection
3. coherent Organize / Arrange / Build state
4. deterministic geometry correctness
5. high-quality iOS spatial experience
6. useful responsive web editing/viewing
7. safe, structured AI integration
8. reversible user/AI changes
9. low operational burden for a small private user base
10. observability, backup, recoverability, maintainability

## 3. Platform scope

### iOS

Primary capture and spatial-interaction platform.

Use Expo/React Native for shared product UI/domain where practical, with **development/native builds** and custom native modules for RoomPlan/ARKit and other capabilities unavailable in Expo Go/browser APIs.

Supported LiDAR hardware gets an enhanced capture path. Unsupported iPhones retain photo + manual measurement workflows.

### Web

Responsive application deployed to Vercel for:

- project management
- photo upload
- manual measurement entry/correction
- Organize review/edit
- Arrange editing where interaction fidelity is sufficient
- Build brief/design review
- blueprint/material/cost review
- exports and sharing

The browser is not expected to reproduce RoomPlan capture.

### Android

No Android client, adapter, QA matrix, release pipeline, or acceptance gate.

## 4. Canonical spatial model

All three modes operate on the same project graph:

```text
User
└── Project
    └── Space
        ├── Captures
        ├── Surfaces / Openings / Fixed Features
        ├── Objects
        ├── Measurements
        ├── Constraints
        ├── Spatial Versions
        ├── Organize Proposals
        ├── Arrange Layouts
        ├── Build Requests
        │   └── Build Plans
        │       ├── Components
        │       ├── Placement
        │       ├── Drawings
        │       ├── Materials
        │       ├── Cost Estimate
        │       └── Effort Estimate
        └── Exports
```

Photos and AI renders are attached evidence/derived assets. They are never the canonical coordinates.

## 5. Coordinate/measurement model

- room-local Cartesian coordinate system
- canonical length unit: millimeters
- surfaces/openings represented explicitly
- objects carry transform, dimensions/bounds, confidence, and fixed/movable state
- layouts/builds bind to a specific spatial version
- manual corrections supersede rather than erase provenance
- all gesture changes have numeric equivalents

Measurement record minimum:

- target/entity
- dimension type
- canonical value
- source
- tolerance/confidence
- device/capture context
- verification state
- creator
- captured/confirmed timestamps
- supersession link

Sources initially include:

- `manual_verified`
- `manual_unverified`
- `ios_roomplan`
- `scale_reference_derived`
- `photo_estimate`
- `imported`

## 6. iOS capture architecture

### Capability detection

At project capture start, determine whether the device supports the enhanced RoomPlan path. Do not show a broken or disabled primary action on unsupported hardware; route directly to standard photo/manual capture.

### Enhanced capture

`IOSRoomPlanAdapter` converts Apple-native room capture output into the canonical FormShift schema and preserves raw native artifacts separately when useful for reprocessing or 3D presentation.

Conceptual interface:

```text
SpatialCaptureAdapter
├── IOSRoomPlanAdapter
└── PhotoManualAdapter
```

Native framework models do not leak into the core database contract.

### Capture review

No scan becomes authoritative until the user can inspect:

- room boundary
- openings
- detected objects/features
- captured dimensions
- uncertainty/unsupported details
- corrections

## 7. Mode architecture

Modes are projections/workflows over one spatial state, not independent mini-apps.

### 7.1 Organize service

Inputs:

- current spatial version
- room type/context
- detected/fixed/movable objects
- open paths/openings
- known dimensions/confidence
- prior accepted/rejected suggestions
- user constraints/preferences when supplied

AI responsibilities:

- infer functional zones and object relationships
- identify clutter/access/storage opportunities
- propose candidate organization strategies
- explain the rationale
- request missing semantic information only when materially useful

Deterministic responsibilities:

- candidate coordinates
- collision/containment
- fixed-object protection
- opening/access conflicts
- user clearance constraints

Outputs:

- 1–3 ranked proposals
- exact affected objects/actions
- validated layout version
- concise reason for each change
- before/after spatial preview
- optional AI-generated concept image clearly labeled illustrative
- accept / edit / reject

### 7.2 Arrange service

Arrange is a direct manipulation editor.

Required operations:

- select
- move
- rotate
- resize where allowed
- add
- remove
- duplicate
- mark fixed/movable
- snap/align
- numeric position/dimension editing
- undo/redo
- save layout alternative

Geometry overlays:

- distance to wall/object
- opening/swing/access zones
- alignment guides
- collision warnings
- dimension confidence status

Adding an object initially supports:

- generic dimensioned primitives/categories
- manually described objects
- object created from a photo with user-confirmed dimensions
- custom build output promoted from Build

Do not make retailer product catalogs an MVP dependency.

### 7.3 Build service

Natural language is normalized into a structured build request containing:

- item/type
- purpose
- target location
- desired/min/max envelope
- dimensions known/unknown
- appearance/material preferences
- what it must hold/do
- placement/mounting assumptions
- relevant room constraints

Flow:

```text
Describe → Normalize → Identify critical dimensions →
Generate candidate geometry → Validate fit/constraints →
Render in room → User edits/approves →
Generate blueprint → Materials → Cost range → Effort estimate
```

The build engine supports a risk classification:

- **Class A: furnishing/storage** — shelves, cabinets, benches, desks, organizers, etc.
- **Class B: installed/non-structural** — wall-mounted or anchored concepts with explicit substrate/fastener assumptions.
- **Class C: structural/site-dependent concept** — decks and similar work. Concept visualization, geometry and preliminary BOM are allowed, but structural/code/site verification remains external and prevents a misleading verified-construction label.

## 8. Visualization architecture

FormShift needs two distinct visual outputs.

### Geometry-faithful views

Used for decisions:

- top-down/2.5D plan editor
- measured perspective view
- iOS AR placement where supported
- blueprint views

These are rendered from structured geometry.

### AI concept views

Used for inspiration/end-state examples:

- organized-room concept
- arranged-room photorealistic preview
- proposed build appearance

Concept images are generated from the source room plus validated proposed state where possible, but must carry **Illustrative concept — dimensions shown in the plan are authoritative** language. Generated pixels never update geometry implicitly.

## 9. AI architecture

### Decision

AI is a core application subsystem accessed server-side. Use Vercel AI SDK / AI Gateway as the initial provider abstraction because it supports structured generation and provider routing without placing model-specific integration throughout the application.

### Task contracts

Initial tasks:

- `analyzeRoomCapture`
- `classifyAndDescribeObjects`
- `inferRoomUseAndZones`
- `proposeOrganizationLayouts`
- `explainOrganizationProposal`
- `normalizeArrangeObjectRequest`
- `normalizeBuildRequest`
- `proposeBuildGeometry`
- `explainBuildConflict`
- `estimateBuildDifficultyInputs`
- `generateConceptVisualization`

### Structured-output rule

Any AI call capable of changing project state returns a versioned schema. The server validates:

1. response schema
2. entity references
3. units/ranges
4. deterministic geometry/rule constraints
5. authorization/project ownership
6. resulting version

The LLM never writes canonical database rows directly.

### Provider/security rules

- provider/API credentials are server-only
- minimal necessary images/context sent per task
- configurable provider/model by task
- model timeout/retry/fallback policy
- request budget/cost controls
- task/model/prompt version logged without unnecessarily retaining raw private imagery

## 10. Authentication and private access

### Decision

Use Supabase Auth.

Provider for the current private release:

1. **Google** — sole active sign-in provider

Apple authentication is intentionally deferred. This does not affect Apple-native RoomPlan/LiDAR support on iOS.

Separate authorization gate:

- `invites` / `approved_users` table controls who may create/use an account
- identity login without an active invite/approval cannot access project data

The application user record remains provider-neutral so additional identity providers can be introduced later without changing project ownership or spatial data contracts.

No password database is required for MVP.

## 11. Backend/data platform

Supabase responsibilities:

- Auth
- PostgreSQL
- private Storage
- Row Level Security
- optional Realtime events
- typed database contract

Vercel responsibilities:

- host the Expo web export as the private web client
- host a separate TypeScript API/functions application
- AI orchestration
- authenticated user-scoped Supabase operations governed by RLS
- export orchestration where suitable
- observability integration

The web client and API may be separate Vercel projects sourced from the same monorepo. This avoids making Expo server rendering/API Routes a production dependency while retaining shared TypeScript packages.

Client-side authorization is never sufficient. RLS/storage policy enforces project access.

## 12. Persistence records

Use a hybrid model.

### Relational/security records

- profiles
- account_access
- invites
- projects
- project_members
- spaces
- assets
- captures
- measurement_observations
- spatial_versions
- spatial_version_measurements
- organize_runs
- organize_proposals
- saved_layouts
- build_requests
- build_plans
- build_components
- material_items
- price_snapshots
- cost_estimates
- effort_estimates
- ai_runs
- exports
- jobs
- audit_events

### Spatial snapshot

Each committed `spatial_versions` row stores an immutable schema-versioned `model_json` containing surfaces, openings, objects, transforms, constraints, and measurement references for that exact room/layout state.

Ownership, authorization, auditability, assets, provenance-heavy measurements, jobs, and estimate rows remain relational. This avoids turning routine spatial editing into dozens of mutable row operations while preserving queryable security boundaries and provenance.

## 13. Cost estimation architecture

Materials quantities come from deterministic plan/component calculations.

Cost estimate:

```text
validated BOM
   + material price catalog / configured pricing source
   + waste factor
   + tax/delivery/excluded-item assumptions
   = low / expected / high estimate
```

Every estimate records:

- price data source
- price effective/as-of date
- locale/region assumption
- excluded items
- waste assumption
- low/expected/high range

Live retailer inventory/quotes are not required.

## 14. Effort estimation architecture

Generate effort from deterministic build characteristics plus AI-assisted task classification.

Output:

- difficulty: Easy / Moderate / Advanced / Expert-review recommended
- estimated active labor-hour range
- estimated elapsed-time range where drying/curing/staging matters
- assumed skill level
- required tool categories
- high-risk/uncertain steps
- external verification requirements

Do not present effort as a promise.

## 15. Blueprint/material engine

Blueprints are generated from validated geometry, not from an AI-generated drawing image.

Initial retained/vector representation should support:

- plan/location view
- front/side elevations
- component/cut views
- placement offsets
- clearances
- overall/component dimensions
- notes/assumptions
- verification legend

PDF export derives from this representation.

Materials calculations derive from build components with explicit waste factors. AI can help classify materials but not perform authoritative quantity arithmetic.

## 16. Versioning/reversibility

Material changes create versioned/superseding state.

Preserve:

- captured/original layout
- accepted organization proposals
- rejected proposals metadata as useful training/preference evidence
- named Arrange alternatives
- build design versions
- measurement corrections
- exports bound to exact source versions

## 17. Reliability/observability

At minimum record:

- request/job correlation ID
- project/user identifiers in privacy-safe logs
- AI task/model/prompt version
- AI latency/error/token/cost metadata when available
- geometry validation failures
- export failures
- capture import failures
- auth/invite denial events

Do not log raw OAuth tokens or room images into general logs.

## 18. Deployment topology

### Web

Vercel production project + preview deployments.

### Backend

Supabase project with migrations, RLS policy tests, storage policies, backup/restore plan, and environment separation where justified.

### iOS

Native signed build, initially private beta distribution. LiDAR capability is additive and feature-detected.

## 19. Rollout sequence

1. shared data/auth foundation
2. project + photo/manual capture
3. spatial editor + measurement ledger
4. Arrange
5. Organize AI + deterministic proposal validation
6. Build furnishing/storage vertical slice
7. blueprint/BOM/cost/effort
8. iOS RoomPlan capture adapter
9. AI concept visualization
10. Class C structural/site-dependent planning safeguards and deck concept support

This sequence proves the canonical model before the hardest native/AI features depend on it.

## 20. Reconsideration triggers

Revisit the architecture if:

- RoomPlan bridging through the shared client materially compromises capture/AR quality
- web and iOS interaction models diverge enough that shared UI becomes a drag
- AI/image jobs exceed Vercel runtime/cost requirements
- image/spatial storage scale materially exceeds private-group assumptions
- a live retailer pricing/catalog feature becomes a core requirement
- public distribution becomes a goal

## 21. Revision record

### 0.2 — 2026-08-19

Replaced Android/universal-marketplace assumptions with web+iOS private deployment; added Organize/Arrange/Build service boundaries; selected AI gateway architecture and Google auth with private allowlist gating; adopted Parallax-derived visual system; added concept visualization, cost/effort architecture, and deck planning safety class.


## 18. v0.3 renderer decision

- Shared 2D/2.5D editor: React Native Skia.
- Web 3D: Three.js through a React integration layer.
- iOS 3D/AR: RealityKit.
- iOS scan: RoomPlan behind `FormShiftRoomPlan`.
- Blueprint: shared retained vector drawing model; PDF generated from retained geometry rather than screenshots.

Web editor payload is lazy-loaded so CanvasKit does not burden auth/project-list routes.

## 19. v0.3 persistence decision

`spatial_versions` is the durable immutable boundary.

Each committed version records:

- parent/source version
- schema version
- source mode
- model hash
- immutable model JSON
- exact measurement evidence references
- actor/time

Relational records remain authoritative for identity, access, ownership, assets, jobs, measurements, AI runs, proposal/build headers, BOM rows, price snapshots, estimates, exports, and audits.

## 20. v0.3 concurrency and idempotency

State-changing server requests name the source spatial version and carry an idempotency key.

- stale source versions are rejected or explicitly branched
- retries cannot create duplicate committed versions/jobs
- AI failure cannot partially mutate canonical state
- long-running derived work stores job state separately from canonical spatial state

## 21. v0.3 security boundary

- RLS on every exposed project-scoped table
- private Storage only for household assets
- access requires active FormShift account plus project membership
- social-login success alone is insufficient
- privileged keys are server-only
- normalized AI-bound images strip unnecessary location/EXIF metadata
- prompt/image text is untrusted data
- user-editable identity metadata is not used for authorization

## 22. v0.3 first Build engine

The first deterministic archetype is a rectilinear open shelving/storage unit.

It must prove:

- target-envelope fit
- critical-measurement gating
- component graph
- cut list
- blueprint views
- BOM/waste arithmetic
- price snapshot arithmetic
- effort task decomposition
- Planning vs Dimension-Verified export states

Doors, drawers, complex cabinet joinery, live retailer catalogs, and structural workflows are deferred.

## 23. v0.3 validation gates

No friend-access release until:

- two-user RLS isolation passes
- Storage isolation passes
- client bundle has no privileged secrets
- RoomPlan path validated on physical supported iPhone
- unsupported iPhone fallback validated
- project deletion path validated
- Organize and Build AI eval gates pass
- shelf vertical slice passes end-to-end
- rollback and backup behavior documented


## 24. v0.3 Vercel/Expo deployment boundary

The production web path is intentionally conservative:

- Expo Router client code is exported for web and hosted on Vercel.
- Privileged/server workloads live in a separate Vercel Functions application.
- The client calls the API through an explicit configured API origin.
- Auth redirect/deep-link configuration is environment-specific.
- Expo server-side rendering is not required for the private MVP.
- Expo API Routes are not a production dependency.

This boundary can be revisited later if Expo hosting/server capabilities materially simplify the system, but changing it requires evidence and an architecture update.


## 25. Implemented Milestone 0 repository topology

```text
apps/client                 Expo 57 iOS + static web client
apps/api                    standalone Vercel Functions API
packages/domain             dependency-free canonical spatial core
modules/formshift-roomplan  iOS RoomPlan Expo native module
supabase/schema             executable schema/RLS source
supabase/tests              rollback-only RLS harness
```

The API deliberately receives authenticated user bearer tokens and validates identity/access server-side. Client-facing and server API Supabase connections use the project URL plus a publishable key; user authorization is carried by the verified caller token and enforced by RLS. **FormShift does not require a Supabase service-role/secret key at runtime.** The AI service uses Vercel AI SDK structured output and does not hardcode a model identifier.


## 26. Milestone 0 authentication and authorization implementation

The implemented private-access path has two distinct gates:

1. Supabase Auth verifies the Google identity.
2. `account_access.status = active` authorizes use of FormShift.

New OAuth identities are provisioned as `pending`, never `active`. UI gating mirrors this state, but database/Storage RLS remains authoritative. Server functions accept the user's Supabase bearer token, pass it through the Supabase client's access-token provider, call `auth.getClaims()` to verify identity, and then perform RLS-scoped operations.

The first configured owner activates through `public.bootstrap_formshift_owner()`, a **SECURITY INVOKER** RPC. The RPC itself has no elevated database privilege; RLS permits the pending-to-active owner transition only when a private, narrowly granted helper confirms that the authenticated JWT email matches the private configured owner identity. Owner access-management thereafter uses the owner's verified user JWT and owner-only RLS policies. No runtime service-role/secret credential is needed.

Authorization metadata is stored in application tables, not user-editable identity metadata. Owner/admin policy also preserves an anti-self-lockout rule.

## 27. Milestone 0 data/security implementation

The initial SQL source defines 25 public application tables and enables RLS on every one. It includes:

- pending/active/suspended/revoked account access
- owner/editor/viewer project membership
- immutable spatial versions and measurement evidence links
- captures/assets
- Organize runs/proposals
- Build requests/plans/components/BOM/prices/cost/effort
- exports/jobs/AI runs/audit events
- private Storage path authorization

A rollback-only two-user RLS harness is supplied for live-database validation. The dedicated FormShift Supabase project has now executed the migration set and rollback-only RLS/bootstrap tests successfully. Supabase reports 25/25 public application tables with RLS enabled, the Security Advisor is clean, and performance hardening has removed warning-class policy/index findings. Fresh-database `unused_index` informational notices are retained until real workload statistics exist rather than prematurely deleting FK-supporting indexes.

## 28. Milestone 0 AI request boundary

Organize and Build-brief Vercel Functions currently enforce this order:

`authenticate → active-access check → project/space RLS check → AI-run audit row → structured AI output → deterministic baseline validation → proposal/brief response`

The model identifier remains environment-configured. Organize results are explicitly returned as geometry-pending until the full collision/rotated-polygon/clearance validator is implemented; the current deterministic baseline already rejects fixed-object moves and moves outside the room envelope.


## 29. Revision note — 0.4.1

### 0.4.1 — 2026-08-19

- Deployed the dedicated FormShift Supabase backend in `us-east-2` and validated schema, RLS, Storage policy, first-owner bootstrap, and generated database contract.
- Removed the runtime Supabase service-role/secret-key dependency; all normal API and owner-access operations now execute with verified user JWTs under RLS.
- Replaced exposed elevated owner bootstrap with a security-invoker RPC plus private RLS helper.
- Consolidated overlapping permissive policies and added missing FK-supporting indexes.
- Updated the precision editor boundary contract so Arrange clamps the complete object footprint inside the room envelope.
- Adopted deferred Skia CanvasKit loading on web and provider-portable nullable structured-output fields for AI contracts.


## 30. Revision note — 0.4.2

- Simplified active identity architecture to Google-only Supabase OAuth for the private release.
- Kept the account model provider-neutral so a future provider can be added without changing project ownership or spatial records.
- Corrected the iOS browser-OAuth callback path to accept both PKCE authorization codes and Supabase access/refresh-token redirects.
- Web OAuth redirects are derived from the initiating browser origin, allowing isolated Vercel preview deployments to return to themselves when included in the Supabase redirect allow list.
- Intended Vercel project isolation remains two projects: `formshift-web` and `formshift-api`.
