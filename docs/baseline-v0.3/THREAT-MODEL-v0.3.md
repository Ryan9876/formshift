# FormShift Threat Model and Privacy Design v0.3

## 1. Protected assets

High-value/sensitive data:

- room/home photos
- spatial geometry and dimensions
- openings/layout details
- object/inventory inference
- generated plans and builds
- user identity
- project membership
- private exports
- AI prompts/results tied to household content
- API/provider credentials

## 2. Primary threat actors

- unauthenticated internet attacker
- authenticated non-member
- invited user attempting cross-project access
- compromised browser/device session
- malicious file/content upload
- prompt injection embedded in image/text
- leaked server secret
- over-privileged internal/server code
- accidental telemetry/log disclosure

## 3. Main threat scenarios and controls

### Cross-project IDOR/BOLA

**Risk:** authenticated user requests another project ID.

Controls:

- PostgreSQL RLS on every exposed project-scoped table
- Storage membership policies
- ownership predicates, not merely authenticated role
- server routes re-check membership
- automated two-user isolation tests

### Public/private asset leakage

Controls:

- private buckets only
- short-lived signed URLs
- no predictable public object URLs
- project membership verified before signing
- deletion revokes access and queues purge

### Client secret disclosure

Controls:

- provider/service-role keys server-only
- bundle scanning in CI
- environment separation
- rotate immediately on exposure

### Social-login account confusion

Controls:

- provider-neutral internal user ID
- explicit invite/access state
- do not auto-link identities solely from weak assumptions
- owner-assisted resolution for ambiguous Apple relay identities

### Malicious uploads

Controls:

- allowlisted formats
- MIME/content validation
- size/resolution limits
- image normalization
- no execution of uploaded content
- isolate future document parsing

### EXIF/location leakage

Controls:

- normalized AI-bound derivative strips GPS/EXIF
- original retained privately only if product requires it
- do not send original metadata to AI by default

### Prompt injection

Controls:

- treat visible text and user content as untrusted data
- system policy cannot be overridden by image text
- narrow AI tools
- no arbitrary web fetch/tool execution based on room content
- structured outputs + deterministic validation

### AI data over-sharing

Controls:

- task-specific minimum-context assembler
- send cropped/derived images where sufficient
- provider allowlist
- review provider retention/training settings before production
- log references/hashes, not duplicate room imagery

### Geometry manipulation / stale version

Controls:

- optimistic concurrency using source spatial version
- state-changing request must name source version
- reject/branch stale writes
- immutable committed snapshots

### False verification

Controls:

- verification status is deterministic domain state
- AI cannot set `user_confirmed`
- build export gate checks measurement refs and staleness
- UI status not based solely on color

### Destructive deletion

Controls:

- explicit confirmation
- project owner only
- tombstone before purge
- audit record
- documented backup-retention caveat

## 4. Privacy minimization

Collect only what the feature requires.

Default rules:

- no location permission required for room organization
- no GPS metadata used unless a future feature explicitly needs it
- no contact-list access
- no microphone requirement
- no background camera capture
- AI context scoped to selected project/task

## 5. Logging

Allowed:

- request/correlation ID
- internal project/user IDs
- task type
- source version ID
- model/prompt versions
- performance/error class
- asset IDs/hashes

Avoid:

- room photo bytes
- full raw room descriptions
- OAuth tokens
- signed URLs
- provider secrets
- full blueprint contents

## 6. Abuse/cost controls

Although the app is private:

- per-user AI rate limits
- image generation limits
- maximum upload sizes
- job dedup/idempotency
- provider spend alerts/budgets
- owner ability to suspend account

## 7. Security release gate

Before first friend access:

- RLS policy tests
- Storage policy tests
- auth/invite tests
- client bundle secret scan
- dependency audit
- upload validation tests
- prompt-injection fixture tests
- deletion test
- session/logout test
- server authorization tests
- least-privilege review of privileged functions/routes
