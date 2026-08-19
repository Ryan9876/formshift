# FormShift Canonical Domain Model v0.3

**Status:** Implementation contract  
**Canonical unit:** millimeter  
**Coordinate system:** right-handed; +Y vertical; X-Z floor plane

## 1. Design goal

The domain must represent a physical space independently of any camera frame, AI model, renderer, or Apple framework. Every client and service must be able to consume the same model.

## 2. Spatial version

A `SpatialVersion` is immutable after commit.

Minimum fields:

| Field | Purpose |
|---|---|
| `id` | unique version |
| `space_id` | owning space |
| `parent_version_id` | lineage |
| `schema_version` | spatial JSON schema version |
| `source_mode` | capture / organize / arrange / build-placement / correction |
| `created_by` | user/service actor |
| `created_at` | audit timestamp |
| `model_hash` | canonical snapshot integrity/dedup |
| `model_json` | complete immutable spatial snapshot |
| `status` | draft / committed / superseded |

Edits occur in transient client/server working state. Saving creates a new version; it never mutates a committed snapshot.

## 3. Canonical spatial snapshot

Conceptual shape:

```json
{
  "schemaVersion": "spatial-1",
  "coordinateSystem": {
    "handedness": "right",
    "upAxis": "y",
    "floorPlane": "xz",
    "unit": "mm"
  },
  "space": {},
  "surfaces": [],
  "openings": [],
  "objects": [],
  "constraints": [],
  "measurementRefs": []
}
```

### Space

- stable `spaceId`
- semantic type: room / garage / closet / patio / deck-area / other
- optional label
- floor elevation
- boundary polygon when known
- ceiling height when known
- measurement state summary
- capture completeness flags

### Surface

Represents floor, wall, ceiling, worktop, platform, or other major plane.

- stable `id`
- `kind`
- polygon vertices
- plane transform
- thickness if known
- fixed = true
- material descriptor when known
- provenance/capture reference

### Opening

Represents door, window, pass-through, stair opening, or other interruption.

- stable `id`
- `surfaceId`
- kind
- width/height/depth when known
- local transform
- swing/clearance geometry when applicable
- fixed = true

### Object

- stable `id`
- label
- category
- optional semantic tags
- transform
- physical dimensions/bounds
- geometry representation
- movable/fixed state
- source/provenance
- confidence summary
- image/model asset refs
- user notes

### Transform

Canonical transform contains:

- translation `x/y/z` in mm
- rotation quaternion
- optional scale only for derived visual assets

**Rule:** physical dimensions are not represented by arbitrary renderer scale. A drag changes translation; a rotate action changes rotation; physical resize is a distinct explicit operation.

### Geometry

Initial geometry kinds:

- oriented box
- extruded polygon
- plane/polygon
- simplified mesh reference

Use simplified geometry for deterministic fit/collision. High-detail rendering assets may be attached separately.

## 4. Measurement observation

Measurements are immutable evidence records, not anonymous numbers.

Required fields:

- `id`
- `project_id`
- `space_id`
- optional `entity_id`
- `dimension_key`
- `value_mm`
- `source`
- `tolerance_mm` or explicit unknown
- optional confidence score
- `verification_state`
- capture/device context
- `created_by`
- `captured_at`
- optional `supersedes_measurement_id`
- notes

Initial `source` vocabulary:

- `manual_verified`
- `manual_unverified`
- `ios_roomplan`
- `scale_reference_derived`
- `photo_estimate`
- `imported`
- `build_derived`

Verification states:

- `estimated`
- `measured`
- `user_confirmed`
- `invalidated`

A spatial version references the exact measurement observations on which it depends.

## 5. Measurement criticality

Build plans contain a set of `criticalMeasurementRefs`.

A Dimension-Verified Plan is eligible only when:

- every critical ref resolves
- each critical measurement is `user_confirmed`
- no critical measurement has been superseded after the build version was generated
- all fit/clearance validations have been rerun against the current measurement set

## 6. Constraints

Constraint kinds:

- fixed object
- keep-out region
- minimum clearance
- opening/swing path
- wall attachment assumption
- floor support assumption
- user preference
- object relationship
- build envelope
- risk/external-verification requirement

Every constraint has:

- id
- kind
- severity: hard / soft / informational
- affected entity refs
- geometry/value
- origin: user / system / AI-proposed
- explanation

AI cannot downgrade a hard constraint.

## 7. Layout proposal/action

AI/layout services produce actions over stable entity IDs.

Action kinds:

- move
- rotate
- add
- remove
- resize-request
- relabel
- group
- create-zone

Every action has:

- target entity
- before state ref
- proposed after state
- reason
- confidence/assumptions

The geometry engine validates the proposed after-state before the proposal is marked feasible.

## 8. Build domain

### BuildRequest

- natural-language brief
- normalized build type
- target space/surface/location
- desired/min/max envelope
- functional requirements
- style/material preferences
- loading/use assumptions
- installation assumptions
- known/unknown critical measurements
- build risk class

### BuildPlan

- plan version
- source spatial version
- source build request version
- build archetype/version
- parametric values
- component graph
- placement transform
- validation result
- critical measurement refs
- blueprint set
- BOM
- cost estimate ref
- effort estimate ref
- verification status

### Component

- id
- role
- material/spec
- finished dimensions
- quantity
- transform in assembly
- manufacturing notes
- dependency/joint refs

## 9. Unit contract

Internal geometry is always millimeters.

Display supports:

- imperial
- metric

Rules:

- conversion occurs at display/input boundaries
- store parsed canonical mm values, not formatted strings
- retain the user's entered string/value where useful for audit
- never repeatedly convert stored values back and forth
- dimension rounding is presentation-only
- blueprint calculations use canonical values

## 10. Spatial integrity invariants

1. IDs are stable across versions unless an entity is intentionally replaced.
2. Committed spatial snapshots are immutable.
3. Renderer coordinates never become canonical without adapter normalization.
4. AI cannot create verified measurement evidence.
5. Physical object dimensions cannot change through a move/rotate gesture.
6. Build and Organize outputs bind to the exact source spatial version.
7. Fixed entities cannot be moved by Organize.
8. All accepted changes create a new version or explicit branch.
9. Export metadata records exact source versions and measurement state.
10. Any adapter conversion must have round-trip fixture tests.
