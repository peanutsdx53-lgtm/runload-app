# Interpretation Safety Stale-State Hotfix Audit

Date: 2026-09-21
Status: COMPLETE — PASS
Branch: `hotfix/interpretation-safety-stale-state-20260921`
Base main: `23c843391d8d36ea3e6288d3e86f23554efa863e`

## User-visible defect

A run record created after entering only ordinary run information could open the understanding flow in the support-priority path, showing:
- public support;
- share preparation;
- input review;

instead of the ordinary understanding flow.

## Root cause

The record form can restore prior draft / saved subjective fields.

The UI hides consultation/safety facts unless the current subjective status is `strong_reported`, but the save reader previously read safety checkboxes from FormData regardless of the current visible subjective status.

That allowed a previously retained safety flag to affect a later save while the flag was hidden.

## Fix

`ui/interactions/recordInputInteractions.js`:

- consultation/safety facts are active only when the current subjective status is `strong_reported`;
- otherwise every safety flag is written as `false`;
- hidden `unexpectedSymptom` is written as `false`;
- hidden consultation note is cleared;
- embedded body/consultation state is normalized when the record form initializes.

Explicit current input under `strong_reported` is preserved.

## Public wording correction

User-facing internal names were removed from the understanding flow.

Removed:
- `RunLoad解釈`
- `RUNLOAD INTERPRETATION`

Plain-language replacements include:
- `結果を理解する`
- `結果の確認`
- `今回の確認`
- `この読み方の根拠`

Updated surfaces:
- understanding room;
- body-region detail;
- history selected record;
- condition comparison return;
- contextual screen header / feature labels.

Internal route name `interpretation-room` remains implementation-only.

## Verification

### Exact current save-reader behavior

The current branch implementation of `readSubjectiveFeedback` was extracted and executed directly.

Results: **4/4 PASS**

- `deferred` + stale chest-pain flag → flag false, note cleared, status `not_asked`
- `none_reported` + stale breathing flag → flag false, status `none_reported`
- `discomfort_reported` + stale fainting flag → flag false
- `strong_reported` + explicit chest-pain flag → flag true, current note retained, status `reported`

### Source/runtime integrity

Current hotfix source checks: **23/23 PASS**

Included:
- safety facts gated by `strong_reported`;
- stale symptom/note gated;
- initialization normalization present;
- no public `RunLoad解釈` / `RUNLOAD INTERPRETATION` on audited understanding surfaces;
- plain-language contextual labels present;
- Service Worker hotfix revision present;
- all changed runtime SHA-256 entries match `RUNTIME_SHA256SUMS.txt`;
- PWA Presentation and Service Worker hash expectations match;
- protected calculation core unchanged;
- protected ROF-J core unchanged.

Dedicated regression:
- `tests/interpretationSafetyStaleStateHotfix.test.mjs`

## Protected cores

`core/runloadCore.js`
- `b47d1afdbb714c39c32868ed3aaf950f1aa2b71db0f98d3bca0112babc98adc8`
- unchanged

`core/secondPillarRofJ.js`
- `7ea31dbbbd03d5e74960ff0c7de53bc431536d743be6bc46fbf5ac8906063908`
- unchanged

## PWA

Service Worker runtime revision:
- `interpretation-safety-hotfix-v1`

Stable cache name remains unchanged. The Service Worker source change provides an update event so current runtime assets can replace cached versions.

## Release decision

Hotfix is approved for immediate merge to `main`.

Formal research Current packaging remains separate.
