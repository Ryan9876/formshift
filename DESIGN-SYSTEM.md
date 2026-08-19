# FormShift Design System

**Status:** Authoritative visual and interaction baseline  
**Revision:** 0.4.2  
**Established:** 2026-08-19  
**Visual lineage:** Deliberate adaptation of the established Parallax light-glass/depth language

## 1. Brand

### Name

**FormShift**

Meaning: a space is not treated as fixed; its *form* can be understood, reorganized, rearranged, and extended with something new. “Shift” maps naturally to the application’s spatial manipulation while avoiding a name limited to indoor rooms.

### Brand line

**Shape the space around you.**

Mode microcopy:

- **Organize — Make what you have work better.**
- **Arrange — Try the space another way.**
- **Build — Make what the space needs.**

The tagline should not be repeated excessively in-product.

## 2. Logo direction

The FormShift mark is an abstract **F / spatial frame** made from two offset rounded room contours:

- rear contour curves inward/recesses
- front contour bows outward
- a small blue datum point anchors the intersection
- negative space suggests both an `F` and an offset floor-plan corner

This intentionally echoes the depth/perception idea behind Parallax without copying the Parallax orbit logo.

### Logo motion

On supported motion settings:

- rear contour shifts 1–2 px opposite pointer/device motion
- front contour shifts 1–2 px with motion
- datum point remains optically stable
- 500–900 ms slow settle; no bouncing/spinning

`prefers-reduced-motion` / iOS Reduce Motion disables the layer shift.

## 3. Visual character

FormShift should feel:

- spatial
- precise
- calm
- modern
- tactile without skeuomorphism
- technical enough for measurements, approachable enough for home use

It deliberately inherits Parallax’s **clear-glass / clear-ice depth illusion**, conflicting surface curves, warm-neutral field, restrained blue, and subtle motion.

Avoid:

- CAD-black interfaces as the default
- bright home-decor palettes
- purple/pink casts
- heavy gradients
- thick dashboard cards
- exaggerated glass blur that hurts legibility
- decorative blueprint textures

## 4. Parallax-derived depth model

### Recessed navigation surface

On large screens, the project/navigation rail visually **dips inward**:

- lightest through the middle
- slightly darker toward top and bottom
- subtle concave side boundary where it meets the workspace
- lower elevation than the main canvas

### Lifted workspace surface

The active spatial workspace visually **bows outward** against the nav:

- slightly darker/grayer through the central field
- subtly lighter toward upper/lower edges
- convex opposing boundary
- clear-ice highlight/shear responds very slightly to pointer/device movement

The opposing curves create depth without heavy shadows.

### Mobile translation

There is no permanent sidebar on iPhone. Translate the same depth relationship into:

- recessed top project/mode shelf
- lifted canvas below
- bottom action sheet floating above the canvas only when needed

## 5. Color system

The palette adapts the latest light Parallax profile.

| Token | Value | Use |
|---|---:|---|
| `canvas-high` | `#F4F2EA` | warm neutral outer field |
| `canvas-mid` | `#E8E8E1` | grayer lifted workspace center |
| `canvas-warm` | `#EEE9DC` | subtle beige/brown undertone |
| `canvas-green` | `#E7E9DD` | extremely restrained yellow-green undertone |
| `glass` | `rgba(255,255,255,.56)` | translucent controls/sheets |
| `glass-strong` | `rgba(255,255,255,.76)` | high-legibility surfaces |
| `ink` | `#253034` | primary text |
| `ink-soft` | `#526066` | secondary text |
| `metadata-peach` | `#C98E78` | restrained secondary metadata / AI notes |
| `blue` | `#0D7496` | primary action, selected state, key spatial accent |
| `blue-soft` | `#DCECF1` | selection/measurement backgrounds |
| `blue-deep` | `#0A5B76` | active/pressed emphasis |
| `line` | `rgba(42,61,66,.14)` | glass borders/dividers |
| `verified` | `#387461` | confirmed/verified state |
| `estimated` | `#9A6B32` | estimated/attention state |
| `danger` | `#A84C4C` | destructive/error state |

Exact contrast must be automated during implementation. Status is never color-only.

## 6. Typography

Use **Geist Sans** for application UI if the implementation stack makes it straightforward; use system-native San Francisco on iOS where that produces better native fidelity. Use **Geist Mono / SF Mono** selectively for dimensions, coordinates, and blueprint metadata.

Principles:

- large, calm headings
- compact technical labels
- tabular numerals for dimensions/costs
- avoid oversized marketing typography inside workspaces

Recommended scale:

| Role | Size | Weight |
|---|---:|---:|
| Display | 32 | 650–700 |
| Page/project | 24–28 | 650–700 |
| Section | 18–20 | 600–650 |
| Card/proposal | 15–16 | 600 |
| Body | 15–16 | 400–500 |
| Secondary | 13–14 | 400–500 |
| Technical label | 11–12 | 550–650 |
| Dimension | 13–15 | 600 mono/tabular |

Dynamic Type/accessibility scaling takes precedence.

## 7. Primary mode switch

**Organize / Arrange / Build** is a first-class persistent segmented control within every project.

Rules:

- always visible while in a project except during full-screen capture
- switching mode preserves camera/viewport when practical
- selected mode uses restrained blue accent and slight lifted-glass treatment
- inactive modes remain readable, not disabled-looking
- each mode may show a small unresolved-task indicator but never a noisy badge count

The mode switch is not equivalent to bottom-level app navigation; it changes the toolset acting on the same spatial state.

## 8. Project shell

### Web

- recessed left rail: brand, projects, capture/source, settings
- top project bar: project title, measurement state, mode switch
- lifted central spatial canvas
- contextual right inspector when width permits
- bottom/inline AI proposal tray only when relevant

### iPhone

- compact top brand/project header
- persistent 3-mode glass segmented control
- nearly full-height spatial/image canvas
- contextual bottom sheets for object/proposal/build details
- camera/scan flow can go full screen

## 9. Organize experience

Entering Organize should feel proactive, not like an empty chat box.

Initial state after analysis:

- concise “What I see” summary
- 2–4 prioritized opportunities
- one recommended end-state highlighted first
- visual before/after comparison
- specific proposed moves
- explanation tied to access/grouping/clutter/storage/clearance

Proposal card structure:

1. **Result** — what improves
2. **Moves** — what changes and where
3. **Why** — concise rationale
4. **Confidence/assumptions**
5. **Preview** — geometry-faithful + optional concept image
6. Accept / Edit / Reject

AI-generated end-state images use an **Illustrative concept** badge.

## 10. Arrange experience

Arrange is canvas-first.

Selected object:

- clear blue outline/handles
- live wall/object distances
- rotate affordance
- dimensions visible without covering the object
- fixed/estimated status in inspector

Drag behavior:

- subtle magnetic alignment guides
- collision/clearance warning before drop
- no arbitrary object scaling just because perspective changes
- numeric edit always available

Adding objects:

- `+ Object`
- choose basic type or describe it
- enter/confirm dimensions
- place ghost preview in scene
- drop, rotate, adjust

The user can branch/save layout alternatives rather than overwriting the current arrangement.

## 11. Build experience

Build begins with a conversational brief field but immediately resolves to structured, visible constraints.

Primary workspace stages:

1. **Describe**
2. **Fit**
3. **Design**
4. **Preview**
5. **Plan**

The mode itself remains `Build`; these are progress states.

Design result panel shows:

- generated object in the space
- overall dimensions
- critical clearances
- assumptions/conflicts
- difficulty
- cost range
- effort range
- `View Blueprint`
- `Materials`
- `Revise design`

Deck/site-dependent concepts get a clearly visible structural/site-verification banner without turning the entire UI into legal text.

## 12. Measurement states

### Estimated

- dashed dimension treatment
- `Estimated` text + source

### Measured

- solid neutral/blue line
- `Measured` + source/tolerance

### Confirmed

- solid line + confirmation marker
- `Confirmed`

### Conflict

- warning icon + text
- show competing sources/values

Never communicate these states by color alone.

## 13. AI presentation

AI should feel embedded in the product, not bolted on as a chatbot.

Use AI for:

- proposal strips
- rationale
- inferred object/zone labels
- “Describe what you want” input
- revision suggestions
- concept imagery

The FormShift logo mark may appear next to generated recommendations. Its subtle offset-layer animation can run while AI is actively composing, then settle when complete.

## 14. Glass/parallax motion

Use motion to reinforce material/depth, not spectacle:

- 2–4 px maximum inertial offset for major glass layers
- faint opposing sheen movement
- sharp text remains optically stable
- no background motion that makes measuring difficult
- disable parallax while precision drag/measurement is active
- reduced-motion preference disables the effect

## 15. Blueprint visual language

Blueprints intentionally become flatter and more technical than the application shell.

- light neutral paper field
- dark geometry
- blue dimensions
- dashed estimated/unverified lines
- explicit units
- title block: project, version, mode, measurement state, date, planning-status note
- no professional seals/stamps visual language

## 16. Cost/material/effort UI

Use a compact practical estimate card:

**Expected:** $X  
**Likely range:** $Y–$Z  
**Materials priced as of:** date/source  
**Effort:** N–M active hours  
**Difficulty:** Moderate

Expandable assumptions include waste, excluded tools, finishing, tax/delivery, labor not priced unless explicitly requested, and unknown installation conditions.

## 17. Accessibility

- WCAG AA contrast target for core web UI
- Dynamic Type on iOS
- VoiceOver/keyboard labels for object operations
- keyboard-accessible Arrange on web
- numeric alternative to gestures
- 44 pt minimum iOS touch targets
- status text/icons in addition to color
- reduced-motion respected
- glass blur reduced/removed where contrast requires it

## 18. Logo/artwork status

The **name, logo concept, motion behavior, palette, typography direction, and Parallax-derived design language are approved as the working FormShift brand baseline.** Final vector logo artwork has not yet been generated or visually approved.

## 19. Revision record

### 0.2 — 2026-08-19

Replaced NestMetric identity with FormShift; translated latest Parallax light-glass, opposing-curve depth, blue `#0D7496`, soft-peach metadata, and subtle clear-ice motion into a mobile-first spatial application; defined mode and logo behavior.


## v0.3 spatial-editor implementation rules

The visual design now has an implementation-level canvas contract:

- precision plan editor is canvas-first and rendered independently of DOM/native layout chrome
- dimension text remains optically stable while decorative parallax affects surrounding glass surfaces
- canvas parallax may never move canonical geometry or dimension anchors
- estimated/measured/confirmed states use line treatment + text/icon, never color alone
- collision/clearance overlays prioritize legibility over decorative glass effects
- web canvas/3D routes may lazy-load heavy renderers; loading state must preserve the Parallax-derived depth language without imitating a fake room
- geometry-faithful and illustrative AI views are visually distinguished
- blueprint sheets use restrained technical styling rather than decorative glass

### Illustrative vs authoritative visual label

Geometry-rendered view:
**Measured plan** / **Estimated plan** according to source state.

AI-generated image:
**Illustrative concept — plan dimensions are authoritative.**

### v0.3 revision note

This revision does not change the FormShift brand or Parallax visual lineage. It adds durable renderer/measurement-state presentation requirements needed for implementation.


## 18. Milestone 0 visual implementation

The first code baseline implements the approved Parallax-derived direction: recessed warm-neutral navigation, a subtly bowed/lifted workspace, restrained FormShift blue, soft peach metadata, warm beige/green/brown undertones, rounded translucent glass cards, and the persistent Organize / Arrange / Build mode control. The first logo implementation uses two conflicting spatial frames plus a blue datum point. Motion remains optional and must respect reduced-motion settings before production use.


## 20. Private access states

The private-product access flow is part of the product experience, not a generic developer login screen. It uses the same restrained glass/depth language but keeps authentication visually quiet and unambiguous.

Required states:

- **Sign in** — Google only for the current private release. The interface must not imply that Apple authentication is available.
- **Pending approval** — authenticated identity exists, but no workspace content is rendered.
- **Suspended/revoked** — explicit access-unavailable message; no project shell is rendered.
- **Active** — project/workspace shell becomes available.
- **Configuration unavailable** — development/setup state; never fall through into an insecure demo workspace.

The UI may explain access state, but it never implies that visual gating is the security control; server/database authorization remains authoritative.

## 21. Milestone 0 responsive implementation rules

The first implementation preserves the Parallax-derived depth hierarchy across widths rather than shrinking a desktop dashboard.

- desktop/tablet: recessed navigation + lifted workspace + contextual panels
- compact mobile: navigation collapses; project/mode shelf remains; canvas takes priority
- precision canvas scales to available viewport width while canonical coordinates/dimensions remain unchanged
- mode controls retain usable touch targets and cannot force horizontal page overflow
- auth/access states use a centered bounded glass surface rather than rendering hidden workspace chrome behind it

These rules are durable; exact breakpoints may change after physical-device/browser validation.
