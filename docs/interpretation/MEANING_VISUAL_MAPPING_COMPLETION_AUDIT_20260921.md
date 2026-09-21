# Meaning-Driven Visual Mapping Completion Audit

Date: 2026-09-21
Status: COMPLETE — PASS

## Scope

meaning-driven visual mapping connects the approved primary Meaning Core codes to one deterministic understanding-oriented visual pattern at a time.

Completed mappings:

- `CURRENT_SHIFT_WITH_HISTORY` → Locate + compatible previous → current Compare;
- `CONDITION_AND_RESULT_CHANGED` → Locate + Compare + separate factual condition card;
- `MULTI_LAYER_CHANGE` → separate regional and ROF-J lanes;
- `REPEATED_OBSERVATION` → Locate + explicit compatible-record count visual;
- `CURRENT_REFERENCE_PATTERN` → Locate + Reference-100 → current.

No bulk physical ranking, causal model, risk model, new Safety logic, new persistence, or downstream-function duplication was added.

## Understanding behavior

### CURRENT_SHIFT_WITH_HISTORY

- one selected region;
- compatible previous → current;
- Reference-100 remains local;
- ROF-J omitted from this primary explanation step;
- one short understanding sentence.

### CONDITION_AND_RESULT_CHANGED

- regional result visual and condition facts remain separate;
- no causal connector;
- at most two condition labels plus `ほかN件`;
- explicit non-causal boundary;
- ROF-J omitted from this primary step.

### MULTI_LAYER_CHANGE

- regional lane and ROF-J lane remain separate;
- explicit `別の尺度` separator;
- no inter-layer causal arrow;
- one understanding sentence.

### REPEATED_OBSERVATION

- one body-region locator;
- explicit compatible-record counts;
- fixed-size record dots;
- no count-driven animation/intensity;
- no trait, tendency, proneness, or future-outcome inference.

### CURRENT_REFERENCE_PATTERN

- Reference-100 → current only;
- previous marker suppressed for this pattern;
- current position explained as a future same-region comparison point;
- no good/bad evaluation.

## Dedicated meaning-driven visual mapping regression files

- `tests/interpretationCurrentShiftVisualMapping.test.mjs`
- `tests/interpretationConditionResultVisualMapping.test.mjs`
- `tests/interpretationMultiLayerVisualMapping.test.mjs`
- `tests/interpretationRepeatedObservationVisualMapping.test.mjs`
- `tests/interpretationCurrentReferenceVisualMapping.test.mjs`

Per-batch focused verification:

- current shift: 11/11 PASS;
- condition/result: 9/9 PASS after correcting one over-broad test expression;
- multi-layer: 10/10 PASS;
- repeated observation: 10/10 PASS;
- current reference: 8/8 PASS.

## Combined meaning-driven visual mapping integrity checkpoint

Combined production-source checks: **21/21 PASS**

Verified:

- presentation module evaluation/syntax;
- all five visual-pattern mappings;
- information-layer suppression/separation rules;
- no previous marker for current-reference pattern;
- no comparison arrow for repeated-count pattern;
- guided-dialogue baseline entry remains two choices;
- guided-dialogue baseline understand step remains at most three choices;
- runtime manifest tracks current visual runtime files;
- reused body-region visual remains in PWA precache;
- protected Primary calculation core hash is unchanged;
- protected ROF-J core hash is unchanged;
- PR #49 remains Draft and unmerged.

## Current runtime hashes

- `ui/interpretationRoomPresentation.js`: `68ac669705813be5ee38b9ac9b533b365acc1b251a6dd75cc650ab3bd11bd879`
- `styles/interpretation-room.css`: `38247c09e04a4cf4e3b9ddfa754c90d581e655100191e45af562b0336d62d3f2`
- `service-worker.js`: `0463e3b47218ac675e345d5241c4d382f7c862c5f7ccc0732d25d6dd0540e052`
- `ui/prototypeBodyRegionVisuals.js`: `044d9a07dfda7cf01c6b98088892d2ef2f8a057595bf43fc3a9d68d637c039d4`

Protected Primary:

- `b47d1afdbb714c39c32868ed3aaf950f1aa2b71db0f98d3bca0112babc98adc8`

Protected ROF-J:

- `7ea31dbbbd03d5e74960ff0c7de53bc431536d743be6bc46fbf5ac8906063908`

## Visual review boundary

Targeted 390 px static-layout reviews were performed for all five visual patterns.

They confirmed the intended mobile stacking/order and no obvious horizontal-layout issue in the changed surfaces.

The current sandbox does not contain a Playwright Chromium executable, so the full production-browser mobile/desktop/theme/dark/reduced-motion visual audit remains reserved for final closure audit.

## Unmapped/general states

No ad-hoc meaning-driven visual mapping mapping was introduced for:

- `COMPARISON_BASELINE`;
- support-priority states;
- limited/legacy states;
- no-target states.

They retain existing behavior and scientific boundaries.

## Release state

- PR #49 remains Draft.
- main remains untouched.
- formal Current remains untouched.
- no merge or Current promotion was performed.

## Next stage

guided visual integration — Guided-dialogue integration.

Primary acceptance target:

- visual content appears only after the user narrows to an understanding representation;
- one main visual per step;
- explanation follow-up stays within two or three choices;
- Evidence/Detail remain downstream;
- short sequential reveal may be used only to clarify order;
- Reduced Motion must show the complete static state immediately.
