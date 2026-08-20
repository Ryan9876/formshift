# FormShift Current State

**Revision:** 0.4.2  
**Date:** 2026-08-19  
**Milestone:** Phase 4 Build workspace and authoritative blueprint presentation are deployed; authenticated production UI validation is next

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
- dedicated authenticated `/build` workspace with room fit, dimension editing, summary, cut list, materials/cost, effort, and retained-geometry blueprint views
- retained technical front elevation, side elevation, and top view generated from authoritative Build geometry rather than AI-generated drawing pixels
- browser print/save-PDF convenience from the Blueprint tab; this is not yet a dedicated persisted FormShift PDF export package
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
- Phase 4 does not change the API contract or Supabase persistence boundary

### Vercel Web

- project: `formshift-web`
- production alias: `https://formshift-web.vercel.app`
- Phase 2 Organize Intelligence UI: deployed
- editable Organize proposal drafts: deployed; direct proposal-box dragging browser-confirmed by user
- Phase 3 Build Intelligence UI: deployed and production browser end-to-end validated
- Phase 4 Build workspace code baseline: `0664be72e051c69d374201b8865785a925f66131`
- Phase 4 production deployment: `dpl_GXjTGoUZGBdFvZLcpybvQhAVTuSL` — READY
- Expo static export includes `/build`, `/`, `/_sitemap`, and `/+not-found`
- production `/`: HTTP 200 smoke-verified
- production `/build`: HTTP 200 smoke-verified and protected by the same FormShift access gate

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

Phase 3 is production browser end-to-end validated for the first supported Build archetype.

Validated evidence:

- accepted Build request: `641e4258-7b21-4b24-8a37-9f9ac36a7c84`
- accepted Build plan: `5348faa8-0de9-4acd-a12f-4a03cac6ea20`
- committed `build-placement` spatial version: `c71f44da-1722-4f62-a736-6a2409434a61`
- parent/source spatial version: `2223a418-d84c-413f-a3b6-d30211ff602c`
- room active version advanced to the Build version
- prior Desk and Chest unchanged: **0 existing objects changed**
- inherited measurement completeness: **0 inherited measurement IDs missing**
- measurement links: **9 inherited -> 12 total**, with exactly **3** new `build_derived` observations
- persisted plan dimensions: 1219.2 mm wide x 1828.8 mm high x 406.4 mm deep
- interior shelves: 3
- planning sheet quantity: 2 sheets
- component groups persisted: side panels, top/bottom panels, interior shelves, rear stretchers
- material rows persisted: plywood, cabinet screws, wood glue
- planning material allowance persisted: **$110 low / $165 expected / $250 high USD**
- effort estimate persisted: **3.75-7 active hours**, moderate difficulty
- Build AI model: `openai/gpt-5.6-luna`; Terra fallback not required

## Phase 4 Build workspace

Phase 4 implements the approved finished-result direction without replacing the validated Phase 3 engine.

Implementation:

- shared `useBuildPlanner` owns Build brief normalization, deterministic plan generation, placement validation, and atomic acceptance for both Studio and the dedicated workspace
- Studio Build card now offers **Open full Build workspace**
- authenticated `/build` route uses the existing FormShift access gate
- desktop workspace uses recessed navigation, left Build controls, central authoritative room plan, right summary/materials/accept rail, and bottom technical detail area
- responsive layout collapses for narrower screens instead of shrinking the desktop three-column arrangement
- only the proposed Build object remains draggable; existing room objects remain locked
- tabs: **Cut list**, **Materials & cost**, **Effort**, **Blueprint**
- Blueprint uses deterministic retained geometry for front elevation, side elevation, top footprint, dimensions, construction notes, and verification legend
- the blueprint explicitly distinguishes planning geometry and verification requirements
- no photorealistic room image is used as geometric authority; the central editor remains the real spatial plan
- no optimized plywood nesting is claimed
- web Blueprint tab exposes **Print / save PDF** through the browser print pipeline; a dedicated persisted blueprint-only PDF generator remains future work

Deployment validation completed:

- exact final branch preview SHA `0664be72e051c69d374201b8865785a925f66131`: READY
- preview Expo export included `/build`
- `main` fast-forwarded from validated Phase 3 baseline to the exact previewed Phase 4 SHA
- production deployment `dpl_GXjTGoUZGBdFvZLcpybvQhAVTuSL`: READY
- production `/` smoke test: HTTP 200
- production `/build` smoke test: HTTP 200
- API, database, and atomic Build acceptance contracts were intentionally unchanged

## Not yet validated / not claimed

- authenticated browser validation of the full Phase 4 `/build` workspace
- production validation of Build generation, drag, tabs, blueprint rendering, and acceptance from the new full workspace
- browser print/save-PDF output quality
- persisted/reloadable latest Build blueprint after a hard refresh of `/build`; the current full workspace blueprint is tied to the active planner session
- dedicated persisted blueprint-only PDF/export record
- optimized sheet nesting/cut-layout generation
- standalone Phase 3/4 domain-test runner result
- explicit browser test of an over-48-inch unsupported clear span being blocked
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
- **Phase 3 Build browser end-to-end verified:** yes
- **Phase 3 Build persistence/lineage backend-verified:** yes
- **Phase 4 full Build workspace deployed:** yes
- **Phase 4 `/build` production route smoke-verified:** yes
- **Phase 4 authenticated UI/browser workflow verified:** no
- **Dedicated FormShift PDF export verified:** no
- **Physical-device validated:** no
- **Full product deployment-verified:** no

## Next validation target

Validate the new production Build workspace while authenticated:

1. open Studio and switch to **Build**
2. select **Open full Build workspace**
3. confirm the dedicated workspace loads with Build controls, room canvas, summary rail, and detail tabs
4. enter a supported freestanding shelving brief and run **Start build plan**
5. confirm extracted dimensions, then generate the plan
6. drag only the proposed Build footprint and confirm existing room objects remain locked
7. inspect **Cut list**, **Materials & cost**, **Effort**, and **Blueprint**
8. verify front/side/top blueprint dimensions match the generated plan
9. test **Print / save PDF** and inspect the browser print output
10. accept a valid Build plan and confirm the existing atomic acceptance path still succeeds
11. return to Studio and confirm the committed Build object remains present

After this passes, the next implementation should make accepted Build plans reloadable as persistent blueprint records and then generate a dedicated blueprint-only PDF/export artifact from retained geometry.

## Authoritative record impact

- `CURRENT-STATE.md`: updated for deployed Phase 4 Build workspace, exact production deployment evidence, route smoke verification, and remaining browser-validation limits
- `ARCHITECTURE.md`: no change required; Phase 4 implements the existing retained-vector blueprint and deterministic Build architecture
- `DESIGN-SYSTEM.md`: no change required; Phase 4 implements the existing Build workspace and blueprint visual language
- `PROJECT-CONSTITUTION.md`: no change
