# MULTI_LAYER_CHANGE Visual Mapping Audit

Date: 2026-09-21
Status: COMPLETE — THIRD MEANING-DRIVEN VISUAL MAPPING MAPPING

## Scope

This batch maps only:

- `MULTI_LAYER_CHANGE`

Previously mapped codes remain unchanged.

## Comprehension problem

Regional Reference-100 output and ROF-J can both differ in the same record. If shown without a strong visual separation, a beginner may read them as one scale or infer that one caused the other.

## Visual transformation

Pattern:

- one combined `separate-layers` visual block;
- regional information is labelled `情報1 · 部位別結果`;
- ROF-J is labelled `情報2 · 主観情報`;
- the two lanes are separated by the static label `別の尺度`;
- no arrow or connector crosses between the two lanes;
- one understanding sentence states that both contain a difference while remaining separate information.

Regional Reference-100 and ROF-J remain on their existing independent axes.

## Motion semantics

Motion remains local to each information layer:

- regional arrow: compatible previous → current;
- ROF-J values remain on the independent 0–10 subjective scale.

No inter-layer animation is added.

Reduced Motion shows both final lanes statically.

## Verification

Focused checks:

- **10/10 PASS**

Verified:

- target pattern is `separate-layers`;
- explicit regional and ROF information-layer labels;
- explicit `別の尺度` separator;
- ROF-J 0–10 wording retained;
- Reference-100 separation wording retained;
- no arrow/SVG/line/path inside the inter-layer separator;
- one regional focus;
- one understanding note;
- `CURRENT_SHIFT_WITH_HISTORY` regression intact;
- `CONDITION_AND_RESULT_CHANGED` regression intact;
- no danger/success semantic color introduced.

Dedicated regression file:

- `tests/interpretationStage8BMultiLayer.test.mjs`

Runtime hashes:

- `ui/interpretationRoomPresentation.js`: `f1175e6f36d1043ae47136854812f5f443784affa4f93806a43a84bc001bc05b`
- `styles/interpretation-room.css`: `9ab2b8ea7c77779f8b9e3a0817fa704450139e8213627e675a444b99c85cca1c`
- `service-worker.js`: `0463e3b47218ac675e345d5241c4d382f7c862c5f7ccc0732d25d6dd0540e052`

Runtime manifest and PWA hash expectations were aligned.

## 390 px targeted review

A 390 px static layout fixture was inspected.

Observed sequence:

1. regional lane;
2. `別の尺度` separator;
3. ROF-J subjective lane;
4. one understanding note.

Both lanes remain within the 390 px canvas and read as vertically separated information layers.

A fresh production-browser visual audit remains reserved for final closure audit.

## Scientific boundary

No scale unification, causal inference, risk inference, calculation change, ROF-J semantic change, Safety change, persistence change, or downstream-function duplication was introduced.

## Next meaning-driven visual mapping batch

Next:

- `REPEATED_OBSERVATION`;
- Locate one region;
- show explicit compatible-record counts;
- no trait/tendency/proneness wording;
- no visual intensity based on count.
