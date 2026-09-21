# RunLoad Interpretation Experience — Baseline Audit

Date: 2026-09-21

## Decision

**PASS — the meaning-first interpretation baseline is established and reproducible.**

This is not a final UX/content freeze.

User acceptance at this checkpoint:
- the meaning-first direction is approved;
- the Interpretation Room should answer "what should I understand from this record?" rather than restating the Result screen;
- explanation content, presentation method, and the route by which users reach each explanation will continue to be refined in later stages.

Audited implementation head before audit-document-only commits:
- `afbc39ae988ffabbfd67e29ddc42b1bbafce52fa`

Audited base / current main:
- `8d2937c7bbfe3a7094601628a109d31309edd775`

PR #49 remains Draft. Formal Current remains untouched.

## Interpretation-experience role change

Previous verified baseline:
- result reorganization and connected Interpretation Room.

Interpretation-experience baseline:
- stored result;
- deterministic RunLoad meaning;
- concise supporting observations;
- relevant boundaries;
- alternative explanation representations when the first explanation is still unclear.

The default Summary no longer leads with 12-region counts.

It now leads with:
1. `今回の読み方`
2. `そう読める理由`
3. `この記録だけでは決められないこと`
4. `別の見方で確認`

Alternative representations:
- `簡単に見る`
- `図で見る`
- `違いだけ見る`
- `根拠を見る`

## Meaning Core

New structured deterministic meaning frame:
- primary meaning code;
- secondary meaning codes;
- fixed-order focus region;
- available explanation modes;
- structured facts used;
- relevant boundary codes.

Implemented primary meaning classes include:
- `SUPPORT_PRIORITY`
- `LIMITED_RESULT`
- `REPEATED_OBSERVATION`
- `CONDITION_AND_RESULT_CHANGED`
- `MULTI_LAYER_CHANGE`
- `CURRENT_SHIFT_WITH_HISTORY`
- `CURRENT_REFERENCE_PATTERN`
- `COMPARISON_BASELINE`

Key constraints:
- focus selection is not based on largest value or danger/risk ranking;
- repeated observations use explicit compatible-record counts, not trait language;
- condition and result changes are not interpreted causally;
- ROF-J remains a separate subjective-information layer;
- no diagnosis, injury-risk, safety, or run/no-run conclusion is generated.

## Explanation-mode behavior

### Simple
Three blocks:
- 今回わかること
- 前回と違うこと
- ここからは判断できないこと

### Visual
- one selected body region at a time;
- Reference-100, compatible previous value, and current value on one local comparison line;
- no visual cross-region ranking;
- ROF-J uses a separate 0–10 line.

### Difference
Changed items only:
- regional result difference;
- subjective fatigue difference;
- running-condition difference.

Regional and condition changes remain visually separate, with a non-causal boundary.

### Evidence
Existing persisted-evidence route retained.

## Visual findings and corrections

### Mobile Detail overflow
Carried forward from the previous verified baseline:
- wide table is contained by its own horizontal-scroll wrapper;
- page-level overflow remains resolved.

### Visual near-label overlap
Detected:
- compatible previous value 101 and Reference-100 produced overlapping labels at 390 px.

Correction:
- numerical marker positions remain unchanged;
- only nearby labels are deterministically staggered above/below the axis;
- regression test added;
- no scientific value or comparison semantics changed.

Corrected Presentation runtime SHA-256:
- `f6aead0c36a4daeecc9fea6153b2e68b635a36877ae5bde9bfa357fcc7b89eca`

## Final regression

Existing App Source verifier:
- **273 / 273 PASS**

Interpretation dedicated suites:
- Core V1: **24 / 24 PASS**
- Meaning V2: **13 / 13 PASS**
- Room Integration V1: **18 / 18 PASS**
- Launch Integration V1: **11 / 11 PASS**
- PWA Integration V1: **7 / 7 PASS**
- Experience V2: **11 / 11 PASS**

Combined:
- **357 / 357 PASS**

Syntax:
- GitHub/App runtime-test target: **86 JS/MJS files / 0 failures**
- local visual-audit working copy includes one additional local-only visual fixture, giving 87/87 syntax PASS there.

Runtime manifest:
- **79 / 79 SHA-256 matches** in the reconstructed audited runtime.

Protected cores:
- Primary calculation core SHA-256:
  `b47d1afdbb714c39c32868ed3aaf950f1aa2b71db0f98d3bca0112babc98adc8`
- ROF-J core SHA-256:
  `7ea31dbbbd03d5e74960ff0c7de53bc431536d743be6bc46fbf5ac8906063908`

GitHub compare against the audited base contains no changes to either protected core.

## GitHub / local identity

The following interpretation-experience files were confirmed byte-identical between the validated local audit copy and the feature branch by Git blob SHA:

- `core/interpretationCore.js`: `1484cb8e7e2829b8bff0ff0b322a2513ab155701`
- `ui/interpretationRoomPresentation.js`: `39a385710b3021ef37eae99263a3c222093066e3`
- `screens/interpretationRoomScreen.js`: `49e5d6d81dd513e8caf2c4439e1ef7fbf31739c0`
- `styles/interpretation-room.css`: `3997704fe17998fb4683866711cfc01ee282b41b`
- `tests/interpretationMeaningV2.test.mjs`: `7fe16486365d8eacfd19ea8144f66378d1041e1a`
- `tests/interpretationRoomIntegrationV1.test.mjs`: `ee52f3116cb5a1beb56073c546bb67df56f2ac33`
- `tests/interpretationExperienceV2.test.mjs`: `599f30645e5f8fc7505a0dc45782d6ca15420437`
- `tests/interpretationRoomPwaIntegrationV1.test.mjs`: `3f897c3a62b7f3a70bc769b69d5efdcbf057aafe`
- `RUNTIME_SHA256SUMS.txt`: `20d12aa5839d21e88b34cae95caca2b4c93ae076`

The earlier apparent Meaning V2 mismatch was resolved:
- `eec517d...` was the commit SHA of the file-creation commit, not its blob SHA;
- the correct local Git blob SHA is `7fe164...`, matching GitHub exactly.

## Scientific / product boundaries

PASS.

This baseline does not:
- modify Primary calculation coefficients or scientific geometry;
- modify ROF-J semantics;
- introduce a new safety/risk algorithm;
- infer diagnosis or injury probability;
- infer causation from condition/result co-change;
- rank different body regions by physical magnitude;
- create a new interpretation datastore;
- add generative AI or external API dependency.

## Status after this audit

The interpretation-experience implementation is now the **approved development baseline** for continued interpretation UX refinement.

Not frozen:
- exact wording;
- which explanation representation should be offered first in each context;
- amount of information shown at each step;
- visual hierarchy, color, diagram style;
- route/entry sequence;
- contextual transitions between Result, History, body-part detail, Simulation, and Interpretation Room.

Frozen unless separately authorized:
- protected scientific cores;
- Reference-100 meaning;
- strict compatible-history comparison boundary;
- ROF-J separation;
- existing support/safety precedence;
- no-causality / no-diagnosis / no-risk / no-run-permission boundaries.

## Release state

- PR #49: **Draft**
- main: unchanged
- formal Current: unchanged
- merge: not performed
- Current promotion: not performed

Next work should iterate on interpretation quality and navigation/presentation using this interpretation-experience baseline, then repeat regression and visual audit before any merge or Current promotion.
