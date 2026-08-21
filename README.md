# FormShift

FormShift is a private **photo-first spatial augmentation** application for web + iOS with three first-class modes:

- **Organize** — improve how a real room works using geometry-valid proposals.
- **Arrange** — select and move photographed objects while preserving source-room integrity and canonical measurements.
- **Build** — design feasible objects, place them against the real room, and derive blueprint/BOM/cost/effort outputs.

`CURRENT-STATE.md` is the authoritative record for what is generated, validated, deployed, and deployment-verified. Package manifests may retain their implementation/package version independently from authoritative document revisions and Photo Arrange renderer versions.

## Current repository state

The production application currently runs the Photo Arrange v2.2 baseline. The `scene-foundation-v1` branch/draft PR contains the next-cycle candidate and is **not** production application state until preview + real-device acceptance passes.

The Scene Foundation candidate includes:
- one canonical active Photo Arrange boundary around the frozen v2.2 interaction core
- object-centered MediaPipe segmentation isolated behind a provider adapter
- typed versioned `SceneAnalysis` contracts
- feature-flagged browser-local Depth Anything V2 Small relative-depth analysis
- derived floor/support and depth-ordering primitives
- private RLS-protected scene-analysis persistence
- release/security/domain/Arrange/scene verification gates
- verified-claims API bearer validation

The dedicated Supabase Scene Intelligence schema and performance migrations have been deployed and live-verified. The application feature flags remain off by default and the candidate has not been promoted to production.

## Repository layout

- `apps/client` — Expo iOS + static web client.
- `apps/api` — separate Vercel Functions application for privileged operations and server AI.
- `apps/client/src/scene` — derived SceneAnalysis contracts, provider orchestration, feature flags and persistence.
- `apps/client/src/vision` — interchangeable local vision provider adapters.
- `packages/domain` — dependency-free canonical units/spatial/Build contracts and executable tests.
- `modules/formshift-roomplan` — iOS RoomPlan native adapter scaffold.
- `supabase/schema` — schema, RLS and performance migrations for the dedicated FormShift project.
- `supabase/tests` — RLS isolation harness.
- `scripts` — repository/security/Arrange/scene verification gates.
- `.github/workflows` — CI release gates.
- `docs` — implementation reports and retained historical baselines.

## Environment contract

Copy `.env.example` to the appropriate local/Vercel environment and populate values without committing secrets.

Client/public values:
- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `EXPO_PUBLIC_API_BASE_URL`
- `EXPO_PUBLIC_SCENE_INTELLIGENCE_V1` — default `false`
- `EXPO_PUBLIC_SCENE_DEPTH_DIAGNOSTICS` — default `false`

API/server values:
- `SUPABASE_URL`
- `SUPABASE_PUBLISHABLE_KEY`
- `AI_GATEWAY_API_KEY`
- `FORMSHIFT_AI_MODEL`
- `FORMSHIFT_ALLOWED_WEB_ORIGINS`

The Supabase publishable key may ship to the client because authorization is enforced with RLS. Server AI credentials may not. FormShift does not require a Supabase service/secret key during normal runtime.

## Install and validate

Requirements:
- Node 22.13+; CI currently runs Node 24
- network access for npm/model dependencies
- Xcode/macOS for native iOS development
- Apple development credentials for signed RoomPlan/device builds

```bash
npm ci
npm run verify
npm run client:typecheck
npm run api:typecheck
npm run client:export
```

`npm run verify` includes:
- repository/source checks
- security checks
- canonical domain tests
- Photo Arrange v2.2 contract guards
- scene-boundary isolation/RLS source guards

A successful build is not a substitute for iPhone interaction acceptance when gesture-sensitive Arrange code changes.

## Photo Arrange architecture

The active candidate route uses `PhotoArrangeEditor` as the canonical web boundary. The validated v2.2 selection/gesture editor remains frozen behind it until replacement behavior is proven on-device.

New scene or vision functionality must not coordinate editor state through rendered text, DOM observers, programmatic button clicks, or version-wrapper chains.

Saved photographed-object placements remain editable derived scenes using:
- object-free background
- accepted mask
- photographed-object cutout
- transform metadata
- parent lineage
- composite render for history/display

The immutable source photo is never overwritten.

## Scene Intelligence v1

Scene Intelligence is derived evidence, not measurement truth.

The browser candidate can run Depth Anything V2 Small locally and create a versioned relative-depth artifact with provider/model/version/latency provenance. The user may confirm an initial support region and save the derived analysis privately.

The following are intentionally **not yet claimed**:
- metric depth from a normal photo
- calibrated camera/floor/wall mapping
- production depth-aware occlusion
- perspective-aware physical scaling
- gravity/rigid-body physics
- native RoomPlan capture/normalization

These features require calibrated/confirmed spatial evidence before they may influence physical behavior.

## Supabase migrations

Current source sequence:

1. `supabase/schema/001_initial_formshift.sql`
2. `supabase/schema/002_performance_hardening.sql`
3. `supabase/schema/003_scene_intelligence.sql`
4. `supabase/schema/004_scene_intelligence_performance.sql`

Scene-analysis rows and depth artifacts are private household data protected by project RLS/private Storage policies.

## iOS

Use an Expo development/native build rather than Expo Go where RoomPlan/custom native code is required. The current native RoomPlan module proves capability detection only; production RoomPlan capture and RealityKit spatial behavior are later gates built against the same canonical scene/spatial contracts.

## Vercel topology

Two projects are used from the monorepo:
- client root: `apps/client`
- API root: `apps/api`

The client produces a static Expo web export. The API owns Vercel Functions and server-only AI/auth orchestration. Preview deployments are required before production promotion.

## Release rule

Do not promote Scene Foundation v1 to production until:
1. repository/security/domain/scene gates pass;
2. web and API preview builds are READY;
3. Photo Arrange selection/refinement/zoom/move/save/restore passes the real-device regression checklist in `CURRENT-STATE.md`;
4. scene intelligence remains feature-flagged until its separate preview evaluation passes.
