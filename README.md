# FormShift v0.4.2 — Milestone 0 implementation

FormShift is a private iOS + web spatial-planning application with three first-class modes:

- **Organize** — infer how to improve a room and propose geometry-valid changes.
- **Arrange** — move/add/remove objects while preserving physical dimensions.
- **Build** — design feasible objects, place them in the room, and derive drawings/BOM/cost/effort.

## Current state

This repository contains the first executable implementation foundation: shared domain contracts, a private-authenticated Expo iOS/web client shell with a Skia plan-editor spike, a standalone Vercel Functions API, Supabase schema/RLS source, and an iOS RoomPlan native-module capability bridge.

The dedicated Supabase backend **has been deployed and live-validated**. The web/API applications have **not** been deployed to Vercel, and the iOS build has not been physically validated. Treat `CURRENT-STATE.md` as the authoritative deployment boundary.

See `CURRENT-STATE.md` for the authoritative validation/deployment state.

## Repository layout

- `apps/client` — Expo SDK 57 iOS + static web client.
- `apps/api` — separate Vercel Functions app for privileged operations and AI.
- `packages/domain` — dependency-free canonical units/spatial contracts and executable tests.
- `modules/formshift-roomplan` — iOS RoomPlan native module scaffold.
- `supabase/schema` — schema/policy source for a dedicated FormShift project.
- `supabase/tests` — rollback-only RLS isolation harness.
- `scripts` — repository/security validation.
- `docs` — implementation report, verification evidence, and retained v0.3 baseline.

## Environment contract

Copy `.env.example` to the appropriate local/Vercel environment and populate values without committing secrets.

Client/public values:

- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `EXPO_PUBLIC_API_BASE_URL`

API/server values:

- `SUPABASE_URL`
- `SUPABASE_PUBLISHABLE_KEY`
- `AI_GATEWAY_API_KEY`
- `FORMSHIFT_AI_MODEL`
- `FORMSHIFT_ALLOWED_WEB_ORIGINS`

The publishable key may be shipped to the client; the AI Gateway key may not. FormShift does not require a Supabase service/secret key at runtime.

## Prerequisites

- Node 22.13+ for the selected Expo 57 baseline
- network access to resolve npm dependencies
- Xcode/macOS for native iOS development
- access to the dedicated FormShift Supabase project for OAuth configuration and schema/type regeneration
- two Vercel projects: client and API
- Apple development credentials only for signed iOS/RoomPlan physical-device builds; Apple authentication is not part of the current delivery scope

## Install and validate

```bash
npm install
npm run verify
npm run client:web
```

`npm run verify` performs repository/source security checks and the canonical domain tests. After dependencies resolve, also run the real client/API typechecks and web export before deployment.

## iOS

Use an Expo development/native build rather than Expo Go because RoomPlan requires custom native code. The current native module proves only the capability boundary (`RoomCaptureSession.isSupported`); full capture and physical-device validation are later gates.

## Vercel topology

Create distinct Vercel projects from this monorepo:

- client root: `apps/client`
- API root: `apps/api`

The client produces a static Expo web export. The API owns Vercel Functions and server-only credentials. The final project linkage/settings must preserve access to workspace packages outside each application root.

## Supabase sequencing

A dedicated isolated FormShift Supabase project is now active and validated. The source migration baseline is:

1. `supabase/schema/001_initial_formshift.sql`
2. `supabase/schema/002_performance_hardening.sql`

Live validation has already covered RLS isolation, owner bootstrap, private Storage policy, Security Advisor, and generated TypeScript database contract. Remaining Supabase setup is provider configuration:

1. configure Google Auth; Apple authentication is intentionally deferred;
2. add the eventual Vercel preview/production and `formshift://**` iOS callback/redirect URLs;
3. sign in as the configured owner and verify the pending → active owner bootstrap from the actual client;
4. verify an invited friend's pending/approval flow end-to-end before friend-access beta.

Use only the project URL and current publishable key in client/server application configuration. FormShift does **not** require a Supabase service/secret key at runtime.
