# FormShift Implementation Foundation Pack v0.3

**Status:** Implementation-ready specification; no application code created  
**Date:** 2026-08-19  
**Project:** FormShift  
**Platforms:** Web + iOS  
**Deployment target:** Vercel + Supabase  
**Native enhancement:** Apple RoomPlan/LiDAR on supported iPhones  
**Primary modes:** Organize / Arrange / Build

## 1. Purpose

This pack closes the design-to-implementation gap for FormShift. It defines the contracts that implementation must follow before feature code is allowed to establish de facto architecture.

The package covers:

- canonical spatial/domain model
- database and row-level authorization model
- screen and state flows
- renderer and interaction architecture
- AI task contracts and evaluation gates
- RoomPlan/LiDAR capability contract
- first deterministic Build archetype
- materials, price, and effort estimation contracts
- threat model and privacy controls
- implementation sequencing and acceptance gates

## 2. Locked implementation decisions

1. **One shared domain, not one forced renderer.** Web and iOS use the same versioned spatial schema and deterministic engines. Rendering technology may be platform-specific where that produces a materially better result.
2. **Shared 2D/2.5D plan editor:** React Native Skia. It is lazy-loaded on web because its CanvasKit/WASM payload is substantial enough to keep off non-editor routes.
3. **Web 3D preview:** Three.js through a React integration layer.
4. **iOS AR/3D preview:** RealityKit behind a native adapter.
5. **iOS enhanced scan:** RoomPlan behind an Expo native module adapter. Device capability is checked at runtime; unsupported devices use photo/manual capture.
6. **Canonical coordinate system:** right-handed, +Y up, X-Z floor plane, millimeters.
7. **Persistence strategy:** hybrid relational + immutable versioned JSON spatial snapshots. Ownership, membership, assets, measurements, jobs, AI runs, builds, materials, estimates, exports, and audit data remain relational; each spatial version retains an immutable schema-versioned model snapshot.
8. **Authentication:** Supabase Auth with Google primary and Apple secondary, plus a separate private access gate. Provider authentication alone never grants project access.
9. **Authorization:** project membership enforced with PostgreSQL RLS and Storage policies. Authorization never relies on client-side filtering.
10. **AI:** A separate Vercel API/functions app owns server-side AI and privileged orchestration; Expo server rendering/API Routes are not a production dependency. Any state-changing AI result must validate against a versioned schema and deterministic rules before it becomes a user-visible feasible proposal.
11. **No AI geometry authority.** LLMs may infer or propose; collision, bounds, dimensions, clearances, BOM arithmetic, cost arithmetic, export eligibility, and verification status are deterministic.
12. **First Build archetype:** rectilinear open shelving/storage unit. This proves the full Build pipeline without prematurely taking on doors, drawers, complex joinery, or structural design.
13. **Price model:** editable, dated regional price snapshots. Live retailer inventory is not required.
14. **Effort model:** deterministic task decomposition plus explicit user/tool assumptions. AI may classify complexity but cannot invent the labor arithmetic.
15. **No production deployment claim** until build, security, device, and end-to-end validation evidence exists.

## 3. Repository shape to implement

Recommended monorepo:

```text
formshift/
├── apps/
│   ├── client/                    # Expo universal client: iOS + static web export
│   └── api/                       # Vercel Functions: AI + privileged operations
├── packages/
│   ├── domain/                    # spatial schemas, units, invariants
│   ├── geometry/                  # collision, transforms, clearance
│   ├── build-engine/              # parametric build archetypes + BOM
│   ├── ai-contracts/              # task schemas, prompt versions, validators
│   ├── pricing/                   # price snapshot + estimate math
│   ├── effort/                    # task/time estimator
│   ├── blueprint/                 # retained vector drawing model
│   ├── ui/                        # shared visual components/tokens
│   └── test-fixtures/             # scenes, measurements, expected outputs
├── modules/
│   └── formshift-roomplan/        # local Expo iOS module
├── supabase/
│   ├── migrations/
│   ├── seed/
│   └── tests/
├── docs/
│   └── authoritative records
└── tests/
    ├── domain/
    ├── geometry/
    ├── ai-evals/
    ├── rls/
    └── e2e/
```

This is a target organization, not implementation code.

## 4. Runtime topology

```text
                     ┌────────────────────┐
                     │ Invited FormShift  │
                     │ users              │
                     └─────────┬──────────┘
                               │
              ┌────────────────┴────────────────┐
              │                                 │
      Web / Vercel                         iOS native build
   Expo static client                         Expo/RN
              │                                 │
              └──────────────┬──────────────────┘
                             │
                       Supabase Auth
                       Google + Apple
                             │
                    private access gate
                             │
              ┌──────────────┴──────────────┐
              │                             │
        Supabase Postgres              Private Storage
        RLS + relational               uploads/scans/
        project state                  renders/exports
              │                             │
              └──────────────┬──────────────┘
                             │
                    Vercel API/functions app
                    AI + privileged orchestration
                             │
          ┌──────────────────┼───────────────────┐
          │                  │                   │
     AI provider       deterministic       background/job
     abstraction        domain engines       execution
          │                  │
   room/build intent   geometry/BOM/
   concept imagery     blueprint/pricing
```

## 5. Implementation quality gates

The first deployable vertical slice is not complete unless all of these pass:

### Product
- project can be created, captured, reviewed, edited, organized, arranged, and used to generate one shelf plan
- Organize, Arrange, and Build act on the same spatial version model
- user can revert/branch state without losing the captured baseline

### Measurement
- every displayed dimension has source and status
- estimated dimensions cannot be silently exported as verified
- unit conversion round-trips without geometry drift

### Geometry
- fixed objects cannot move through AI proposals
- infeasible proposals are not labeled feasible
- collision/clearance calculations are unit-tested with deterministic fixtures
- Build output fits within validated target envelope

### Security
- RLS tests prove cross-user and cross-project isolation
- private Storage policies prove inaccessible asset paths across projects
- service-role/server secrets never enter client bundles
- AI requests contain only the minimum assets/context needed
- invite gate is enforced server/database-side, not just in UI

### AI
- structured-output schema pass rate meets the evaluation threshold
- AI never promotes estimated measurements to verified
- AI proposal references must resolve to real entities
- geometry-invalid AI output is rejected or repaired before presentation
- prompts/images are treated as untrusted content, not executable instructions

### iOS
- RoomPlan-supported device path works end-to-end on physical hardware
- unsupported device falls back cleanly
- scan review/correction is mandatory before spatial baseline acceptance

### Operational
- error correlation IDs
- AI task/model/prompt version logging
- storage/database backup behavior understood and documented
- project deletion path validated
- rollback path documented before first shared release

## 6. Required companion documents

This package includes:

1. `DOMAIN-MODEL-v0.3.md`
2. `DATABASE-RLS-v0.3.md`
3. `SCREEN-STATE-FLOWS-v0.3.md`
4. `RENDERING-SPATIAL-INTERACTION-v0.3.md`
5. `AI-CONTRACTS-EVALUATION-v0.3.md`
6. `IOS-ROOMPLAN-CONTRACT-v0.3.md`
7. `BUILD-ENGINE-SHELVING-v0.3.md`
8. `THREAT-MODEL-v0.3.md`
9. `VERTICAL-SLICE-BACKLOG-v0.3.md`
10. `ACCEPTANCE-TEST-MATRIX-v0.3.md`

The authoritative project records are also updated in this package.
