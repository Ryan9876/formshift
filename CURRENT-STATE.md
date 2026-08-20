# FormShift Current State

**Revision:** 0.4.2  
**Date:** 2026-08-19  
**Milestone:** Phase 2 Organize Intelligence deployed; real-room Phase 1 remains browser-verified; Organize proposal/preview/accept still requires end-to-end browser validation

## Current implementation

FormShift currently includes:

- Expo iOS + responsive web client
- Google-only Supabase authentication for the current private release
- account allowlist/approval and owner bootstrap
- Organize / Arrange / Build mode shell
- real room photo capture and private Supabase Storage persistence
- explicit room measurement workflow; photos remain supporting evidence rather than authoritative geometry
- canonical millimeter spatial model
- immutable committed spatial versions with parent-version lineage
- real object creation with recorded dimensions and measurement provenance
- React Native Skia web Arrange canvas with direct object dragging
- footprint-aware room-boundary clamping
- persistent Arrange save/discard workflow
- Organize Intelligence UI with exact-version requests, proposal validation, before/proposed preview, and explicit acceptance
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

### Vercel API

- project: `formshift-api`
- production alias: `https://formshift-api.vercel.app`
- `/api/health`: deployment-verified HTTP 200
- Organize exact-version API and deterministic proposal validation: deployed
- Organize bearer-token verification hotfix: deployed
- Organize model routing baseline: `13d5ce8bfb7c8d66fd99d102500d7d1ea8b487b5`
- routing deployment evidence: `dpl_HLFDJ3db48NxFNwvgATdafn495EX` — READY
- Organize AI route: not yet end-to-end browser-verified through proposal acceptance
- Build AI route: not yet end-to-end verified

### Vercel Web

- project: `formshift-web`
- production alias: `https://formshift-web.vercel.app`
- Phase 2 Organize Intelligence UI: deployed
- authenticated production browser shell and Phase 1 real-room workflow: validated

## Organize Intelligence routing policy

Organize now uses a cost-aware two-tier model ladder:

1. primary default: `openai/gpt-5.6-luna`
2. automatic fallback: `openai/gpt-5.6-terra`

Behavior:

- `FORMSHIFT_AI_MODEL` may override the primary model
- `FORMSHIFT_AI_FALLBACK_MODEL` may override the fallback model
- Terra is attempted once when Luna/model-primary generation fails
- Terra is also attempted when the primary model completes but produces zero deterministically valid proposals
- proposals with no usable move actions do not count as valid
- the selected model and per-attempt usage/error metadata are recorded in `ai_runs`
- model output remains advisory; deterministic geometry validation is authoritative
- no proposal can become committed room state without explicit user acceptance

## Validated

### Phase 1 real-room workspace

- repository structural verifier: PASS
- security source verifier: PASS
- public-table RLS source coverage: **25/25**
- domain tests: PASS
- client TypeScript typecheck: PASS
- Expo static web export: PASS
- Google OAuth sign-in: browser-validated
- authenticated workspace load: browser-validated
- owner bootstrap: validated
- Choose Photo -> Review -> Save to Room: browser-validated end to end
- room photo persists to private Supabase Storage
- room dimensions persist as measurement evidence
- canonical room geometry persists in committed spatial versions
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

### Phase 2 deployment validation completed so far

- Phase 2 Organize API TypeScript/Vercel preview build: PASS
- Phase 2 Organize web Expo/Vercel build: PASS
- exact-version server-side spatial snapshot loading: deployed
- stale-spatial-version guard: deployed
- deterministic boundary/collision/dimension/fixed-object/vertical-movement checks: deployed
- Supabase bearer-token verification regression discovered in production and fixed
- missing required model-environment regression discovered in production and fixed with safe defaults
- Luna primary / Terra fallback routing preview build: PASS
- Luna primary / Terra fallback production API deployment: READY

## Not yet validated / not claimed

- complete Organize flow: Generate options -> validated proposal -> preview -> accept -> refresh persistence
- observed production Luna success path
- observed production Terra fallback path
- semantic quality threshold for escalating otherwise-valid but subjectively weak Luna proposals
- end-to-end Build AI route
- physical iPhone camera capture through production web
- physical supported-iPhone RoomPlan/LiDAR scan
- signed native iOS development/TestFlight build
- native iOS Arrange interaction
- project/asset deletion and recovery flow
- multi-project / multi-room selection UX
- full production verification across AI + native iOS + recovery flows

## Release status

- **Supabase backend deployed and verified:** yes
- **Web build validated:** yes
- **Vercel web deployed:** yes
- **Vercel API deployed:** yes
- **Google OAuth browser-validated:** yes
- **Photo capture/save browser-validated:** yes
- **Real-room Phase 1 browser-validated:** yes
- **Arrange persistence backend-verified:** yes
- **Organize Intelligence code deployed:** yes
- **Organize cost-aware model routing deployed:** yes
- **Organize end-to-end browser-verified:** no
- **Physical-device validated:** no
- **Build AI end-to-end verified:** no
- **Full product deployment-verified:** no

## Next validation target

Validate the production Organize Intelligence vertical slice:

1. generate options against the current committed spatial version
2. confirm at least one proposal is deterministically Validated
3. preview proposed vs current layout
4. accept one proposal
5. verify a new immutable `organize` spatial version is committed with correct parent lineage
6. refresh and confirm accepted positions persist
7. inspect `ai_runs` to confirm which model ran and whether fallback occurred

Do not advance to Build implementation until this loop is validated or a blocking defect is understood.

## Authoritative record impact

- `CURRENT-STATE.md`: updated for confirmed Phase 2 deployment and Luna -> Terra routing decision
- `ARCHITECTURE.md`: no change required; existing architecture already defines configurable model selection and retry/fallback policy
- `DESIGN-SYSTEM.md`: no change
- `PROJECT-CONSTITUTION.md`: no change
