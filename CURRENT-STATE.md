# FormShift Current State

**Revision:** 0.4.2  
**Date:** 2026-08-19  
**Milestone:** Phase 1 real-room workspace deployed and browser-verified; AI Organize/Build and native iOS device validation remain

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
- dedicated Vercel web and API projects
- structured Organize and Build AI API routes awaiting end-to-end model/configuration validation
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
- Organize/Build AI routes: not yet end-to-end verified

### Vercel Web

- project: `formshift-web`
- production alias: `https://formshift-web.vercel.app`
- current validated code baseline: `ef5e7958e6442bc6e50203b5d9fbfdd49b95f7ae`
- current production deployment: `dpl_3yP3g6n9RRkAn9L6BrWnBeHRbF1D`
- deployment state: READY

## Validated

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

- latest committed Arrange version: `242420a3-1327-40c1-bf69-7dac10af958d`
- parent: `29f98427-b6bc-44bd-8437-195b328fea6e`
- two persisted objects: Desk and Chest
- both retained identical physical dimensions across saved Arrange versions while their X/Z positions changed

## Not yet validated / not claimed

- physical iPhone camera capture through production web
- physical supported-iPhone RoomPlan/LiDAR scan
- signed native iOS development/TestFlight build
- native iOS Arrange interaction
- end-to-end Organize AI route
- end-to-end Build AI route
- deterministic validation of live AI proposals
- production browser AI API CORS/auth flow
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
- **Physical-device validated:** no
- **AI Organize/Build end-to-end verified:** no
- **Full product deployment-verified:** no

## Next implementation phase

Implement Organize Intelligence on the validated real-room substrate:

1. bind requests to the exact committed spatial version
2. send structured room/object/constraint state to AI
3. receive structured proposals over stable object IDs
4. validate every proposal deterministically
5. reject invalid proposals before user presentation
6. show before/proposed layout with reasons and assumptions
7. require explicit acceptance before committing a new spatial version
8. preserve original layout and version lineage

## Authoritative record impact

- `CURRENT-STATE.md`: updated for validated Phase 1
- `ARCHITECTURE.md`: no change
- `DESIGN-SYSTEM.md`: no change
- `PROJECT-CONSTITUTION.md`: no change
