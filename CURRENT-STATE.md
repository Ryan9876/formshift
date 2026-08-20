# FormShift Current State

**Revision:** 0.4.2  
**Date:** 2026-08-19  
**Milestone:** Phase 3 Build Intelligence is production browser end-to-end validated for the first Class A freestanding open-shelving/storage archetype

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
- Phase 3 atomic Build acceptance migration: deployed
- final open-shelving span constraint migration: deployed and validated
- `accept_shelving_build_plan(jsonb)`: SECURITY DEFINER, empty search path, execute granted to `authenticated`, denied to `anon` and `public`
- unauthenticated RPC invocation: verified rejected with `authentication_required`
- full owner-context Build acceptance transaction: executed successfully inside an explicit rollback test; follow-up verification confirmed zero synthetic measurements, spatial versions, or build requests remained
- database constraint `build_plans_open_shelving_span_check`: validated and enforces `interiorSpanMm <= 1219.2` (48 in) for the current `open_shelving` archetype

### Vercel API

- project: `formshift-api`
- production alias: `https://formshift-api.vercel.app`
- `/api/health`: deployment-verified HTTP 200
- Organize exact-version API and deterministic proposal validation: deployed
- Organize cost-aware Luna -> Terra routing: deployed and production-observed
- Build brief normalization route `/api/ai/build-brief`: deployed and production-observed
- Build acceptance route `/api/build/accept`: deployed and production-observed
- final Phase 3 guarded code baseline: `95bfdec16bb27417b978965241d17565d6d91c91`
- production deployment for guarded baseline: `dpl_AZdKYuqTVBsZSXQeN9zK8ecixX4j` — READY
- docs-aligned production deployment after state record update: `dpl_2PKNznYFx4HQsmrow5nxPNPuM1pa` — READY

### Vercel Web

- project: `formshift-web`
- production alias: `https://formshift-web.vercel.app`
- Phase 2 Organize Intelligence UI: deployed
- editable Organize proposal drafts: deployed; direct proposal-box dragging browser-confirmed by user
- Phase 3 Build Intelligence UI: deployed and production browser end-to-end validated
- final Phase 3 guarded code baseline: `95bfdec16bb27417b978965241d17565d6d91c91`
- production deployment for guarded baseline: `dpl_e8te5dwpysR9vPdT7cpNYvzkGYPP` — READY
- docs-aligned production deployment after state record update: `dpl_5w4VsJu7T1LwweBAar6fcBmqpXX5` — READY

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

- run ID: `f5e6b6da-b43f-4c55-9fcb-486693e4a541`
- status: completed
- model: `openai/gpt-5.6-luna`
- fallback used: no
- valid proposals: 3
- latency: 26,897 ms

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
- Luna production runs: observed with valid proposals and no fallback
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
5. FormShift deterministically validates room fit, ceiling fit, collisions, stock-sheet compatibility, and the current archetype span limit
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
- standard 4 x 8 ft sheet-fit checks
- a conservative maximum **48 in / 1219.2 mm clear unsupported shelf span** for this unbraced archetype
- plywood planning quantity from panel area plus 15% waste
- material rows for nominal 3/4 in plywood, appropriate wood/cabinet screws, and wood glue
- generic USD low / expected / high material allowance
- deterministic active-labor range and basic tool profile

Units wider than the current 48-inch clear-span limit are intentionally blocked until a later archetype adds a center divider/stiffener/support design. The material cost is explicitly a **planning allowance**, not live retailer pricing or an inventory quote.

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

## Phase 3 validation

Phase 3 is now production browser end-to-end validated for the first supported Build archetype.

Validated path:

- user entered `Build a freestanding shelving unit 48 inches wide, 72 inches tall, 16 inches deep with 3 interior shelves.`
- Build brief normalization succeeded in production
- deterministic plan generation/preview succeeded
- Build footprint direct manipulation succeeded
- user accepted the valid Build plan
- browser refresh persistence was confirmed by the user
- accepted Build request: `641e4258-7b21-4b24-8a37-9f9ac36a7c84`
- accepted Build plan: `5348faa8-0de9-4acd-a12f-4a03cac6ea20`
- committed `build-placement` spatial version: `c71f44da-1722-4f62-a736-6a2409434a61`
- parent/source spatial version: `2223a418-d84c-413f-a3b6-d30211ff602c`
- `spaces.active_spatial_version_id` advanced to `c71f44da-1722-4f62-a736-6a2409434a61`
- prior Desk and Chest objects were byte-equivalent between parent and child snapshot: **0 existing objects changed**
- inherited measurement completeness: **0 inherited measurement IDs missing**
- parent measurement links: **9**
- accepted Build version measurement links: **12**
- exactly **3** new `build_derived` dimension observations were appended
- persisted plan dimensions: 1219.2 mm wide x 1828.8 mm high x 406.4 mm deep
- interior clear span: 1181.1 mm
- interior shelves: 3
- planning sheet quantity: 2 sheets of nominal 3/4 in 4 x 8 ft plywood
- component groups persisted: side panels, top/bottom panels, interior shelves, rear stretchers
- material rows persisted: plywood, cabinet screws, wood glue
- planning material allowance persisted: **$110 low / $165 expected / $250 high USD**
- effort estimate persisted: **3.75-7 active hours**, moderate difficulty, intermediate assumed skill
- Build AI run: `14583f70-f182-4a81-8ba4-d641c2939e7d`
- Build AI model: `openai/gpt-5.6-luna`
- Build AI status: completed
- Build AI latency: 4,887 ms
- Build AI usage: 416 input tokens / 362 output tokens / 778 total tokens
- Terra fallback was not required

Pre-production and persistence validation also completed:

- consolidated Phase 3 API preview: READY
- consolidated Phase 3 web Expo preview: READY
- final 48-inch span-guard API preview: READY
- final 48-inch span-guard web Expo preview: READY
- production API deployment at exact final guarded SHA: READY
- production web deployment at exact final guarded SHA: READY
- API builds compiled five TypeScript functions successfully using TypeScript 6.0.3
- Expo/Metro web exports completed successfully with static routes exported
- atomic Build database migration applied successfully
- span constraint migration applied and validated successfully
- RPC security/grant configuration verified
- unauthenticated Build-acceptance RPC rejected
- owner-context atomic acceptance transaction executed successfully under explicit rollback
- rollback integrity verified: zero synthetic test measurements, spatial versions, or build requests remained
- Build domain regression tests were added for valid shelving generation, collision rejection, and rejection of unsupported spans over 48 inches
- standalone `domain:test` execution for the Phase 3 additions was not available from the connected execution environment because it cannot clone external GitHub hosts and the repository has no GitHub Actions workflow; TypeScript compilation of the included test source is covered by the domain package build configuration

## Not yet validated / not claimed

- standalone Phase 3 domain-test runner result
- explicit browser test of an over-48-inch unsupported clear span being blocked
- blueprint/PDF generation
- optimized sheet nesting/cut-layout generation
- live retailer pricing/inventory
- center-divider/stiffener design for shelving wider than the current unsupported-span limit
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
- two historical pre-hotfix Organize `ai_runs` remain marked `running`; this is an observability cleanup item and does not represent active work

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
- **Phase 3 48-inch unsupported-span guard deployed at app and database boundaries:** yes
- **Phase 3 Build browser end-to-end verified:** yes
- **Phase 3 Build persistence/lineage backend-verified:** yes
- **Physical-device validated:** no
- **Full product deployment-verified:** no

## Next implementation target

Proceed from the validated Build foundation to the next rollout slice. The architecture sequence now points to **blueprint/BOM/cost/effort presentation/export hardening** before native RoomPlan capture. The current Build data is sufficient to generate authoritative retained-vector plan/elevation/component views and a PDF package without using AI-generated drawing pixels as geometry.

A separate robustness task should also close historical observability debt by repairing stale pre-hotfix `ai_runs` rows and adding automated stale-run finalization.

## Authoritative record impact

- `CURRENT-STATE.md`: updated to record the production browser-validated Phase 3 Build flow plus exact persistence, lineage, BOM, cost, effort, and AI telemetry evidence
- `ARCHITECTURE.md`: no change required; Phase 3 validated the existing deterministic Build, immutable versioning, provenance, and no-partial-mutation architecture
- `DESIGN-SYSTEM.md`: no change
- `PROJECT-CONSTITUTION.md`: no change
