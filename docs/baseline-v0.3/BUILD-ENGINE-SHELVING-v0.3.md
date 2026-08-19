# FormShift First Build Engine: Rectilinear Shelving v0.3

## 1. Why this is the first archetype

The first deterministic Build archetype is a **rectilinear open shelving/storage unit** because it exercises:

- natural-language Build normalization
- placement envelope
- verified dimensions
- parametric geometry
- room fit
- component generation
- blueprint dimensions
- BOM/cut list
- waste
- price estimate
- effort estimate
- in-space visualization

without taking on doors, drawers, complex joinery, structural engineering, or jurisdictional code.

## 2. Supported variants

Initial:

- freestanding open shelving unit
- wall-adjacent shelving unit
- simple wall-mounted shelf set as a Class B variant

Not initial:

- doors
- drawers
- face frames
- complex corner units
- curved geometry
- built-in electrical
- structural/load-certified mounting
- decks

## 3. Input parameters

Required/derived:

- overall width
- overall height
- depth
- side/support thickness
- shelf thickness
- shelf count
- top/bottom present
- back present/absent
- floor/wall placement
- clearance from adjacent walls/openings
- nominal material family
- optional maximum desired span
- mounting mode

Optional appearance:

- edge profile label
- finish/color descriptor
- open/closed top
- equal vs custom shelf spacing

## 4. Critical measurements

At minimum, as applicable:

- available target width
- available height
- available depth
- opening/door clearance near target
- relevant baseboard/trim projection
- floor-to-obstacle or wall obstruction dimensions
- wall mounting location/assumption for mounted variant

The plan remains Planning Plan until these are confirmed.

## 5. Deterministic geometry

The Build engine:

1. resolves outer envelope
2. generates panel/shelf components
3. calculates shelf spacing
4. places components in assembly coordinates
5. generates overall assembly bounds
6. transforms assembly into room coordinates
7. checks room/build-envelope fit
8. checks opening/keep-out conflicts
9. checks simple unsupported-span rule/flag
10. produces component dimensions and cut list

AI does not calculate panel quantity or dimensions.

## 6. Feasibility checks

Hard:

- positive dimensions
- component thickness smaller than relevant envelope
- shelf count valid
- object fits target envelope
- no hard room collision
- no fixed opening/keep-out violation
- generated components do not self-intersect incorrectly

Warnings:

- unusually long unsupported shelf span
- wall-mount assumption unverified
- floor/wall out-of-square not measured
- material thickness is nominal
- local fastener/substrate not verified

## 7. Blueprint set

Initial output:

### Sheet 1 — Placement
- room wall/area context
- unit footprint
- offsets to adjacent walls/openings
- critical clearances

### Sheet 2 — Front elevation
- overall W/H
- shelf elevations
- support/side thickness
- notes

### Sheet 3 — Side elevation
- overall H/D
- back/top/bottom detail

### Sheet 4 — Components / cut list
- component IDs
- count
- finished dimensions
- material
- notes

### Sheet 5 — Assembly notes
- sequence
- assumptions
- verification legend
- mounting caution if applicable

## 8. BOM

Rows derive from component graph.

Example material classes:

- sheet goods / boards
- back panel
- shelf support/hardware
- fasteners
- mounting hardware (if applicable)
- finish/edge treatment when selected

Each row:

- required quantity
- purchase unit
- calculated usage
- waste factor
- rounded purchase quantity
- price snapshot ref
- low/expected/high subtotal

## 9. Waste

Default waste is explicit and editable.

Initial defaults are archetype/material dependent, not a universal constant.

The output shows:

- net calculated requirement
- waste percentage
- purchase quantity after rounding

## 10. Cost estimator

Cost arithmetic is deterministic from:

- BOM
- dated price snapshot
- package sizes
- waste/purchase rounding
- optional tax
- optional delivery allowance

Missing price rows remain visibly unpriced; the system does not fabricate a current price.

## 11. Effort estimator

Task library:

- plan/mark
- cut
- edge/finish prep
- drill/fasten
- assemble
- finish
- mount/install

Each task has a base effort range modified by:

- component count
- cut count
- finish choice
- mounting mode
- assumed user skill
- available tool profile

Output:

- difficulty
- active labor range
- elapsed-time range
- tasks driving complexity
- required tool categories
- assumptions

## 12. Acceptance fixtures

At minimum:

1. 72" wide x 72" high freestanding shelf that fits.
2. Same shelf in a 68" target width → hard no-fit with alternatives.
3. Shelf beside a door swing → conflict.
4. Low shelf under window → valid if envelope clears.
5. Wall-mounted shelf with unknown substrate → design allowed with verification warning.
6. Metric-input fixture equivalent to imperial fixture → same canonical geometry.
7. Manual dimension correction after plan generation → plan becomes stale and must revalidate.
