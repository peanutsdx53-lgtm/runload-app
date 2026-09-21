# Stage 8B — CONDITION_AND_RESULT_CHANGED Visual Mapping Audit

Date: 2026-09-21
Status: COMPLETE — SECOND STAGE 8B MAPPING

## Scope

This batch maps only:

- `CONDITION_AND_RESULT_CHANGED`

Previously mapped `CURRENT_SHIFT_WITH_HISTORY` remains unchanged.
Other Stage 8B codes remain unmapped.

## Comprehension problem

When a regional result and one or more running conditions both differ from the previous compatible record, a beginner may incorrectly read the co-change as a causal explanation.

The Interpretation view must show both facts while keeping them visually separate.

## Visual transformation

Pattern:

- one regional Locate + Compare visual;
- one compact factual condition card below the regional visual;
- no line, arrow, or motion connecting the condition card to the regional result;
- one short understanding sentence with an explicit non-causal boundary.

Condition detail is intentionally compact:

- show at most two condition labels;
- if more exist, summarize the remainder as `ほかN件`;
- detailed condition exploration remains outside this primary interpretation step.

## Motion semantics

Only the regional Stage 8A motion remains active:

- body focus = where to look;
- arrow = compatible previous → current comparison direction.

The condition card is static.

No motion or connector represents causality.

Reduced Motion shows all final information statically.

## Verification

Focused checks after correcting one over-broad test expression:

- **9/9 PASS**

The initial single FAIL was a test false positive: its regex matched the word `condition` in the page and the unrelated regional comparison arrow later in the HTML. The assertion was narrowed to the condition card itself.

Verified:

- target pattern is `condition-result-separated`;
- one body region remains focused;
- condition card is separate;
- condition display is compact;
- no SVG/line/path/arrow exists inside the condition card;
- explicit non-causal wording is present;
- ROF-J is not mixed into this step even when available;
- `CURRENT_SHIFT_WITH_HISTORY` mapping remains intact;
- `MULTI_LAYER_CHANGE` remains on general behavior;
- no danger/success semantic color is introduced.

Dedicated regression file:

- `tests/interpretationStage8BConditionResult.test.mjs`

Runtime hashes:

- `ui/interpretationRoomPresentation.js`: `6f9cf5af4302fe242aeed3cd5ddbd35aaa9586d0990d6250e090946b51923e90`
- `styles/interpretation-room.css`: `bb327c93303a835a43b41f41f8235d27e4b695bcaf6a58f754b6d2e90dedea39`
- `service-worker.js`: `0463e3b47218ac675e345d5241c4d382f7c862c5f7ccc0732d25d6dd0540e052`

Runtime manifest and PWA hash expectations were aligned.

## 390 px targeted review

A 390 px static layout fixture was inspected for the changed region.

Observed order:

1. regional focus/compare card;
2. separate condition card;
3. `この図で分かること` block.

The new cards remain within the 390 px canvas and do not create a competing horizontal visual.

A fresh production-browser screenshot remains part of Stage 8E because the current sandbox lacks a Playwright Chromium executable.

## Scientific boundary

No calculation, Meaning Core classification, compatible-history rule, ROF-J semantics, Safety logic, persistence, or downstream function was changed.

No causal claim is introduced.

## Next Stage 8B batch

Next:

- `MULTI_LAYER_CHANGE`
- regional lane + separate ROF-J 0–10 lane;
- no causal arrow between the two layers;
- one sentence stating that both contain a difference while remaining separate information.
