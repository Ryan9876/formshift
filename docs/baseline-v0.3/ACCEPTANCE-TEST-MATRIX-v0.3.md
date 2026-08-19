# FormShift Acceptance Test Matrix v0.3

## A. Authentication / authorization

| ID | Test | Expected |
|---|---|---|
| AUTH-01 | Invited Google user signs in | Active user reaches project list |
| AUTH-02 | Valid Google user not approved | Pending screen; no project data |
| AUTH-03 | Apple user with relay email | Can remain pending then owner-approve identity |
| AUTH-04 | User A requests User B project | Denied at database/server layer |
| AUTH-05 | Viewer attempts Arrange save | Denied |
| AUTH-06 | Suspended user with existing session | Project access denied on subsequent authorized request |

## B. Capture / measurement

| ID | Test | Expected |
|---|---|---|
| CAP-01 | Web photo upload | Private asset and capture review |
| CAP-02 | Unsupported iPhone | No LiDAR dead-end; standard capture |
| CAP-03 | RoomPlan-supported iPhone | Enhanced scan offered |
| CAP-04 | RoomPlan scan accepted | Normalized baseline created after review |
| MEAS-01 | Enter 72 in | Canonical 1828.8 mm |
| MEAS-02 | Display same value metric then imperial | No canonical drift |
| MEAS-03 | Photo estimate | Status remains Estimated |
| MEAS-04 | RoomPlan measurement | Status Measured, not automatically confirmed |
| MEAS-05 | Confirm build-critical measurement | Eligible ref becomes user-confirmed |
| MEAS-06 | Correct confirmed measurement after Build plan | Prior plan becomes stale/revalidation required |

## C. Arrange

| ID | Test | Expected |
|---|---|---|
| ARR-01 | Drag sofa | Position changes; dimensions unchanged |
| ARR-02 | Rotate table | Rotation changes only |
| ARR-03 | Move fixed built-in | Blocked |
| ARR-04 | Move object through wall/door keep-out | Conflict shown |
| ARR-05 | Save two alternatives | Both versions reopen correctly |
| ARR-06 | Numeric edit | Canvas matches canonical value |

## D. Organize

| ID | Test | Expected |
|---|---|---|
| ORG-01 | Enter Organize | Analysis begins without user typing “optimize” |
| ORG-02 | Proposal moves fixed object | Proposal rejected/repaired |
| ORG-03 | Proposal references missing entity | Schema/domain validation fails |
| ORG-04 | Valid proposal accepted | New spatial version; old baseline preserved |
| ORG-05 | Concept image differs geometrically | Labeled illustrative; canonical plan unchanged |

## E. Build shelf

| ID | Test | Expected |
|---|---|---|
| BLD-01 | “72-inch-wide shelf” with sufficient space | Valid candidate generated |
| BLD-02 | 72-inch shelf in 68-inch envelope | Conflict + feasible alternatives |
| BLD-03 | Missing target width | Measurement gate before verified plan |
| BLD-04 | Door swing conflict | Candidate invalid/revised |
| BLD-05 | BOM | Component-derived quantities traceable |
| BLD-06 | Missing material price | Missing/unpriced shown; no invented current price |
| BLD-07 | Cost estimate | Low/expected/high with snapshot date |
| BLD-08 | Effort | Range + skill/tool assumptions |
| BLD-09 | Unconfirmed critical dimension | Planning Plan only |
| BLD-10 | All critical dimensions confirmed and current | Dimension-Verified Plan eligible |
| BLD-11 | Blueprint PDF | Dimensions/verification labels preserved |

## F. Security / privacy

| ID | Test | Expected |
|---|---|---|
| SEC-01 | Cross-project Storage path | Denied |
| SEC-02 | Client bundle scan | No service/provider secret |
| SEC-03 | AI derivative image | GPS/EXIF stripped |
| SEC-04 | Prompt injection text visible in room image | Cannot change tool/policy authority |
| SEC-05 | Delete project | Hidden immediately, purge queued |
| SEC-06 | Signed URL after access revoked | New signing denied; short TTL limits residual access |

## G. Reliability

| ID | Test | Expected |
|---|---|---|
| REL-01 | Retry same create request | Idempotent; no duplicate state |
| REL-02 | AI timeout | No canonical partial write |
| REL-03 | Stale source spatial version | Reject or branch explicitly |
| REL-04 | App background during Arrange | Unsaved state handled predictably |
| REL-05 | Concept-image failure | Geometry result still usable |

## H. Accessibility / design

| ID | Test | Expected |
|---|---|---|
| UX-01 | Reduced motion enabled | Decorative parallax disabled |
| UX-02 | Status without color | Estimated/Measured/Confirmed text/icon visible |
| UX-03 | Keyboard web editing | Core controls reachable |
| UX-04 | Dynamic type iOS | Critical controls remain usable |
| UX-05 | Mode toggle | Organize/Arrange/Build visible and state-preserving |
