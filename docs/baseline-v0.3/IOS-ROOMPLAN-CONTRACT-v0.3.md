# FormShift iOS RoomPlan / LiDAR Capability Contract v0.3

## 1. Product rule

RoomPlan is an enhancement, not a requirement.

At runtime, FormShift checks whether RoomPlan is supported on the device. Supported devices receive the enhanced scan option; unsupported devices go directly to photo/manual capture without an error-shaped experience.

Do not maintain a hand-authored list of compatible iPhone models as the primary capability check.

## 2. Native adapter boundary

Module: `FormShiftRoomPlan`

Responsibilities:

- report RoomPlan support
- request/verify camera permissions
- launch/stop capture session
- surface coaching/progress state
- return processed capture metadata
- export/store raw/processed capture artifacts where appropriate
- normalize RoomPlan surfaces/objects/transforms into FormShift intermediate data
- report errors/cancel state

It does **not** write project database records directly.

## 3. Capture output retained

Where practical retain privately:

- normalized FormShift capture payload
- raw/encoded captured-room data needed for reprocessing
- optional USDZ export for later 3D display/interoperability
- capture device/framework context
- timestamps

The canonical spatial model is created after normalization and user review.

## 4. Coordinate conversion

RoomPlan-native coordinates are converted into the canonical FormShift coordinate system:

- right-handed
- +Y up
- X-Z floor
- millimeters

Conversion tests must use fixtures with known wall/object dimensions and rotations.

## 5. Object/category mapping

RoomPlan object classifications are mapped to FormShift categories through a versioned adapter table.

Unknown/unmapped categories remain valid generic objects rather than being dropped.

FormShift may attach richer AI semantic labels after capture, but AI labeling does not overwrite the native capture provenance.

## 6. Required capture review

Before committing baseline:

- room boundary visible
- openings visible
- detected objects visible
- measurements list visible
- user can delete false detections
- user can add missing objects/openings
- user can correct dimensions
- user can mark fixed/movable

A user must explicitly accept the reviewed baseline.

## 7. Measurement treatment

RoomPlan dimensions are recorded with source `ios_roomplan`.

They may qualify as **Measured**, but not automatically `user_confirmed`.

For Build-critical dimensions, FormShift prompts the user to confirm or manually correct as needed before Dimension-Verified output.

## 8. Failure/fallback conditions

Fallback to standard capture for:

- unsupported device
- denied camera permission
- user cancellation
- capture framework failure
- incomplete scan
- environment unsuitable for reliable capture
- processed result rejected by user

Existing project work is not discarded.

## 9. Physical-device validation matrix

Before shared beta, test:

- at least one current supported LiDAR iPhone
- at least one supported older LiDAR iPhone if available
- at least one non-LiDAR iPhone
- representative small room
- cluttered room
- open-plan/partial-boundary room
- doors/windows
- reflective/dark surfaces
- interrupted/backgrounded scan

Capture tests evaluate:

- successful start/stop
- fallback
- geometry import
- dimensions
- rotation/origin normalization
- object mappings
- review corrections
- save/reopen round trip

## 10. Privacy

Room scan artifacts are household spatial data.

- private Storage only
- no automatic public/shareable USDZ
- no analytics attachment containing raw room geometry
- no AI provider receives raw RoomPlan artifact unless a specific task requires it
