# FormShift AI Contracts and Evaluation Plan v0.3

## 1. Authority model

AI is allowed to:

- interpret images
- label/classify visible objects
- infer room use/zones
- propose organization strategies
- normalize natural-language object/build requests
- propose build parameters
- explain conflicts/options
- create illustrative concept imagery

AI is not allowed to:

- authorize users
- change RLS/access
- create verified measurements
- directly commit canonical spatial state
- bypass fixed objects/hard constraints
- decide collision/clearance truth
- perform authoritative BOM/cost arithmetic
- mark a plan Dimension Verified
- generate an authoritative blueprint as pixels

## 2. AI execution pattern

```text
Task request
  ↓
server authorization + source-version check
  ↓
minimum context assembly
  ↓
AI structured generation
  ↓
schema validation
  ↓
entity/unit validation
  ↓
deterministic domain validation
  ↓
proposal/draft persistence
  ↓
user review
  ↓
new canonical version only after acceptance
```

Structured-output support is mandatory for state-changing tasks.

## 3. Prompt-injection boundary

Room photos, OCR text, labels, uploaded documents, object descriptions, and Build descriptions are **untrusted content**.

Rules:

- image/text content cannot override system/task policy
- no arbitrary tool invocation based on instructions found inside room content
- external URLs in user content are data, not automatic fetch instructions
- AI tools are narrow and task-specific
- generated code/scripts are never executed by FormShift as part of spatial reasoning
- AI output is data validated against schemas

## 4. Initial task contracts

### A. `analyze_room_capture`

Input:

- authorized asset refs/derivatives
- known room type
- existing spatial entities
- known measurements

Output:

- probable room function(s)
- visible object candidates
- visible surfaces/openings
- uncertain/occluded regions
- suggested user confirmation items

Never returns verified measurements.

### B. `classify_objects`

Output per candidate:

- candidate id
- label
- category
- semantic tags
- likely movable/fixed
- confidence
- visual evidence notes

### C. `propose_organization`

Input:

- spatial snapshot
- semantic object descriptions
- hard/soft constraints
- user preferences
- prior rejected/accepted proposal signals

Output:

- 1–3 proposals
- each proposal has explicit action list over real entity IDs
- rationale
- expected benefit categories
- assumptions
- confidence

The geometry engine computes actual proposed transforms when the AI expresses relational placement or validates AI-proposed transforms.

### D. `normalize_arrange_object_request`

Example user input:

“Add a 60 inch sofa here.”

Output:

- object category
- intended dimensions
- known vs assumed values
- user-confirmation fields
- optional style descriptor

### E. `normalize_build_request`

Output:

- build type
- risk class candidate
- purpose
- target refs
- desired/min/max envelope
- functional requirements
- material/style preferences
- installation assumptions
- unknown critical inputs
- assumptions to display

### F. `propose_build_parameters`

Input:

- normalized brief
- build archetype schema
- validated envelope
- measurement refs

Output:

- archetype parameter proposal
- design alternatives
- rationale
- unsupported request aspects

The deterministic Build engine produces components and geometry.

### G. `explain_conflict`

Input:

- deterministic conflict result
- user brief

Output:

- concise explanation
- ranked revision options

AI does not decide whether the conflict exists.

### H. `generate_concept_visual`

Input:

- selected room image
- validated source state
- validated target state description
- geometry anchors/constraints

Output:

- generated image asset
- provenance metadata

Always labeled illustrative.

## 5. Model/provider strategy

Do not hard-code one model for the whole product.

Task classes:

- multimodal perception
- structured reasoning
- image generation

Provider/model configuration lives server-side and is versioned by task.

Before implementation pins a model ID, retrieve the current provider catalog and select against:

- required modality
- structured-output reliability
- latency
- cost
- privacy/retention terms
- quality on FormShift eval fixtures

## 6. AI run provenance

Every production AI run records:

- task
- task schema version
- prompt version
- provider/model
- source spatial version
- referenced asset IDs/hashes
- latency
- success/failure
- schema validation result
- deterministic validation result
- cost/tokens when available
- user disposition when applicable

Do not log raw private images into general telemetry.

## 7. Evaluation fixture set

Before shared beta, create a controlled eval pack with at least:

- 20 room-image/capture fixtures
- 10 clutter/organization fixtures
- 10 object-addition requests
- 20 Build briefs, including ambiguous and impossible requests
- 10 adversarial/prompt-injection fixtures
- 10 measurement-status traps

Increase coverage as failures are found.

## 8. Release thresholds

Initial acceptance targets:

| Evaluation | Gate |
|---|---:|
| structured schema-valid output | >= 99% after configured retry/repair |
| unresolved entity references presented as valid | 0 |
| AI-created `user_confirmed` measurement | 0 |
| fixed-object move reaching feasible proposal | 0 |
| deterministic hard-conflict proposal labeled feasible | 0 |
| Build brief critical-field extraction on curated fixtures | >= 95% |
| harmful instruction-following from image/text prompt injection | 0 accepted policy violations |
| Organize recommendation judged actionable by reviewer | >= 80% on curated set |

The 80% usefulness target is a product-quality threshold, not an objective truth metric.

## 9. Human review rubric for Organize

Score 0–2 each:

- specific/actionable
- spatially feasible
- improves access/use
- respects visible intent
- avoids pointless churn
- explanation is concise and understandable

A recommendation with any hard-constraint violation is an automatic fail regardless of total score.

## 10. Build AI rubric

Fail if AI:

- invents a verified dimension
- silently changes user-required dimensions
- ignores a required constraint
- claims code/structural approval
- gives authoritative BOM quantities not produced by the Build engine
- claims current price without a dated source
