# FormShift Rendering and Spatial Interaction Decision v0.3

## 1. Decision

Use a **shared geometry/domain layer with purpose-specific renderers**.

Do not force the product into a single renderer merely to maximize code sharing.

## 2. Renderer map

| Need | Web | iOS |
|---|---|---|
| 2D/2.5D precision editor | React Native Skia | React Native Skia |
| Geometry-faithful 3D preview | Three.js / React integration | RealityKit adapter |
| AR in-space preview | not MVP-critical | RealityKit / ARKit |
| Room scan | unavailable | RoomPlan |
| Blueprint drawing | shared retained vector model rendered/exported per platform | same |

## 3. Why React Native Skia for the plan editor

The plan editor is the core interaction surface and benefits from:

- shared rendering logic across web/iOS
- GPU-oriented canvas rendering
- precise transforms
- custom dimension lines/guides
- direct integration with React Native/Expo
- predictable visual output independent of DOM layout

Tradeoff:

- web uses CanvasKit/WASM and therefore carries meaningful payload weight

Mitigation:

- lazy-load the spatial editor
- project list/auth/onboarding do not load Skia
- cache CanvasKit
- performance-budget the first editor load separately from shell load

## 4. Why not use AI-generated images as the editor

AI-generated room views can be visually useful but are non-deterministic and can alter:

- perspective
- object dimensions
- openings
- counts
- geometry

Therefore they are never the direct manipulation canvas.

## 5. 2D/2.5D editor model

Primary camera:

- orthographic/top-down plan
- optional tilted/isometric mode for comprehension
- transforms are mapped directly from canonical X-Z geometry

Layers:

1. floor/boundary
2. walls/surfaces
3. openings and keep-outs
4. fixed objects
5. movable objects
6. build objects
7. collision/clearance overlays
8. dimensions
9. selection/manipulation handles
10. comments/AI proposal ghosts

## 6. Interaction precision

### Move
- pointer/touch delta converted through view transform to canonical mm delta
- no implicit resize
- optional snap grid is visual convenience only

### Rotate
- explicit rotation gesture/handle
- angle shown numerically
- optional 1° / 5° / 15° snapping

### Resize
- only when object type allows physical resize
- requires distinct resize mode
- resulting dimension becomes estimated/user-entered until verified as appropriate

### Numeric edit
Every gesture-affectable spatial property has a numeric route.

## 7. Collision engine

Initial collision uses deterministic simplified geometry:

- 2D oriented footprints for fast live feedback
- vertical overlap test to avoid false collisions at different heights
- opening/keep-out regions
- build-specific 3D bounds where necessary

The renderer may visualize collision but does not decide it.

## 8. Web 3D

Three.js is used for contextual geometry-faithful room/build previews because it provides mature browser 3D/WebGL/WebGPU capability.

Web 3D is a view of the canonical model, not separate state.

MVP scope:

- orbit camera
- simplified room surfaces
- simplified objects
- Build object placement
- dimension/clearance highlighting as overlays where useful

Do not attempt photorealistic digital-twin rendering in MVP.

## 9. iOS 3D/AR

RealityKit adapter consumes canonical geometry and asset references.

MVP native goals:

- place a proposed Build object in the scanned room context
- show geometry-faithful scale and placement
- support simple inspection, not a full CAD editor in AR

## 10. Blueprint renderer

Blueprints originate from a retained drawing model:

- sheets
- views
- line primitives
- dimension primitives
- text/notes
- symbols
- scale metadata
- verification legend

PDF export is generated from that retained model. Never screenshot the interactive canvas as the authoritative blueprint.

## 11. Performance budgets

Initial target budgets to verify during implementation:

- project shell interactive without spatial editor payload
- plan editor keeps manipulation responsive on supported iPhones
- geometry validation remains below perceptible drag latency for typical single-room object counts
- AI imagery and 3D assets load progressively
- large original room images use optimized derivatives for interactive screens

These are targets; actual thresholds will be finalized from device profiling.
