# CURRENT_SHIFT_WITH_HISTORY Visual Mapping Audit

Date: 2026-09-21
Status: COMPLETE — FIRST MEANING-DRIVEN VISUAL MAPPING MAPPING

## Scope

This batch maps only the Meaning Core primary code:

- `CURRENT_SHIFT_WITH_HISTORY`

No other Meaning Core code is newly mapped by this batch.

## Comprehension problem

The Result screen can show the regional value and a previous value, but a beginner may still not connect:

- which body region should be inspected;
- which two records are being compared;
- what the arrow means;
- what the comparison helps them understand.

The visual therefore changes representation instead of adding more result data.

## Approved visual transformation

Pattern:

- Locate one region on the existing body-region visual;
- Compare strict compatible previous → current;
- keep Reference-100 visible as the selected region's local reference;
- show one short sentence labelled `この図で分かること`.

The understanding sentence states only that the same region's display position changed between the compatible previous record and the current record.

## Information-load control

For `CURRENT_SHIFT_WITH_HISTORY`:

- the regional Locate + Compare graphic is the one main visual;
- ROF-J is not shown on this explanation step even when ROF-J data exists;
- downstream Evidence / self-management choices remain separate;
- no route or downstream function is duplicated.

Other Meaning Core codes remain on the existing general visual behavior until they are mapped in later meaning-driven visual mapping batches.

## Motion semantics

Unchanged from visual foundation:

- body accent = where to look;
- arrow growth = comparison direction from previous to current;
- current-marker emphasis = comparison endpoint.

No movement communicates risk, safety, improvement, deterioration, or magnitude.

Reduced Motion continues to show the same final state immediately.

## Verification

Current production-source focused checks:

- **11/11 PASS**

Verified items include:

- module syntax/evaluation;
- `data-visual-pattern="locate-compare"` only for the target code;
- exactly one focused body region;
- previous → current direction;
- one understanding sentence;
- ROF-J lane absent from the target step;
- scientific/non-risk boundary retained;
- an unmapped code remains on `data-visual-pattern="general"`;
- guided-dialogue baseline entry still has two intent choices;
- no new route;
- no danger/success semantic color added;
- reused body visual remains in PWA precache.

Dedicated regression file:

- `tests/interpretationCurrentShiftVisualMapping.test.mjs`

Runtime hashes after this batch:

- `ui/interpretationRoomPresentation.js`: `3d00d56bce2cfbbaaf65201ec1f75d44bf18a01658245b9e3e0bf3a8083bfa05`
- `styles/interpretation-room.css`: `562e186e0cb0e15bb9fc2177d1bc778d25999aa09e83d01fcaf807608189ce19`
- `service-worker.js`: `0463e3b47218ac675e345d5241c4d382f7c862c5f7ccc0732d25d6dd0540e052`
- `ui/prototypeBodyRegionVisuals.js`: `044d9a07dfda7cf01c6b98088892d2ef2f8a057595bf43fc3a9d68d637c039d4`

The runtime manifest and PWA hash expectations were aligned to the changed presentation/CSS hashes.

## 390 px targeted visual review

A 390 px static layout fixture using the current visual foundation/8B visual structure was reviewed.

Findings:

- regional card remains within the 390 px canvas;
- the understanding note remains within the canvas;
- previous / Reference-100 / current labels remain separated;
- the new note does not create horizontal overflow or a second competing visual;
- the note visually reads after the main comparison.

The available sandbox did not have a Playwright Chromium executable for a fresh browser screenshot in this batch, so this checkpoint does not replace the later final closure audit production-browser visual audit.

## Scientific boundary

No calculation, comparison-compatibility, ROF-J, Safety, persistence, or Meaning Core classification logic was changed.

This batch does not infer:

- diagnosis;
- injury risk;
- danger/safety;
- run/rest permission;
- training prescription;
- causality;
- cross-region ranking.

## Next meaning-driven visual mapping batch

Proceed one code at a time.

Next candidate:

- `CONDITION_AND_RESULT_CHANGED`
- visual pattern: Locate + Compare + a separated factual condition card
- no causal connector between condition and regional result.
