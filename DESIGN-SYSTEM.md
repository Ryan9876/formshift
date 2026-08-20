# FormShift Design System

**Status:** Authoritative visual and interaction baseline  
**Revision:** 0.5.3  
**Established:** 2026-08-19  
**Last material design decision:** 2026-08-20  
**Visual lineage:** Parallax light-glass/depth language adapted for a photo-first spatial augmentation product

## 1. Brand

### Name

**FormShift**

### Brand line

**Shape the space around you.**

Mode microcopy:

- **Organize — Make what you have work better.**
- **Arrange — Try the space another way.**
- **Build — Make what the space needs.**

FormShift should feel spatial, precise, calm, modern, tactile, and useful in a real home without resembling a conventional CAD package.

## 2. Primary visual rule

**The user's real room photograph or live spatial scene is the primary canvas whenever available.**

Structured geometry, measurements, collision overlays, and plan rectangles support that experience. They do not replace it.

Default hierarchy inside a project:

1. real source photo / augmented scene
2. contextual controls and AI recommendations
3. measurements/status needed for the current decision
4. technical Plan view
5. blueprint/BOM/export detail

Do not default users into a top-down rectangle editor merely because the geometry exists.

## 3. Source-scene integrity

The original room capture remains visually identifiable and recoverable.

Required scene states:

- **Before** — untouched source capture
- **Augmented** — source capture plus FormShift-projected or reconstructed changes
- **Plan** — secondary technical geometry view

The Before/Augmented/Plan control should remain close to the scene, compact, and persistent when relevant.

The product must never visually imply that an estimated overlay is camera-calibrated when it is not.

## 4. Visual-confidence language

Every scene result that could be mistaken for spatial truth carries one of these states:

### Source photo

Original captured image. No synthetic spatial change.

### Estimated augmentation

Object position/scale is derived from available geometry but camera calibration, occlusion, or lighting fidelity is incomplete.

### Calibrated augmentation

Camera/scene mapping is calibrated sufficiently for geometry-faithful projection within documented tolerance.

### Geometry-rendered

Rendered directly from authoritative spatial geometry with a known camera/scene transform.

### Illustrative concept

AI-generated or reconstructed pixels useful for visualization but not proof of fit.

### Measured / Estimated plan

Technical Plan view whose status comes from measurement provenance.

Status must use text/icon/treatment, never color alone.

## 5. Parallax-derived visual character

Retain the approved FormShift translation of Parallax:

- warm neutral outer field
- lifted clear-glass workspace
- recessed navigation/supporting chrome
- restrained FormShift blue
- soft peach metadata
- subtle beige/green/brown undertones
- opposing curved surfaces where they reinforce depth
- very restrained parallax/shear motion

The real room image should not be dimmed, over-tinted, blurred, or visually subordinated to decorative glass.

Controls float around or lightly over the image; the image remains the visual anchor.

## 6. Color system

| Token | Value | Use |
|---|---:|---|
| `canvas-high` | `#F4F2EA` | outer warm neutral field |
| `canvas-mid` | `#E8E8E1` | supporting workspace chrome |
| `canvas-warm` | `#EEE9DC` | beige undertone |
| `canvas-green` | `#E7E9DD` | restrained green undertone |
| `glass` | `rgba(255,255,255,.56)` | translucent controls |
| `glass-strong` | `rgba(255,255,255,.76)` | higher-legibility sheets |
| `ink` | `#253034` | primary text |
| `ink-soft` | `#526066` | secondary text |
| `metadata-peach` | `#C98E78` | secondary metadata/AI notes |
| `blue` | `#0D7496` | primary action, selection, dimension accent |
| `blue-soft` | `#DCECF1` | selected backgrounds/guides |
| `blue-deep` | `#0A5B76` | pressed emphasis |
| `line` | `rgba(42,61,66,.14)` | borders/dividers |
| `verified` | `#387461` | confirmed state |
| `estimated` | `#9A6B32` | uncertainty/attention state |
| `danger` | `#A84C4C` | errors/destructive actions |

Core web UI targets WCAG AA contrast.

## 7. Typography

Use Geist Sans where practical on web and San Francisco/system-native typography on iOS. Use Geist Mono / SF Mono selectively for dimensions, coordinates, and blueprint metadata.

- page title: 24–28, 650–700
- section: 18–20, 600–650
- object/proposal card: 15–16, 600
- body: 15–16, 400–500
- secondary: 13–14
- technical label: 11–12, 550–650
- dimension: 13–15, tabular/mono where useful

The photo canvas should not be crowded with large marketing text.

## 8. Project shell

### Web

Preferred hierarchy:

- compact/recessed project navigation
- project title + measurement state + persistent Organize/Arrange/Build switch
- large lifted photo/scene canvas
- contextual inspector beside it when width permits
- technical Plan/blueprint detail below or behind explicit navigation

### iPhone

- compact project header
- persistent 3-mode segmented control
- photo/live camera scene dominates the viewport
- contextual bottom sheet for selected object/proposal/build details
- Plan/measurements open as a deliberate secondary surface

No permanent sidebar on iPhone.

## 9. Primary mode switch

Organize / Arrange / Build remains first-class and persistent while inside a project.

Switching modes should preserve the same source scene/camera framing whenever practical so users feel they are changing what they do to one room, not moving between unrelated applications.

## 10. Organize experience

Organize is photo-first and proactive.

Primary result structure:

1. real-room **Before** image
2. recommended **Augmented** end state in the same room
3. 2–4 prioritized opportunities
4. specific moves
5. concise rationale
6. confidence/assumptions
7. Accept / Edit / Reject
8. optional Plan verification

A proposal should answer visually: **“What would my actual room look like if I did this?”**

A rectangle-only layout is not an acceptable primary Organize result.

Where object removal/movement reveals hidden background, reconstructed pixels must be labeled according to confidence. AI inpainting may improve visual continuity but does not establish geometry.

## 11. Arrange experience

Arrange should feel like manipulating the real room photograph.

Selected visible object:

- clear but restrained outline/selection affordance
- drag/rotate handles appropriate to confidence
- dimensions available without covering the object
- live collision/clearance feedback
- perspective/scale preserved automatically
- fixed/estimated state visible in inspector

### Arrange gesture contract

Room navigation and selected-object manipulation are separate interaction targets.

- before selection, two-finger pinch zooms the room and one-finger drag pans only when zoomed
- object selection occurs only after a completed short tap; pointer/touch-down alone must never select or lift an object
- beginning a pinch or pan cancels the pending selection tap
- after selection, gestures beginning on the selected-object hit area manipulate the object: one finger moves; two fingers scale and rotate
- gestures beginning outside the selected-object hit area continue to navigate the room: pan when zoomed and pinch to zoom
- viewport zoom/pan never changes object geometry, canonical state, or the persisted derived scene
- **Fit photo** restores the viewport framing without resetting or moving the selected object
- numeric/button alternatives remain available for accessibility and precision

### Selection refinement contract

An automatic segmentation result is a **candidate**, not an accepted object cutout.

- the first object tap creates an in-place selection preview over the unchanged room photo; it must not immediately lift or remove pixels
- the candidate mask is visually distinguishable from the source photo without obscuring object detail
- users can refine the candidate with explicit **Add** and **Remove** interactions while room zoom/pan remains available
- Add/Remove should support continuous one-finger painting when precision or irregular edges make repeated taps inefficient
- a dedicated **Pan** refinement mode owns one-finger room navigation while a candidate exists; two-finger pinch-to-zoom remains available from Add, Remove, and Pan
- the current Add/Remove stroke is previewed while the finger moves; the mask is recomputed after the stroke completes
- refinement provides **Undo** and **Redo** for completed Add/Remove strokes without discarding the initial candidate
- Add/Remove changes must update the visible mask before acceptance
- touch refinement should provide a local magnifier/loupe that follows the active refinement point when precision is useful on a phone
- **Use selection** is the explicit transition from candidate mask to lifted photographed object
- **Cancel** discards the candidate and returns to the unchanged source/derived scene
- background removal/repair begins only after the candidate is accepted for lift
- AI background reconstruction remains a separate explicit action; selection refinement itself remains local when supported
- mobile refinement and arrangement controls use a compact wrapping/bottom-tray pattern and must not overflow horizontally

The technical Plan view remains available for:

- exact wall/object distance
- numeric coordinates
- collision debugging
- placements that cannot be reconstructed confidently in the photo

Single-photo limitation must be handled honestly: large viewpoint/rotation changes may expose unseen surfaces and require illustrative reconstruction.

## 12. Build experience

Build's main question is **“How will this look and fit in my actual space?”**

Flow:

1. Describe
2. Confirm critical dimensions
3. Generate deterministic design
4. Show **Augmented** object in real room photo
5. Compare **Before** / **Augmented**
6. Use **Plan** for exact fit/placement when needed
7. Accept design
8. Review Blueprint / Materials / Cost / Effort

The augmented object should visually communicate its actual construction archetype—not a generic rectangle. For shelving this means visible side panels, shelves, top/bottom, material appearance, and floor contact.

As scene calibration improves, perspective, scale, contact shadow, occlusion, and lighting should converge toward the real room.

Build detail remains secondary to the room scene. Blueprint/BOM panels should not consume the primary visual area until explicitly opened.

## 13. Photo augmentation controls

Minimum scene control:

**Before | Augmented | Plan**

Rules:

- default to Augmented when a source photo and proposal exist
- default to Before when no proposal exists and the user is reviewing the room
- default to Plan only when imagery is unavailable or user explicitly requests technical verification
- switching views must not alter canonical state
- retain the same proposal/version across views
- surface augmentation confidence near the selector, not buried in settings

## 14. Photo-stage composition

The real room image should normally occupy the largest single visual region on screen.

Allow:

- compact floating view selector
- selected-object dimensions
- confidence badge
- contextual bottom/side controls
- subtle alignment/collision cues

Avoid:

- opaque panels covering large portions of the room
- decorative overlays that alter perceived wall/floor colors
- oversized blue bounding boxes
- CAD grids as the default background
- always-visible coordinates

## 15. Technical Plan view

Plan remains important but explicitly secondary.

Use it for:

- measurement correction
- exact positioning
- collision/clearance verification
- numeric editing
- diagnostics
- fallback when photo-scene mapping is uncertain

Plan design rules:

- light neutral field
- restrained geometry
- blue selected outlines/dimensions
- clear fixed/movable states
- estimated/measured/confirmed line treatment
- no decorative CAD-black theme

## 16. Blueprint visual language

Blueprints are intentionally flatter and technical:

- light neutral paper field
- dark geometry
- blue dimensions
- dashed estimated/unverified lines
- explicit units
- project/version/measurement state/date/title block
- planning-status note
- no professional seals/stamps language

Blueprints derive from retained geometry, not room-image pixels.

## 17. AI presentation

AI should appear as embedded intelligence rather than a chatbot.

Use AI for:

- room interpretation
- proposal rationale
- object/zone labels
- natural-language Build/Arrange input
- revision suggestions
- reconstruction/inpainting notices
- optional illustrative concepts

The FormShift mark may accompany AI-generated recommendations. Avoid chat-heavy chrome where a visual scene + concise action is clearer.

## 18. Motion

Use subtle depth motion only around the scene:

- 2–4 px maximum glass-layer offset
- faint opposing sheen movement
- scene/object geometry remains optically stable
- disable parallax during measurement or precision manipulation
- reduced-motion preferences disable decorative motion

Never animate the source photo in a way that makes measurement or object placement feel unstable.

## 19. Accessibility

- WCAG AA target for core web UI
- Dynamic Type on iOS
- VoiceOver/keyboard labels for object operations
- keyboard-accessible technical Plan editor on web
- numeric alternative to gestures
- minimum 44 pt iOS touch targets
- status text/icons in addition to color
- reduced-motion respected
- zoom/pan must not trap keyboard/screen-reader focus
- Before/Augmented comparison must remain understandable without relying on animation

## 20. Private access states

Sign-in, pending approval, suspended/revoked, active, and configuration-unavailable states retain the FormShift glass/depth language while keeping authentication quiet and explicit. No private room imagery renders behind an unauthorized access state.

## 21. Revision note — 0.5.3

Revision 0.5.3 extends selection refinement from point corrections to continuous Add/Remove strokes, adds an explicit Pan mode during candidate refinement, keeps two-finger room zoom available in all refinement modes, and establishes Undo/Redo for completed refinement strokes.

Revision 0.5.2 made selection refinement a required stage before lifting photographed objects in Arrange. Automatic segmentation is treated as a candidate; users can review and locally Add/Remove before explicitly choosing **Use selection**. It also establishes the mobile magnifier and compact refinement tray as durable interaction patterns.

Revision 0.5.1 defined Arrange's room-viewport and object-manipulation gestures as separate targets. This prevents photo navigation from implicitly selecting, moving, scaling, or rotating an object and establishes tap-on-release selection plus a non-destructive Fit photo action as durable interaction requirements.

Revision 0.5.0 made the source room photo/live scene the explicit primary canvas while preserving the Plan view as a secondary technical tool. The Parallax-derived brand, palette, typography, accessibility rules, and blueprint technical language remain unchanged. Prior revisions remain available in Git history.
