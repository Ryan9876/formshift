# FormShift Current State

**Revision:** 0.4.2  
**Date:** 2026-08-19  
**Milestone:** Phase 3 Build Intelligence is deployed for the first Class A freestanding open-shelving/storage archetype; production browser end-to-end validation is next

## Current implementation

FormShift currently includes:

- Expo iOS + responsive web client
- Google-only Supabase authentication for the current private release
- account allowlist/approval and owner bootstrap
- Organize / Arrange / Build modes over one canonical room state
- real room photo capture and private Supabase Storage persistence
- explicit room measurement workflow; photos remain supporting evidence rather than authoritative geometry
- canonical millimeter spatial model
- immutable committed spatial versions with parent-version lineage
- real object creation with recorded dimensions and measurement provenance
- React Native Skia web canvas with scoped direct manipulation
- persistent Arrange save/discard workflow
- Organize Intelligence with exact-version AI requests, deterministic validation, editable proposal drafts, and explicit acceptance
- Build Intelligence for Class A freestanding open shelving/storage with AI brief normalization plus deterministic geometry, cut list, material quantity, fit checks, planning cost allowance, effort estimate, room preview, and atomic acceptance
- dedicated Vercel web and API projects
- custom iOS RoomPlan/LiDAR capability module awaiting physical-device validation
- dedicated Supabase Auth/Postgres/Storage backend with RLS enabled on all 25 public application tables

## Deployed infrastructure

### Supabase

- project: `FormShift`
- project ref: `oomtpnqprxykcjzrlfgc`
- region: `us-east-2`
- private bucket: `formshift-private`
- public application tables: **25/25 RLS-enabled**
- Security Advisor after hardening: **0 findings**
- owner bootstrap and cross-user RLS isolation: validated
- no Supabase service-role/secret key is used by normal FormShift runtime code
- Phase 3 migration `atomic_build_acceptance`: deployed
- `accept_shelving_build_plan(jsonb)`: SECURITY DEFINER, empty search path, execute granted to `authenticated`, denied to `anon` and `public`
- unauthenticated RPC invocation: verified rejected with `authentication_required`
- full owner-context Build acceptance transaction: executed successfully inside an explicit rollback test; follow-up verification confirmed zero test measurements, spatial versions, or build requests remained

### Vercel API

- project: `formshift-api`
- production alias: `https://formshift-api.vercel.app`
- `/api/health`: deployment-verified HTTP 200
- Organize exact-version API and deterministic proposal validation: deployed
- Organize cost-aware Luna -> Terra routing: deployed and production-observed
- Build brief normalization route `/api/ai/build-brief`: deployed
- Build acceptance route `/api/build/accept`: deployed
- Phase 3 production baseline: `8fb21a13b16999a1b845454f68b323b5203bdf27`
- Phase 3 production deployment: `dpl_DU8vCB9UJS8kJGkSJ3piMvKJcH4F` — READY

### Vercel Web

- project: `formshift-web`
- production alias: `https://formshift-web.vercel.app`
- Phase 2 Organize Intelligence UI: deployed
- editable Organize proposal drafts: deployed; direct proposal-box dragging browser-confirmed by user
- Phase 3 Build Intelligence UI: deployed
- Phase 3 production baseline: `8fb21a13b16999a1b845454f68b323b5203bdf27`
- Phase 3 production deployment: `dpl_HGaAsVX8qqmyB3btaryuUkNuPJWL` — READY

## Organize Intelligence routing policy

Organize uses a cost-aware two-tier model ladder:

1. primary default: `openai/gpt-5.6-luna`
2. automatic fallback: `openai/gpt-5.6-terra`

Behavior:

- `FORMSHIFT_AI_MODEL` may override the primary model
- `FORMSHIFT_AI_FALLBACK_MODEL` may override the fallback model
- Terra is attempted once when the primary model fails or produces zero deterministically valid proposals
- model output remains advisory; deterministic geometry validation is authoritative
- no proposal can become committed room state without explicit user acceptance

Latest observed production Organize run:

- run ID: `1ff57016-81a3-47cf-a21f-2d9f0bce46f8`
- status: completed
- model: `openai/gpt-5.6-luna`
- fallback used: no
- valid proposals: 2
- latency: 12,813 ms
- input tokens: 947
- output tokens: 1,043

## Phase 1 validation

- repository structural verifier: PASS
- security source verifier: PASS
- public-table RLS source coverage: **25/25**
- domain tests at Phase 1 baseline: PASS
- client TypeScript typecheck: PASS
- Expo static web export: PASS
- Google OAuth sign-in: browser-validated
- authenticated workspace load: browser-validated
- Choose Photo -> Review -> Save to Room: browser-validated end to end
- room photo persists to private Supabase Storage
- room dimensions persist as measurement evidence
- real objects persist with explicit dimensions
- real persisted objects render in the Skia Arrange canvas
- objects drag in Arrange mode without dimension drift
- Save Arrangement creates a new committed immutable spatial version
- committed Arrange versions preserve parent-version lineage
- browser refresh restores saved object positions

Supabase persistence evidence at Phase 1 close:

- latest committed Arrange version at Phase 1 close: `242420a3-1327-40c1-bf69-7dac10af958d`
- parent: `29f98427-b6bc-44bd-8437-195b328fea6e`
- two persisted objects: Desk and Chest
- both retained identical physical dimensions across saved Arrange versions while their X/Z positions changed

## Phase 2 validation completed so far

- Organize API TypeScript/Vercel preview build: PASS
- Organize web Expo/Vercel build: PASS
- exact-version server-side spatial snapshot loading: deployed
- stale-version guard: deployed
- deterministic boundary/collision/dimension/fixed-object/vertical-movement checks: deployed
- production AI generation: browser-observed working
- Luna production run: observed with 2 valid proposals and no fallback
- editable proposal draft production deployment: READY
- direct dragging of proposal boxes in Organize preview: browser-confirmed by user

Still not separately confirmed for Organize:

- Show current -> Resume editing draft preservation
- invalid manual collision blocks acceptance
- Accept edited layout -> refresh persistence
- immutable `organize` parent lineage after edited proposal acceptance
- production Terra fallback path

## Phase 3 Build Intelligence design

### Supported slice

Current Build support is deliberately limited to **Class A freestanding open shelving/storage**.

The workflow is:

1. user describes the desired shelving/storage item
2. AI normalizes the brief and extracts explicitly supplied dimensions/intent
3. unknown build-critical dimensions remain unknown and must be entered by the user
4. FormShift deterministically generates a rectangular open-shelving design using nominal 3/4 in plywood
5. FormShift deterministically validates room fit and collisions
6. FormShift computes a cut list, material quantity, planning cost allowance, and effort range
7. the proposed Build footprint appears in the room plan
8. only the proposed Build footprint is draggable in Build mode; existing room objects remain locked
9. acceptance re-computes and re-validates the plan server-side
10. one atomic database transaction writes Build records, measurement provenance, and the new immutable `build-placement` spatial version

### Deterministic Build outputs

The first archetype produces:

- two side panels
- top and bottom panels
- user-selected interior shelf count
- two rear plywood stretchers
- standard 4 × 8 ft sheet-fit checks
- plywood planning quantity from panel area plus 15% waste
- material rows for nominal 3/4 in plywood, appropriate wood/cabinet screws, and wood glue
- generic USD low / expected / high material allowance
- deterministic active-labor range and basic tool profile

The material cost is explicitly a **planning allowance**, not live retailer pricing or an inventory quote.

### Build safety/verification boundary

This slice does **not** claim support for:

- built-ins
- wall-anchored design details
- structural/site-dependent work
- electrical/plumbing changes
- code-sensitive construction
- structural engineering
- verified anti-tip attachment design

Even when the room itself is measured, an accepted shelving plan is stored as `planning`, and Build-derived dimensions remain `estimated` evidence until actual stock/site/as-built conditions are verified.

## Phase 3 validation completed so far

- latest consolidated API preview: READY
- latest consolidated web Expo preview: READY
- production API deployment at exact Phase 3 SHA: READY
- production web deployment at exact Phase 3 SHA: READY
- API build compiled five TypeScript functions successfully using TypeScript 6.0.3
- Expo/Metro web export completed successfully with static routes exported
- database migration applied successfully
- RPC security/grant configuration verified
- unauthenticated Build-acceptance RPC rejected
- owner-context atomic acceptance transaction executed successfully under explicit rollback
- rollback integrity verified: zero synthetic test measurements, spatial versions, or build requests remained
- Build acceptance preserves inherited `spatial_version_measurements` lineage and appends the three Build-derived dimension observations
- new Build domain tests were added for valid shelving generation and collision rejection; a standalone `domain:test` execution was not available from the connected execution environment because it cannot clone external GitHub hosts and the repository has no GitHub Actions workflow

## Not yet validated / not claimed

- production browser Build flow: describe -> normalize -> dimension edit -> preview -> drag -> accept -> refresh
- production Build AI brief-normalization telemetry/model result
- accepted real Build request/plan/component/material/cost/effort rows from browser use
- accepted real `build-placement` spatial-version lineage and persistence after refresh
- standalone Phase 3 domain-test runner result
- blueprint/PDF generation
- optimized sheet nesting/cut-layout generation
- live retailer pricing/inventory
- wall anchoring or built-in Build archetypes
- Class B installed/non-structural Build workflow
- Class C structural/site-dependent Build workflow
- physical iPhone camera capture through production web
- physical supported-iPhone RoomPlan/LiDAR scan
- signed native iOS development/TestFlight build
- native iOS Arrange interaction
- project/asset deletion and recovery flow
- multi-project / multi-room selection UX
- full production verification across AI + native iOS + recovery flows

## Release status

- **Supabase backend deployed and verified:** yes
- **Vercel web deployed:** yes
- **Vercel API deployed:** yes
- **Google OAuth browser-validated:** yes
- **Photo capture/save browser-validated:** yes
- **Real-room Phase 1 browser-validated:** yes
- **Arrange persistence backend-verified:** yes
- **Organize production generation observed:** yes
- **Editable Organize drag browser-validated:** yes
- **Organize edited-layout accept/persist fully verified:** not yet
- **Phase 3 Build code deployed:** yes
- **Phase 3 Build database transaction deployed/preflight-verified:** yes
- **Phase 3 Build browser end-to-end verified:** no
- **Physical-device validated:** no
- **Full product deployment-verified:** no

## Next validation target

Validate the production Phase 3 Build slice:

1. switch to **Build**
2. describe a freestanding shelving/storage unit, preferably with explicit width/height/depth and shelf count
3. run **Start build plan** and confirm the normalized brief/dimensions are sensible
4. generate the deterministic plan and preview
5. confirm the cut list, material allowance, effort range, and fit status appear
6. drag the Build footprint to a valid location; confirm existing room objects do not move
7. intentionally create a collision and confirm the plan becomes invalid / acceptance is blocked
8. move it back to a valid location and accept the Build plan
9. refresh and confirm the new shelving object remains in the room
10. inspect Supabase to verify the Build request/plan/BOM/material/cost/effort rows, Build-derived measurements, atomic spatial-version parent lineage, and active-version advancement

## Authoritative record impact

- `CURRENT-STATE.md`: updated for the deployed Phase 3 Build Intelligence release and database migration/preflight evidence
- `ARCHITECTURE.md`: no change required; Phase 3 implements the existing deterministic Build, immutable versioning, provenance, and no-partial-mutation architecture
- `DESIGN-SYSTEM.md`: no change
- `PROJECT-CONSTITUTION.md`: no change
