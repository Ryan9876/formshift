# FormShift Current State

**Revision:** 0.4.2  
**Date:** 2026-08-19  
**Milestone:** Milestone 0 implementation in progress — dedicated Supabase backend deployed and validated; dependency-resolved web/iOS and Vercel/device validation pending

## Current implementation

FormShift has a concrete v0.4.2 implementation repository containing:

- Expo iOS + responsive web client shell
- Parallax-derived FormShift branding and private access gate
- persistent Organize / Arrange / Build modes
- responsive React Native Skia precision-plan editor spike with footprint-aware room-boundary clamping
- dependency-free canonical spatial/measurement domain package
- standalone Vercel Functions API application
- structured Organize and Build-brief AI endpoints with model-facing nullable schemas and deterministic validation
- custom iOS RoomPlan capability module
- deployed dedicated Supabase Auth/Postgres/Storage backend in `us-east-2`
- 25-table Supabase schema with RLS enabled on every public application table
- private Storage bucket and project-scoped Storage policies
- configured first-owner bootstrap through security-invoker RPC + RLS; no Supabase service/secret key is required at runtime
- owner-only access-management path using the caller's verified JWT and RLS
- executable repository/security verification scripts and rollback-only live RLS harness

## Validated in this environment

### Source/domain validation — PASS

- repository structural verifier
- security source verifier
- public-table RLS source coverage: **25/25**
- no Android platform drift in active client configuration
- no committed secret-shaped values detected by the verifier
- canonical TypeScript domain compilation
- seven domain tests covering unit conversion, round-trip stability, baseline model validation, dimension-preserving Arrange movement, fixed-object protection, and baseline AI/layout boundary checks
- API internal/source TypeScript shape check using temporary external-module stubs

### Live Supabase backend — DEPLOYED AND VALIDATED

Dedicated project:

- project: `FormShift`
- project ref: `oomtpnqprxykcjzrlfgc`
- region: `us-east-2`
- reported project cost at creation: **$0/month**
- status at creation: `ACTIVE_HEALTHY`

Applied migrations:

1. `formshift_initial_core`
2. `formshift_initial_auth_helpers`
3. `formshift_initial_rls`
4. `formshift_initial_storage`
5. `harden_owner_bootstrap`
6. `formshift_performance_hardening`

Live verification evidence:

- Supabase reports **25 public application tables**, all with RLS enabled.
- rollback-only two-user RLS isolation test passed: non-members cannot read; viewers can read only after membership; viewers cannot edit or create AI runs; project ownership cannot be reassigned through an authorized update; pending users cannot read shared project data.
- first-owner rollback-only test passed: configured owner activates; a non-configured identity remains pending.
- Supabase Security Advisor: **0 lints** after hardening.
- Supabase Performance Advisor: no remaining warning-class findings after policy/index hardening; only `unused_index` informational notices remain on the fresh empty database, which is expected before workload statistics exist.
- live TypeScript database contract generation succeeded and exposes the expected tables, relationships, enums, and `bootstrap_formshift_owner` RPC.
- client/API local untracked environment files now contain the live Supabase URL and current publishable key. No service-role/secret key is used by FormShift runtime code.

## Corrected during this release

- Apple authentication was removed from the active delivery scope; Google is the sole sign-in provider for the current private beta
- native Google browser-OAuth callback handling now accepts either a PKCE code or returned access/refresh tokens before establishing the Supabase session

- unauthenticated users do not render the room workspace; active product access is required
- new OAuth users default to `pending`, never automatically active
- project-owner updates preserve ownership and avoid recursive RLS behavior
- server bearer-token verification uses the Supabase access-token provider plus `auth.getClaims()`
- exposed elevated owner-bootstrap RPC was replaced with a normal security-invoker RPC governed by a narrowly scoped private RLS helper
- overlapping permissive RLS policies were consolidated
- missing foreign-key covering indexes were added through a catalog-driven migration
- Skia web loading uses deferred CanvasKit initialization instead of loading the precision renderer into every web route
- Arrange movement clamps by object footprint rather than only object center
- model-facing structured AI fields avoid optional-property ambiguity and are normalized before domain validation

## Not yet validated / not claimed

- npm dependency installation in this sandbox: **not completed** because outbound npm registry DNS remains unavailable
- dependency-resolved client typecheck: **not completed**
- dependency-resolved API typecheck: **not completed**
- Expo web export: **not completed**
- Skia runtime/input behavior in Safari/iPhone/desktop browser: **not completed**
- Google OAuth provider: **not configured/validated**; Google is the only active sign-in provider requirement
- Apple authentication: **deferred / outside the current delivery gate**
- FormShift Vercel client project: **not created/linked**
- FormShift Vercel API project: **not created/linked**
- Vercel preview: **not deployed**
- physical supported-iPhone RoomPlan capability/capture: **not validated**
- signed iOS development/TestFlight build: **not produced**
- production web/API: **not deployed**
- end-to-end deployment verification: **not complete**

## Release status

- **Generated:** yes
- **Locally source/domain validated:** yes
- **Supabase backend deployed:** yes
- **Supabase backend deployment-verified:** yes, for schema/RLS/storage/bootstrap/advisor scope
- **Dependency-resolved web/iOS build validated:** no
- **Vercel deployed:** no
- **Physical-device validated:** no
- **End-to-end deployed:** no
- **End-to-end deployment-verified:** no

## v0.4.2 delivery decision

- Google is the sole active authentication provider for the current private release.
- Apple authentication is deferred; Apple-native RoomPlan/LiDAR support remains in scope.
- Native Google browser OAuth now handles both PKCE-code and access/refresh-token redirects.
- Web OAuth redirects use the actual browser origin so Vercel preview and production deployments can return to the deployment that initiated sign-in.
- Intended isolated Vercel projects are `formshift-web` and `formshift-api` under team `lew7`; neither project has been created or linked yet.
- Supabase Vercel preview redirect pattern to add once OAuth is configured: `https://*-lew7.vercel.app/**`.

## Next release gate

1. Configure Google OAuth in the dedicated FormShift Supabase project, including the Supabase callback, Vercel web redirects, and `formshift://**` iOS deep-link redirect. Apple authentication is not required for the current release path.
2. Resolve/install dependencies in a networked environment; run real client/API typechecks and Expo web export.
3. Create/link distinct FormShift Vercel client and API projects, populate public Supabase values plus the AI Gateway/model configuration, and deploy a preview.
4. Browser-verify authentication/access states, owner bootstrap, project isolation, Arrange interaction, API CORS/auth behavior, and failure states.
5. Build the custom iOS development client and validate RoomPlan capability/fallback on physical iPhones.
6. Validate project/asset deletion and recovery/rollback behavior before friend-access beta.
7. Update this record with deployment/device evidence before declaring Milestone 0 complete.
