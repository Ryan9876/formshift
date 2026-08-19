# FormShift Project Constitution

**Status:** Authoritative baseline  
**Revision:** 0.4.2  
**Established:** 2026-08-19  
**Last material decision:** 2026-08-19  
**Implementation/deployment status:** Tracked only in `CURRENT-STATE.md`; this constitution records durable rules.

## 1. Product mission

FormShift helps a small invited group understand and improve physical spaces through three connected modes: **Organize, Arrange, and Build**. It combines images, device-assisted measurement, user-verified dimensions, deterministic geometry, and AI reasoning to help users optimize a room, experiment with layouts, and design practical things for the space.

## 2. Fixed product principles

1. **One spatial source of truth.** The authoritative project state is a versioned structured spatial model. Photos, scans, AI conversations, generated images, and previews are evidence or derived artifacts—not the spatial database.
2. **Three first-class modes.** Every project supports Organize, Arrange, and Build. Switching modes does not create separate copies of the room or discard state.
3. **AI is core but bounded.** AI may interpret images, infer intent, classify objects, propose layouts/builds, explain choices, and create concept imagery. AI may not bypass authorization, measurement provenance, geometry validation, quantity arithmetic, or export gates.
4. **Measurements carry provenance.** Every dimension retains source, uncertainty/tolerance, confirmation state, and correction history.
5. **No false precision.** Ordinary images are not represented as universally exact measurements. Build-critical dimensions must be user verified before a plan is labeled dimension verified.
6. **Deterministic geometry validates spatial claims.** Collision, containment, placement, clearance, dimensions, quantity calculations, and blueprint geometry are validated outside the LLM.
7. **Users can edit and reverse AI work.** AI proposals create versions or drafts; the captured/original state remains recoverable.
8. **Graceful device capability.** LiDAR/RoomPlan substantially improves supported iPhone capture but is an optional capability, not a requirement to use the product.
9. **Web and iOS only.** Android support is outside the active product scope.
10. **Private distribution.** The product is for the owner and a small invited group, not a public marketplace product.
11. **Private household data.** Uploaded room imagery, captures, dimensions, inferred geometry, and generated spatial outputs are private by default and access-controlled.
12. **Explicit deletion.** Users must be able to delete projects and associated uploads with a clear deletion outcome.
13. **Imperial and metric.** Geometry uses a canonical internal unit and exposes explicit, consistent user-selectable unit conversion.
14. **Planning aid, not professional certification.** The product does not claim architectural, engineering, structural, electrical, plumbing, permitting, or building-code authority.
15. **Cost and effort are estimates.** Build cost and labor/effort estimates display assumptions, source/freshness where applicable, range/uncertainty, and excluded items.
16. **Generated visuals are illustrative unless geometry-rendered.** Photorealistic AI concept images cannot be used as proof of fit, clearance, measurement, or constructability.

## 3. Product mode contracts

### Organize

Entering Organize means: **optimize the current space using what FormShift can see and knows about the room.** The system should proactively identify clutter, access problems, poor grouping, obstructed circulation, inefficient storage, and other practical opportunities; propose concrete moves; explain why; and show before/after examples.

### Arrange

Arrange is an interactive spatial sandbox. Users can move, rotate, add, remove, resize, and position objects while preserving the most accurate known dimensions and visibly distinguishing estimated from verified geometry.

### Build

Build converts a natural-language idea into a structured design brief, spatially validates the proposed item against the room, visualizes it in context, generates dimensioned planning drawings, derives a material list, and estimates cost plus time/effort.

## 4. Accuracy states

- **Visual / Estimated** — useful for organization and conceptual arrangement; geometry may be inferred.
- **Measured** — supported by manual measurements, RoomPlan/LiDAR, or other scale evidence with tolerance/provenance.
- **Dimension Verified** — every build-critical dimension for a specific design has been explicitly confirmed.

Projects never silently promote between these states.

## 5. Build safety envelope

Furniture-like projects such as shelves, storage units, desks, benches, cabinets, organizers, and similar assemblies may reach Dimension Verified status when critical dimensions are confirmed.

FormShift may also accept broader projects such as decks and outdoor structures, but these require stronger safeguards. Geometry, visualization, materials, and preliminary planning may be generated; structural loads, foundations/footings, ledger/attachment, stairs/guards, soil/site conditions, and jurisdiction-specific requirements remain external verification items unless explicitly implemented later. Such plans may not imply structural or code approval.

## 6. Authentication and access

- Backend identity provider: Supabase Auth.
- Sign-in provider for the current private release: Google.
- Apple authentication is outside the current delivery scope and may be reconsidered later if distribution requirements change.
- Product access is additionally gated by invitation/allowlist; successful social authentication alone does not grant use.
- No shared household account credentials.
- Authorization is enforced at database and storage layers, not only in the UI.
- Normal FormShift runtime and owner-access operations use verified user JWTs plus RLS; a Supabase service-role/secret key is not required by the application runtime.
- The first owner may bootstrap only through the configured-owner RLS path; authentication alone never grants owner status to any other identity.
- Provider identities should resolve to a single product user where safely linkable.

## 7. Distribution

### Web

- Private responsive application targeted for deployment on Vercel.
- Usable on desktop and mobile Safari/Chrome for non-native workflows.

### iOS

- Native iOS build exists to support Apple-specific capture/AR features and better spatial interactions.
- Small-group distribution may use TestFlight or another valid private Apple distribution method.
- App Store public listing is not a product requirement.

### Android

Explicitly out of scope.

## 8. Data/privacy rules

- TLS in transit.
- Private object storage.
- Row-level access controls for relational data.
- No AI provider receives more project data than required for the specific task.
- Server-side AI keys only; never expose provider secrets in web/iOS clients.
- AI/model request logging must not unintentionally retain private room imagery or sensitive household content.
- Project deletion includes owned captures, generated visuals, plans, exports, and spatial data according to documented retention/deletion rules.

## 9. Design authority

FormShift intentionally inherits the established **Parallax light-glass/depth visual language**, adapted for a spatial design tool rather than a chat product. The FormShift design system is authoritative for exact tokens and interaction translation.

## 10. Change discipline

Changes to these durable rules require an explicit product decision and an update to this file. Implementation convenience alone does not override the constitution.

## 11. Revision record

### 0.2 — 2026-08-19

- Renamed working product from NestMetric to FormShift.
- Removed Android.
- Made Organize / Arrange / Build first-class modes.
- Made AI a planned core capability.
- Added optional iPhone LiDAR/RoomPlan capture.
- Selected Google authentication through Supabase plus private invitation gating; Apple authentication was later deferred from the active delivery scope.
- Adopted Parallax-derived visual language.
- Expanded Build to support conceptual deck/outdoor-structure planning with stronger safety boundaries.


## 12. Implementation foundation decisions

These durable implementation rules are now fixed unless explicitly revised:

1. Shared canonical domain across web and iOS; renderer sharing is secondary to correctness and platform quality.
2. React Native Skia is the shared 2D/2.5D precision editor.
3. Three.js is the web geometry-faithful 3D preview path.
4. RealityKit is the iOS geometry-faithful 3D/AR preview path.
5. RoomPlan is isolated behind a native adapter and runtime capability check.
6. Canonical coordinates are right-handed, +Y up, X-Z floor plane, millimeters.
7. Committed spatial versions are immutable and schema-versioned.
8. Persistence uses a hybrid relational model plus immutable spatial JSON snapshots.
9. State-changing AI output must pass schema and deterministic validation before presentation as feasible.
10. The first Build archetype is a rectilinear open shelving/storage unit.
11. Cost estimates use dated editable price snapshots; missing prices remain missing.
12. Friend-access beta is blocked on RLS/Storage isolation tests, physical-device RoomPlan validation, project deletion validation, and rollback readiness.

## 13. Revision record

### 0.3 — 2026-08-19

- Completed the Implementation Foundation Pack.
- Selected renderer architecture and canonical coordinate contract.
- Locked immutable spatial-version persistence strategy.
- Defined database/RLS, AI, RoomPlan, Build, security, and acceptance contracts.
- Selected rectilinear shelving as the first end-to-end Build archetype.
- Defined phased vertical-slice implementation and beta gates.


## 14. Milestone 0 implementation decisions (v0.4)

- Expo SDK 57 is the pinned initial client baseline.
- The web client remains a static Expo export deployed separately from the Vercel Functions API project.
- React Native Skia 2.11 is the initial precision-plan renderer spike.
- RoomPlan support is runtime-detected through the native module; unsupported devices use photo/manual capture without a degraded dead-end.
- No dedicated Supabase project may be created or reused without explicit project/cost authorization; unrelated projects must never be used for FormShift.
- AI model choice is environment-configured (`FORMSHIFT_AI_MODEL`) rather than hardcoded, allowing current-model selection without code changes.


## 15. Revision record

### 0.4 — 2026-08-19

- Began Milestone 0 implementation without weakening the private-access or measurement-integrity gates.
- Pinned the initial Expo/Skia implementation baseline while keeping AI model selection environment-configured.
- Confirmed dedicated infrastructure isolation: FormShift may not reuse unrelated Supabase/Vercel application resources.
- Preserved the rule that successful social authentication creates no automatic product authorization; new identities remain pending until explicitly approved.


## 16. Revision record

### 0.4.1 — 2026-08-19

- Authorized and created a dedicated isolated FormShift Supabase project after the platform reported a $0/month project cost.
- Locked the security rule that FormShift runtime authorization is user-JWT + RLS based and does not depend on a Supabase service-role/secret key.
- Locked first-owner activation to a configured-owner, RLS-governed bootstrap path; all other newly authenticated users remain pending until owner approval.
- Confirmed that successful backend deployment does not constitute web/iOS deployment or end-to-end release verification.


## 17. Revision record

### 0.4.2 — 2026-08-19

- Removed Apple authentication from the active private-release requirement; Google is the sole sign-in provider.
- Preserved optional iOS RoomPlan/LiDAR support independently from authentication-provider choice.
- Preserved the separate FormShift authorization gate: Google authentication never auto-approves product access.
