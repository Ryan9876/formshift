# FormShift Screen and State Flow Specification v0.3

## 1. Global information architecture

### Entry states

1. Launch
2. Authenticate
3. Access pending / denied / active
4. Project list
5. Create/open project
6. Project workspace

### Project workspace shell

Persistent project controls:

- project name
- active space
- measurement state
- active spatial/layout version
- **Organize | Arrange | Build**
- capture/source
- history/version access
- project settings/share

The mode switch changes the tools applied to the same active spatial state.

## 2. First-project flow

```text
Sign in
  ↓
Access gate
  ↓
Create project
  ↓
Name space + choose room/space type
  ↓
Capture method
  ├─ iOS + RoomPlan supported → Enhanced Scan
  └─ Otherwise → Photos + Manual
  ↓
Capture Review
  ↓
Object/Boundary Review
  ↓
Measurement Review
  ↓
Commit Baseline Spatial Version
  ↓
Organize workspace
```

The user can skip optional semantic corrections, but cannot skip acknowledging measurement uncertainty before Build output.

## 3. Capture review state

Panels:

- source photos/scan
- plan reconstruction
- detected surfaces/openings
- detected objects
- measurement list
- unresolved items

Actions:

- relabel
- add missing object/opening
- remove false detection
- mark fixed/movable
- correct dimensions
- add measurement
- accept baseline

The capture flow must never imply that detection confidence equals physical verification.

## 4. Organize state machine

```text
idle
  ↓
analysis_requested
  ↓
analyzing
  ├─ insufficient_context → request_specific_input
  ├─ failure → retryable_error
  └─ proposals_ready
          ↓
      reviewing_proposal
        ├─ reject → proposals_ready
        ├─ edit → arrange_edit_branch
        └─ accept
             ↓
      validate_candidate
        ├─ invalid → repaired_or_conflict
        └─ valid
             ↓
      commit_new_spatial_version
             ↓
          organized
```

### Organize UI

Top/primary:

- “What I see” concise room summary
- best recommended result
- before/after geometry preview
- optional illustrative concept image

Proposal detail:

- outcome
- exact moves
- why
- constraints preserved
- assumptions/confidence
- Accept / Edit / Reject

Avoid a generic chatbot as the dominant layout.

## 5. Arrange state machine

```text
viewing
  ↓
begin_edit
  ↓
working_copy
  ├─ move/rotate/add/remove/resize
  ├─ live validation
  ├─ undo/redo
  ├─ discard → viewing
  └─ save
       ↓
   validate_snapshot
       ├─ hard conflict → return_to_edit
       └─ valid/soft warnings
             ↓
       commit_spatial_version
             ↓
          viewing
```

### Arrange canvas behavior

On object selection show:

- handles
- current dimensions
- measurement state
- position from nearest wall
- nearby clearances
- fixed/movable state
- numeric inspector

Dragging:

- updates only transform
- alignment guides
- collision/clearance feedback
- optional snap
- dimensions remain unchanged

### Alternatives

“Save as layout” creates a named pointer to a spatial version. Users can branch an existing saved layout.

## 6. Build state machine

```text
describe
  ↓
normalize_brief
  ↓
review_structured_brief
  ├─ revise
  └─ continue
       ↓
resolve_target_location
       ↓
critical_measurement_gate
  ├─ missing → capture/enter/confirm
  └─ sufficient
       ↓
generate_candidate_design
       ↓
deterministic_validate
  ├─ no_fit → conflict + feasible alternatives
  └─ fit
       ↓
preview_in_space
  ├─ revise dimensions/features
  └─ approve design
       ↓
generate_plan_set + BOM
       ↓
cost + effort estimates
       ↓
planning_plan
  ├─ unverified critical dims → stays Planning Plan
  └─ all critical dims confirmed
       ↓
Dimension-Verified Plan
       ↓
export
```

### Build stage UI

Within Build mode:

1. Describe
2. Fit
3. Design
4. Preview
5. Plan

At all stages show:

- target placement
- build risk class
- measurement status
- assumptions requiring confirmation

## 7. AI concept visualization state

Concept images never block geometry workflows.

Statuses:

- not requested
- queued
- generating
- ready
- failed

A failure to generate a concept image must not invalidate a geometry-valid Organize or Build result.

Every concept view displays:

**Illustrative concept — plan dimensions are authoritative.**

## 8. Error handling

Classes:

- authentication/access
- upload/capture
- measurement
- geometry conflict
- AI unavailable/timeout/schema invalid
- rendering
- export
- storage
- native capability

The UI should explain the actionable next step, not expose raw provider errors.

## 9. Offline/interruption behavior

MVP does not promise full offline use.

Required resilience:

- local working edits survive transient navigation/app backgrounding where practical
- unsaved Arrange state clearly identified
- uploads/jobs are resumable or retryable
- server requests use idempotency keys for state-creating operations
- interrupted AI generation does not partially mutate canonical state
