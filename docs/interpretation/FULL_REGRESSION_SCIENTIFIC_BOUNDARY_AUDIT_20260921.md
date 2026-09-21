# RunLoad Interpretation Room — Full Regression and Scientific-Boundary Audit

Date: 2026-09-21

## Decision

**PASS — implementation logic, regression, scientific-boundary, runtime-integrity, and PWA/static integration audit.**

Audited implementation head before audit-document-only commits:
- `4b0230dda4c57f2d7c22244c1c6a1e3b89869935`

Audited base:
- `8d2937c7bbfe3a7094601628a109d31309edd775`

Main remained at the audited base during this audit. PR #49 remained draft. Formal Current was not modified.

## Findings corrected during full-regression checkpoint

### 1. Runtime manifest Home mismatch

Detected:
- live `screens/homeScreen.js` SHA-256: `8a1bea7b7d85698487e2417ea1ccb6c31afb3128a05253475b270c2f27ec83b1`
- stale manifest value: `0d1f3d56751e19c427397d35865b038c21b350216688b435457d04cc3d830ae6`

Correction:
- commit `3551bb7d56381fd7616653fdfd97e60b562d7b6e`

### 2. Interpretation Room presentation syntax defect

Detected:
- literal backslash+n sequence in executable JavaScript immediately after the Simulation `from` parameter assignment
- pre-fix Presentation SHA-256: `f582f4b6d29a1f45885d179c5a1688545581b9563f765089951d9c74b44d07d7`

Correction:
- replace the literal `\\n` with an actual line break only
- commit `4490622cab7fbf1be5a806b6a6893dd6346c9ce1`
- repaired Presentation SHA-256: `956d92781c64d0898a014a9bf57f568367dd228206e01698dcc81de891fdf49f`

Manifest refresh:
- commit `30269ea4bf142ec53a04cd13adcda2ba2f70d447`

### 3. Dedicated-test contract follow-up

Two dedicated tests still referred to pre-fix/pre-copy state.

Corrections:
- Home launch wording contract aligned with current public copy: commit `61a5b17e93401be1d80a4885abc88b3388167894`
- PWA test Presentation SHA aligned with repaired runtime: commit `4b0230dda4c57f2d7c22244c1c6a1e3b89869935`

No protected calculation logic was changed by any full-regression checkpoint correction.

## Final regression result

Audited App Source was reconstructed from `RunLoad_Current_App_Source_20260920.zip` plus the feature-branch runtime.

Existing App Source regression, after updating the two App-Source-only legacy test contracts to the new canonical route behavior:
- **273 / 273 PASS**

Dedicated Interpretation suites:
- Interpretation Core V1: **24 / 24 PASS**
- Interpretation Room Integration V1: **18 / 18 PASS**
- Interpretation Room Launch Integration V1: **11 / 11 PASS**
- Interpretation Room PWA Integration V1: **7 / 7 PASS**

Combined:
- **333 / 333 PASS**

Syntax:
- **84 JS/MJS files / 0 failures**

## Runtime integrity

Runtime manifest:
- **79 entries**
- reconstructed runtime: **79 / 79 SHA-256 matches**
- audited-base unchanged runtime entries retained their audited values
- changed/new runtime entries matched the live feature branch

Key SHA-256 values:
- `core/interpretationCore.js`: `e04eb0f1e8e0655c4cc0fb08a264d59aa393655a850cf8ce8458bfbba31d64f8`
- `ui/interpretationRoomPresentation.js`: `956d92781c64d0898a014a9bf57f568367dd228206e01698dcc81de891fdf49f`
- `screens/homeScreen.js`: `8a1bea7b7d85698487e2417ea1ccb6c31afb3128a05253475b270c2f27ec83b1`
- `service-worker.js`: `604a1e3f9e03d0fc1566f51bd3457d67bd8a106e1978855356dd5ee000c44771`

Protected cores remained byte-identical:
- Primary calculation core: `b47d1afdbb714c39c32868ed3aaf950f1aa2b71db0f98d3bca0112babc98adc8`
- ROF-J core: `7ea31dbbbd03d5e74960ff0c7de53bc431536d743be6bc46fbf5ac8906063908`

GitHub compare against the audited base contained no changes to either protected core.

## Scientific-boundary audit

PASS.

Confirmed:
- current regional values are consumed from persisted results; Interpretation Core does not recalculate the protected model
- historical regional comparisons require matching region/model/output-semantic/construct/reference signatures
- future records are excluded from past comparison
- condition differences are factual differences only
- simultaneous condition/result differences explicitly trigger a non-causal boundary
- no diagnosis output
- no injury-risk output
- no safety or run/no-run decision derived from regional or ROF values
- no cross-region physical ranking
- ROF-J remains a separate subjective-information layer
- existing support/safety decision has precedence over normal Simulation/Plan routing
- high regional values alone do not escalate Safety
- evidence display uses persisted provenance and explicitly avoids a complete-bibliography claim
- no unconstrained free-text interpretation was introduced
- no new Interpretation Room storage namespace or persistent datastore was introduced
- no new network/API call was introduced by Interpretation Core/Room

## Public wording audit

PASS.

Confirmed:
- formal, concise choice wording
- no colloquial/tameguchi-style prompts in the Interpretation Room
- no recommendation wording used as an interpretation conclusion
- causal, diagnostic, danger, safety, and run-permission terms appear only in explicit limitation/boundary contexts
- evidence heading is `この数値の基礎となる資料`, not a claim that every calculation source is exhaustively listed

## Existing-screen / navigation audit

PASS.

Confirmed:
- no sixth bottom-navigation destination
- Result reuses the existing result-use position
- Home reuses the existing when-needed position
- Body-region detail and History use compact contextual launch points
- `#/activation` remains compatibility-only and resolves to Interpretation Room
- Simulation preserves the selected saved record and return origin when entered from Interpretation Room
- ordinary bottom navigation and feature menu are omitted in immersive Interpretation Room mode

## PWA / CSP audit

PASS.

Confirmed:
- Interpretation runtime resources are precached
- retired Activation screen is not in active precache
- stable cache name retained
- activate phase removes stale same-cache resources
- existing same-origin CSP supports the new external JS/CSS
- no CSP relaxation and no new inline script

## App Source packaging requirement

The public GitHub runtime does not contain the pre-existing 273-test App Source suite. When a new formal App Source / Current package is produced, the following must be carried forward:

1. update the result/history integration test so the result-use contract expects `#/interpretation-room?...&origin=result` instead of the old Activation screen;
2. update the release-audit integration test so Activation is validated as a compatibility alias and `renderActivationScreen` is absent;
3. include the four new Interpretation test suites;
4. regenerate the App Source verification result and runtime SHA manifest;
5. re-run the full packaged-copy verification before Current promotion.

These test-contract edits do not alter runtime behavior.

## Automated visual / mobile audit

A later network-free Playwright `set_content` route successfully rendered the production Presentation output with production CSS, avoiding the environment's local/file navigation restriction.

Audit record:
- `docs/interpretation/VISUAL_MOBILE_AUDIT_20260921.md`

Viewports:
- mobile: 390 × 844
- desktop: 1280 × 900

Views:
- Summary
- Detail
- Evidence
- Next
- contextual launch points on Home / Result / Body-part detail / History

Finding:
- the mobile Detail table initially expanded the page from 390 px to 666 px;
- corrected by adding `min-width: 0` to the Interpretation Room grid/table containment chain;
- CSS correction commit: `8d00e8883f977832eb9fde54a2329670f836b07b`;
- corrected stylesheet SHA-256: `89a45320c3a8a1f580627c37549d62c15d5c68ee9cdfcbc912bc5c6d719c7033`;
- post-fix all four Room views have no page-level horizontal overflow at 390 px or 1280 px;
- the Detail table now scrolls only inside its intended wrapper.

Post-fix regression:
- existing App Source: **273/273 PASS**
- Interpretation Core: **24/24 PASS**
- Interpretation Room Integration: **18/18 PASS**
- Launch Integration: **11/11 PASS**
- PWA Integration: **7/7 PASS**
- combined: **333/333 PASS**
- syntax: **84/84 PASS**
- runtime manifest: **79/79 PASS**

Automated visual/mobile layout audit is therefore **PASS**. User-visible acceptance remains the final pre-merge/pre-Current gate.

## Final state

- Durable restart mechanism: COMPLETE
- Interpretation Core implementation: COMPLETE
- Independent room route/presentation: COMPLETE
- Existing-screen launch compatibility: COMPLETE
- PWA/runtime integration: COMPLETE
- full-regression checkpoint: **COMPLETE — PASS**
- PR #49: keep **Draft** until user visual/functional acceptance
- main: unchanged
- formal Current: unchanged
