# FormShift Vertical-Slice Backlog v0.3

## Delivery strategy

Build end-to-end slices. Avoid completing all UI, then all backend, then all AI.

Each milestone must leave the product in a coherent, testable state.

## Milestone 0 — Foundation and risk spikes

**Goal:** eliminate architecture risks before feature expansion.

- create monorepo and package boundaries
- Expo web + iOS client baseline
- Vercel static-client preview deployment
- separate Vercel API/functions project baseline
- Supabase dev project connection
- Google auth
- Apple auth scaffold
- private access gate
- RLS test harness
- React Native Skia proof on web + physical iPhone
- RoomPlan native-module proof on supported physical iPhone
- canonical units/coordinate fixture tests
- CI: lint/typecheck/unit/security checks
- authoritative records copied into repo

**Exit:** auth, renderer, RoomPlan bridge, and RLS approach are proven, not merely assumed.

## Milestone 1 — Project / capture / baseline

- project list/create/delete
- space create
- photo upload/capture
- private assets
- object/boundary manual editor
- measurement entry + unit conversion
- capture review
- commit immutable baseline spatial version
- reopen/reconstruct baseline

**Exit:** one real room can be represented without AI.

## Milestone 2 — Arrange core

- Skia plan editor
- object select/move/rotate
- add/remove/basic resize
- numeric editor
- fixed objects
- collision/clearance
- undo/redo working state
- save spatial version
- named layout alternatives
- desktop + iPhone interaction tests

**Exit:** Arrange is useful by itself and dimensions do not drift.

## Milestone 3 — Organize AI

- room/object AI analysis
- semantic labels
- proactive Organize trigger
- structured proposal schema
- deterministic proposal validation
- ranked proposals
- accept/edit/reject
- before/after geometry view
- optional illustrative concept image
- AI run telemetry/evals

**Exit:** AI can improve one room without directly mutating canonical state.

## Milestone 4 — Build: shelving vertical slice

- Build brief parser
- target placement
- critical-measurement gate
- shelving archetype
- candidate parameters
- deterministic fit
- room preview
- blueprint retained model
- component/cut list
- BOM
- dated price snapshots
- cost low/expected/high
- effort estimate
- Planning Plan vs Dimension-Verified Plan gate
- PDF export

**Exit:** a user can describe, place, verify, price, plan, and export a real shelf.

## Milestone 5 — RoomPlan production integration

- productionized native adapter
- capability detection
- capture UI/coaching
- capture normalization
- review/correction
- raw/private artifact retention
- physical-device test matrix
- compare RoomPlan dimensions against manual reference fixtures

**Exit:** supported iPhones get a materially better capture path without changing downstream domain behavior.

## Milestone 6 — Geometry-faithful 3D/AR

- Three.js web preview
- RealityKit iOS preview
- Build placement visualization
- simplified object models
- shared canonical transforms
- performance profiling
- graceful fallback to plan view

**Exit:** Build/Arrange can be inspected spatially beyond top-down plan.

## Milestone 7 — Private beta hardening

- owner invitation/admin UI
- sharing roles
- project deletion purge
- backup/restore procedure
- error/observability dashboards
- AI spend controls
- accessibility audit
- reduced motion
- responsive web QA
- iOS lifecycle/interruption QA
- data retention documentation
- rollback runbook
- TestFlight/private distribution

**Exit:** ready for a few friends, with deployment evidence and rollback capability.

## Deferred after private beta

- doors/drawers/cabinet archetype
- advanced material library
- live retailer price integration
- multi-room structure
- photorealistic digital twin
- complex outdoor/structural workflows
- code-aware/jurisdiction-aware features
- retailer product catalog import

## Stop/go rule

Do not proceed to broader Build archetypes until the shelf slice proves:

- measurement provenance works
- geometry output is stable
- BOM arithmetic is traceable
- price assumptions are understandable
- blueprint export is readable
- users can revise without corrupting state
