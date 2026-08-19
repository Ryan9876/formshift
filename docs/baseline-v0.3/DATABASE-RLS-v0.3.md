# FormShift Database and RLS Specification v0.3

**Target:** Supabase PostgreSQL + private Storage  
**Status:** Logical schema and policy contract; not an executable migration

## 1. Access model

There are two separate gates:

1. **Identity:** Supabase Auth using Google or Apple.
2. **Product authorization:** FormShift access state and project membership.

A valid social login does not imply product access.

### Access states

`pending`, `active`, `suspended`, `revoked`

The owner can approve a newly authenticated identity when an invite cannot be reliably matched in advance (for example, Apple private relay identities).

Authorization decisions must not rely on user-editable metadata.

## 2. Core tables

### `profiles`

Public-facing user profile only.

- `user_id` PK/FK auth user
- `display_name`
- `avatar_url`
- `created_at`
- `updated_at`

No authorization roles are stored here.

### `account_access`

Protected authorization record.

- `user_id` PK
- `status`
- `is_owner`
- `approved_by`
- `approved_at`
- `suspended_at`
- `notes`
- timestamps

Users may read their own access status. Only the owner/admin server path may change it.

### `invites`

- `id`
- optional normalized email
- `status`
- `created_by`
- `expires_at`
- `claimed_by`
- `claimed_at`

Invites are administrative; users cannot enumerate them.

### `projects`

- `id`
- `owner_user_id`
- `name`
- `default_unit_system`
- `status`
- timestamps
- `deleted_at`

### `project_members`

- `project_id`
- `user_id`
- `role`: owner / editor / viewer
- `created_by`
- timestamps

Unique `(project_id, user_id)`.

### `spaces`

- `id`
- `project_id`
- `name`
- `space_type`
- `active_spatial_version_id`
- timestamps

### `assets`

Central file metadata.

- `id`
- `project_id`
- optional `space_id`
- `kind`: original_photo / normalized_photo / roomplan_raw / roomplan_usdz / object_photo / concept_image / blueprint_pdf / thumbnail / other
- `storage_bucket`
- `storage_path`
- `mime_type`
- `byte_size`
- `sha256`
- `privacy_class`
- `created_by`
- timestamps
- `deleted_at`

### `captures`

- `id`
- `space_id`
- `capture_type`: photo / roomplan / imported
- `status`
- source asset refs
- device context
- calibration/capability context
- capture notes
- timestamps

### `measurement_observations`

- fields defined in Domain Model
- immutable except administrative invalidation metadata

### `spatial_versions`

- fields defined in Domain Model
- immutable `model_json`
- `schema_version`
- `model_hash`
- lineage/status

### `spatial_version_measurements`

Join table binding a version to its measurement evidence.

### `organize_runs`

- `id`
- `project_id`
- `space_id`
- source spatial version
- AI run ref
- status
- timestamps

### `organize_proposals`

- `id`
- run
- rank
- proposal schema/version
- proposed model delta
- validated resulting spatial version draft ref
- validation status
- user disposition: unreviewed / accepted / edited / rejected
- rationale
- timestamps

### `saved_layouts`

Named Arrange branches.

- `id`
- `space_id`
- `name`
- `spatial_version_id`
- `created_by`
- timestamps

### `build_requests`

- normalized brief
- source spatial version
- target refs
- risk class
- status
- timestamps

### `build_plans`

- request
- plan/archetype version
- geometry payload
- placement payload
- verification status
- validation result
- source spatial version
- timestamps

### `build_components`

Relational component/cut rows for editing/export.

### `material_items`

BOM rows.

### `price_snapshots`

- material/product key
- description/spec
- region
- source label
- source date
- unit price
- package quantity/unit
- confidence/status
- entered/updated by

### `cost_estimates`

- plan
- low/expected/high
- currency
- source snapshot date
- waste assumption
- tax/delivery/exclusions
- generated_at

### `effort_estimates`

- plan
- assumed skill level
- tool profile
- difficulty
- active low/high hours
- elapsed low/high
- task breakdown
- assumptions

### `ai_runs`

No raw room image duplication.

- `id`
- user/project/space
- task name
- task schema version
- prompt version
- provider/model identifier
- input asset refs/hash
- output hash
- status
- latency
- token/cost telemetry when available
- error class
- timestamps

### `jobs`

For export/AI/image tasks that may not complete inside an interactive request.

- id
- project
- kind
- status
- idempotency key
- attempt count
- timestamps
- error summary

### `exports`

- project/space/build
- source version refs
- export kind
- asset ref
- measurement status
- generated_at

### `audit_events`

Security/product audit trail:

- actor
- project
- action
- entity type/id
- correlation id
- timestamp
- safe metadata

## 3. RLS policy model

### Access helper principle

Every project-scoped policy conceptually requires:

- authenticated user
- `account_access.status = active`
- membership in `project_members`
- role sufficient for operation

Do not treat `TO authenticated` by itself as authorization.

### Policy matrix

| Resource | Owner | Editor | Viewer | Non-member |
|---|---|---|---|---|
| Project read | yes | yes | yes | no |
| Project edit | yes | yes | no | no |
| Membership admin | yes | no | no | no |
| Space read | yes | yes | yes | no |
| Space/spatial edit | yes | yes | no | no |
| Upload asset | yes | yes | no | no |
| Read private asset | yes | yes | yes | no |
| Organize/Build request | yes | yes | no | no |
| Delete project | yes | no | no | no |
| View audit history | yes | optional | no | no |

### Ownership rule

Project owner membership is explicit and must match `projects.owner_user_id`.

A user cannot self-promote a project role or change ownership through normal client writes.

## 4. Storage model

Buckets are private.

Recommended logical paths:

```text
projects/{project_id}/spaces/{space_id}/captures/{asset_id}/...
projects/{project_id}/objects/{asset_id}/...
projects/{project_id}/derived/{asset_id}/...
projects/{project_id}/exports/{asset_id}/...
```

Storage policies verify project membership from the parsed project ID and database membership. Security cannot depend on an unguessable path alone.

### Upload controls

- accepted image/document types allowlisted
- MIME/content sniffing
- size limits
- randomized asset IDs
- image normalization for AI derivatives
- strip GPS/EXIF from normalized AI-bound derivative
- preserve original privately only when required
- signed URL expiration kept short
- no public buckets for room images

Storage replacement/upsert must have the full required policy set; implementation tests must include replace behavior.

## 5. Server privilege boundary

Client applications receive only publishable/public-safe Supabase credentials.

Privileged credentials:

- Vercel server environment only
- never serialized to the client
- used only for explicit administrative/server workflows
- no generic “run as service role” data access path

Privileged database functions, if needed, live outside exposed schemas and use minimal grants.

## 6. Invite/activation flow

1. Owner creates invite or chooses manual approval.
2. User authenticates with Google/Apple.
3. Server resolves whether identity matches a live invite.
4. If yes, create/activate `account_access`.
5. If not, account remains `pending`.
6. Pending user sees only the access-pending screen.
7. Owner can approve the specific authenticated identity.
8. Active user can then be added to projects.

This handles Apple relay email without weakening the access gate.

## 7. Deletion contract

Project deletion is two-phase:

### User-visible delete
- immediate project tombstone
- removes project from normal queries
- revokes signed asset access
- queues dependent asset/data purge

### Purge
- delete derived and original Storage objects
- delete relational project records in dependency-safe order
- preserve only minimum audit evidence required for integrity, without room content
- record completion/failure status

Retention of platform backups must be documented separately; the UI must distinguish immediate application deletion from eventual backup expiry.

## 8. Required RLS tests

At minimum:

- User A cannot read User B project.
- User A cannot infer project existence through ID lookup.
- Viewer cannot edit.
- Editor cannot change membership/owner.
- Suspended user loses project access.
- Pending authenticated user has no project data.
- Cross-project Storage path fails.
- Signed URL cannot be generated for non-member.
- User cannot reassign `owner_user_id`.
- Update cannot move a row into another project.
- Deleted/tombstoned project is hidden.
- Service-only admin route rejects unauthorized caller.
