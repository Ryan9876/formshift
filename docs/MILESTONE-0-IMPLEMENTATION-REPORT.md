# Milestone 0 Implementation Report — FormShift v0.4.2

## Outcome

Milestone 0 now has a concrete Google-only v0.4.2 implementation repository and a **deployed, live-validated dedicated Supabase backend**. The backend architecture-risk gate has passed for schema/RLS/Storage/owner-bootstrap scope. The milestone remains incomplete because dependency-resolved Expo/API builds, Vercel previews, OAuth provider setup, and physical-iPhone RoomPlan validation are still outstanding.

## Implemented

- Google-only OAuth source path with corrected native redirect session handling

- npm-workspace monorepo boundaries
- Expo SDK 57 client scoped to iOS + web only
- private access gate with Google OAuth entry point and pending/active/suspended/revoked states
- persistent Organize / Arrange / Build product shell using the Parallax-derived visual language
- responsive React Native Skia precision-plan editor with deferred CanvasKit loading on web
- footprint-aware Arrange room-boundary clamping
- dependency-free spatial/measurement domain package
- deterministic baseline proposal validator for fixed-object and room-envelope violations
- RoomPlan native capability bridge using runtime support detection
- standalone Vercel Functions API shell with explicit CORS/body limits
- provider-portable structured AI Organize and Build-brief contracts with audited AI-run lifecycle
- Supabase Auth server boundary using access-token forwarding + `auth.getClaims()` verification
- user-JWT/RLS owner access-management path with no runtime Supabase service/secret key
- security-invoker first-owner bootstrap governed by private configured-owner RLS helper
- 25-table deployed Supabase schema with RLS enabled on every public application table
- private Storage bucket/path policies
- live rollback-only two-user RLS and owner-bootstrap validation
- security/performance advisor hardening and FK-supporting indexes
- repository/security verification scripts
- authoritative project records updated in place

## Executed validation

### Local/source

`npm run verify` passes and executes repository structure checks, source security checks, 25/25 RLS source coverage, and seven canonical domain tests.

### Live Supabase

- dedicated FormShift project created in `us-east-2` after the platform reported and confirmed a **$0/month** project cost
- six migrations applied successfully
- 25 public application tables reported with RLS enabled
- rollback-only two-user project-isolation test passed
- rollback-only configured-owner/non-owner bootstrap test passed
- Security Advisor: **0 lints**
- overlapping RLS and missing-FK-index performance warnings remediated
- remaining performance findings are only fresh-database `unused_index` informational notices
- TypeScript database contract generation succeeded
- live Supabase URL/current publishable key wired into local `.env.local` files, which remain gitignored

## Remaining environment blockers / unclaimed states

- outbound npm registry DNS is unavailable in this sandbox, so dependency installation/lockfile generation still cannot complete here
- real dependency-resolved client/API typechecks are not complete
- Expo web export and runtime Skia behavior are not complete
- Google OAuth is not configured yet; Apple authentication is intentionally outside the current release gate
- Vercel client/API projects are not created/linked and no preview exists
- RoomPlan has not been tested in a signed physical-iPhone build
- end-to-end project deletion/recovery has not been validated

## Gate to Milestone 0 completion

Configure Google OAuth, resolve/install dependencies in a networked environment, perform real builds/typechecks, create and deploy separate Vercel previews, browser-test the authenticated workflow, and run RoomPlan capability/capture validation on supported and fallback iPhones.

## Authoritative-record discipline

The active repository contains exactly one copy of each authoritative record at repository root. `CURRENT-STATE.md` distinguishes the now-deployed/verified Supabase backend from the still-undeployed Vercel/iOS layers. `ARCHITECTURE.md` and `PROJECT-CONSTITUTION.md` were updated because the runtime-secret and owner-bootstrap architecture materially changed. `DESIGN-SYSTEM.md` required no change for this release.
