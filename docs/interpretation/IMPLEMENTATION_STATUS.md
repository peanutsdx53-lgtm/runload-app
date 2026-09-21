# RunLoad Interpretation Room — Implementation Status

Date: 2026-09-21
Status: STAGE 8 UNDERSTANDING-FOCUSED VISUAL WORK PLAN APPROVED — IMPLEMENTATION NOT YET STARTED
Branch: `feature/runload-interpretation-room-v1`
Draft PR: #49
Base commit: `8d2937c7bbfe3a7094601628a109d31309edd775`

## Resume protocol

This file is the durable restart point for implementation. If work resumes in another ChatGPT conversation, read this file first, then inspect PR #49, the branch head, and changed files before making any edits.

Do not rely on prior chat history. Use the branch state and this ledger as the implementation truth.

## Authority and protected baselines

Top-level Current authority:
- `RunLoad_CURRENT_COMPLETE_20260920.zip`
- SHA-256: `74524651f6b7561ba6165b77b492c327223ba371d1363f6f1335ce4799480fc8`

Operational App Source:
- `RunLoad_Current_App_Source_20260920.zip`
- SHA-256: `05f42f59bffb657cb0df8f9b2f86768959e149ae48af54369fa900711a7c03b9`

Protected calculation core:
- SHA-256: `b47d1afdbb714c39c32868ed3aaf950f1aa2b71db0f98d3bca0112babc98adc8`

Protected ROF-J core:
- SHA-256: `7ea31dbbbd03d5e74960ff0c7de53bc431536d743be6bc46fbf5ac8906063908`

These protected cores must remain byte-identical throughout this feature branch.

## Controlling pre-code design

Controlling candidate:
- `RunLoad_Interpretation_Room_Design_Authority_V1.1_Candidate_20260920.md`

Supporting specifications:
- Core Data Contract V0.2
- Core Rule Matrix V0.2
- Room UI/Navigation Spec V0.2
- Implementation Mapping V0.1
- Test Specification V0.1
- Public Wording Catalog V0.1
- Pre-Code Readiness V1.0

Key frozen decisions:
1. Interpretation Room is an independent route/room, not a large card added to existing screens.
2. Interpretation-first: opening the room immediately presents a deterministic RunLoad interpretation when a valid record exists.
3. Interpretation Core is read-only and deterministic.
4. Use current + compatible past results; never compare incompatible signatures.
5. Keep regional Reference-100, ROF-J, subjective records, and factual conditions semantically separate.
6. Existing Safety/support decision outranks ordinary interpretation/navigation.
7. Do not infer diagnosis, injury risk, causality, safety, or run/no-run decisions.
8. Evidence display may cite saved calculation basis and relevant research background, but must not claim a complete list of every source used by the calculation unless such provenance is explicitly persisted.
9. V1 has no generative-AI free text and no Notebook revival.
10. Existing `nextCheckPoint` may be read/reused; do not create a new notebook-like datastore.
11. Old `#/activation` remains compatible through alias/redirect behavior.
12. Public wording is formal, concise, non-colloquial, and non-abstract.

## Stage ledger

### Stage 0 — Durable restart mechanism
Status: COMPLETE
- [x] Dedicated implementation branch created from audited main baseline.
- [x] Durable status ledger added to the branch.
- [x] Draft PR #49 opened as an additional durable anchor.
- Branch bootstrap commit: `397e0e78854116e28b97fa6ca813ce622697e458`

### Stage 1 — Interpretation Core domain implementation
Status: COMPLETE
Implemented:
- [x] `core/interpretationCore.js`
- [x] stable chronology using `date|createdAt|id`
- [x] strict comparison-signature compatibility
- [x] Reference-100 display direction rules
- [x] previous-record delta rules
- [x] latest-five comparable regional history
- [x] fixed-order compact region selection with no magnitude ranking
- [x] descriptive condition-difference projection
- [x] ROF-J pass-through interpretation without recreating eligibility
- [x] persisted-evidence projection with incomplete-trace boundary
- [x] existing support/safety route precedence
- [x] deterministic destination/action projection
- [x] read-only/no-recalculation behavior
- [x] dedicated unit suite `tests/interpretationCoreV1.test.mjs`

Commits:
- Core: `98faf526165a5078e0a783aabe77aa705befa121`
- Tests: `f9fe57cd46530df952726c5d6044723a5d176007`
- Existing next-check exposure: `58847ab13b0ec5c31ca103978e61eb88b471b686`
- Existing next-check coverage: `c23c845e01546adee275e575e016b9a4c93e4ad1`

Local verification against audited App Source:
- Interpretation Core dedicated suite: **24/24 PASS**
- Existing baseline verifier: **273/273 PASS**
- Existing suites: **17/17 PASS**
- JS/MJS syntax scan: **79 files / 0 failures**
- current `core/interpretationCore.js` SHA-256 after existing-next-check exposure: `e04eb0f1e8e0655c4cc0fb08a264d59aa393655a850cf8ce8458bfbba31d64f8`
- current dedicated test SHA-256 after next-check coverage: `91e9eb39e47d6795ce4d3e4d42f360a288a541e1a3846cf997867f6f6c92fd4f`
- protected Primary core SHA unchanged
- protected ROF-J core SHA unchanged

### Stage 2 — Independent Room route and presentation
Status: COMPLETE
Implemented:
- [x] canonical `interpretation-room` route
- [x] Interpretation-first summary view
- [x] detail / evidence / next views
- [x] guided first level limited to four choices
- [x] ROF-J and regional outputs kept as separate information layers
- [x] compatible-history display only
- [x] factual condition-difference display with explicit non-causal boundary
- [x] persisted-evidence view with incomplete-bibliography boundary
- [x] existing support/safety route precedence in the Room
- [x] existing `nextCheckPoint` display without new storage
- [x] contextual return handling for result/history/body-part-detail/simulation/home
- [x] immersive shell with ordinary bottom navigation and feature menu omitted
- [x] dedicated integration suite `tests/interpretationRoomIntegrationV1.test.mjs`

Stage 2 commits:
- Presentation: `a93992d422e6dafc681c6416e3abb46a395ec947`
- Screen: `835464623dd901a4694a77070f78d8842d14402d`
- Styles: `baf3f455da1a02c41cba30d4c286d3786ea475c8`
- App route: `5b134a41a948419c09f181965fc83f0d4b03f0ce`
- Screen architecture: `5684463624993be716c40c16a8f4404fc3eb361a`
- Immersive shell: `885096c8ea754a8a5f8cfe7bad7a7313815699c8`
- Stylesheet declaration: `6d5a2e3b43806fe9e1c8f3914c1a828ef9fc82a3`
- Integration tests: `73fd02a92ebb58354bf4d1625da39c5986698f6b`

Verification against audited App Source:
- Interpretation Room integration suite: **17/17 PASS**
- Interpretation Core suite: **24/24 PASS**
- Existing baseline verifier: **273/273 PASS**
- JS/MJS syntax scan: **80 files / 0 failures**
- protected Primary core SHA unchanged
- protected ROF-J core SHA unchanged
- Stage 2 integration test SHA-256: `49bf0addf2e6f77db9061764a9df81a25ffa43352fa13b916083b023761b48d2`
- branch compare to audited base contains no changes to protected calculation cores

### Stage 3 — Existing-screen launch points and legacy activation compatibility
Status: COMPLETE
Implemented:
- [x] Result compact launch point reuses the existing result-use slot and opens RunLoad Interpretation
- [x] Home reuses the existing result-use slot without adding a large card
- [x] Body-part detail adds a compact contextual RunLoad Interpretation launch
- [x] History selected-record detail adds a compact contextual launch
- [x] Simulation preserves the selected source record when entered from RunLoad Interpretation
- [x] Simulation preserves the Interpretation Room return context across course-selection round trips
- [x] legacy `#/activation` is retained only as a compatibility alias to `interpretation-room`
- [x] duplicate public Activation renderer/menu/workspace entry retired
- [x] dedicated launch integration suite `tests/interpretationRoomLaunchIntegrationV1.test.mjs`

Stage 3 commits:
- Result launch: `288bc2c773b99acb5263caff9458d8db5a7cfa91`
- Home launch: `4c38ce85a431732ceeb5f88ec9a2ccd360fb91e0`
- Body-region launch: `c7d81cc86170eb3420cbfc701760fe264b3b6402`
- History launch: `2b78c250a166c3f6955e210ac564a142df6e96d7`
- Simulation source-record preservation: `2b8dd1a002aef4d81646984218420991e6727dfe`
- Interpretation→Simulation origin preservation: `6f881716471739889553bb83f32ca88bd47e696f`
- Public navigation replacement: `e45197abf3a69c26ae32c27f0b14c5ca414312b7`
- Activation compatibility alias: `d29451349636cb758b9da6a3bf60b0122e6e8f7c`
- App-shell stale-label removal: `6bf9d79d8074d41a505d486f25e96c95dfcabf1a`
- Launch integration tests: `ebb91c187def689dd8681376f54570b4cc3d7b29`

Verification against audited App Source:
- Interpretation Room launch integration suite: **11/11 PASS**
- Interpretation Room integration suite: **17/17 PASS**
- Existing baseline verifier: **273/273 PASS**
- JS/MJS syntax scan: **81 files / 0 failures**
- protected Primary core SHA unchanged: `b47d1afdbb714c39c32868ed3aaf950f1aa2b71db0f98d3bca0112babc98adc8`
- protected ROF-J core SHA unchanged: `7ea31dbbbd03d5e74960ff0c7de53bc431536d743be6bc46fbf5ac8906063908`
- Stage 3 launch integration test SHA-256: `5dea4ad98ae1c7e0d91b1e31cb289d99932db046db328b3cae249b9718acaf90`

### Stage 4 — PWA/runtime integration
Status: COMPLETE
Implemented:
- [x] Interpretation Core added to Service Worker precache
- [x] Interpretation Room screen added to Service Worker precache
- [x] Interpretation Room presentation module added to Service Worker precache
- [x] Interpretation Room stylesheet added to Service Worker precache
- [x] retired Activation screen removed from active precache
- [x] stable cache identifier `runload-app-current` retained
- [x] activate phase now prunes stale resources that remain inside the same cache name
- [x] `RUNTIME_SHA256SUMS.txt` regenerated from the feature branch runtime state (79 entries)
- [x] existing CSP supports the new same-origin external JS/CSS; no CSP relaxation or inline script was added
- [x] dedicated PWA/runtime suite `tests/interpretationRoomPwaIntegrationV1.test.mjs`

Stage 4 commits:
- PWA cache integration: `6f909cbcdac867a67e8399fa629ff21c8f754206`
- Runtime SHA-256 manifest: `0a6a411b539d2ce3dc9c6b7f3ff14004a7b3dcbd`
- PWA integration tests: `4b8aa58b2411c5c10ae3492ba5e76ebc473e40bd`

Verification:
- Interpretation Room PWA integration suite: **7/7 PASS**
- Service Worker syntax: **PASS**
- Service Worker SHA-256: `604a1e3f9e03d0fc1566f51bd3457d67bd8a106e1978855356dd5ee000c44771`
- runtime manifest contains current Interpretation Core SHA-256 `e04eb0f1e8e0655c4cc0fb08a264d59aa393655a850cf8ce8458bfbba31d64f8`
- branch compare against audited base shows **no changes** to protected Primary or ROF-J core files
- Stage 3 full baseline regression remains **273/273 PASS**; final combined regression is reserved for Stage 5

### Stage 5 — Full regression and scientific-boundary audit
Status: **COMPLETE — PASS**

Durable audit record:
- `docs/interpretation/STAGE5_FINAL_AUDIT_20260921.md`
- audited implementation head before audit-document-only commits: `4b0230dda4c57f2d7c22244c1c6a1e3b89869935`

Corrections made during Stage 5:
- Home runtime-manifest mismatch corrected: `3551bb7d56381fd7616653fdfd97e60b562d7b6e`
- Presentation literal-`\\n` syntax defect corrected: `4490622cab7fbf1be5a806b6a6893dd6346c9ce1`
- repaired Presentation runtime SHA recorded: `30269ea4bf142ec53a04cd13adcda2ba2f70d447`
- Home launch test wording contract aligned: `61a5b17e93401be1d80a4885abc88b3388167894`
- PWA test repaired-Presentation SHA aligned: `4b0230dda4c57f2d7c22244c1c6a1e3b89869935`

Final verification:
- existing App Source regression: **273/273 PASS**
- Interpretation Core V1: **24/24 PASS**
- Interpretation Room Integration V1: **18/18 PASS**
- Interpretation Room Launch Integration V1: **11/11 PASS**
- Interpretation Room PWA Integration V1: **7/7 PASS**
- combined assertions: **333/333 PASS**
- JS/MJS syntax: **84 files / 0 failures**
- runtime manifest: **79/79 SHA-256 matches in reconstructed audited runtime**
- protected Primary core SHA unchanged: `b47d1afdbb714c39c32868ed3aaf950f1aa2b71db0f98d3bca0112babc98adc8`
- protected ROF-J core SHA unchanged: `7ea31dbbbd03d5e74960ff0c7de53bc431536d743be6bc46fbf5ac8906063908`
- GitHub compare contains no protected-core changes
- scientific boundaries: PASS
- public wording boundary: PASS
- no new persistent Interpretation datastore
- no generative-AI/free-text implementation
- no new Interpretation network/API dependency
- PWA/CSP/static-resource audit: PASS

Visual acceptance:
- automated production-CSS rendering was completed using a network-free Playwright `set_content` route;
- mobile/desktop Summary, Detail, Evidence, and Next views were checked;
- existing-screen launch points on Home, Result, Body-part detail, and History were checked;
- one mobile Detail horizontal-overflow defect was found and corrected;
- post-fix automated visual/mobile layout audit: **PASS**;
- durable visual audit: `docs/interpretation/VISUAL_MOBILE_AUDIT_20260921.md`;
- user-visible acceptance remains the final pre-merge/pre-Current gate.

App Source packaging note:
- when formal App Source/Current is regenerated, update the two App-Source-only legacy test contracts (Stage4 Result-use and Stage6 route alias), include all four new Interpretation suites, regenerate verification metadata, and re-run packaged-copy verification.
## Resolved Stage 5 safe-stop findings

The earlier Stage 5 safe stops were resolved under explicit user authorization:
- runtime Home hash mismatch: corrected and reverified;
- Presentation literal-`\\n` syntax defect: corrected and reverified;
- dedicated test expectations affected by those corrections: aligned and re-run.

See `docs/interpretation/STAGE5_FINAL_AUDIT_20260921.md` for the final audit trail.

## Stage 6 — Interpretation Experience Upgrade
Status: **BASELINE COMPLETE — PASS**

Controlling delta:
- `docs/interpretation/STAGE6_INTERPRETATION_EXPERIENCE_DESIGN_20260921.md`

Durable audit:
- `docs/interpretation/STAGE6_BASELINE_AUDIT_20260921.md`

User-approved direction:
- Interpretation must answer what the user should understand from the record, not merely reorganize Result-screen values.
- The current Stage 6 implementation is accepted as the development baseline.
- Exact interpretation content, presentation method, and the route/sequence used to reach explanations remain intentional future refinement areas.

Implemented:
- [x] structured deterministic Meaning Core
- [x] meaning-first Summary: `今回の読み方`
- [x] supporting observations: `そう読める理由`
- [x] relevant limitation block: `この記録だけでは決められないこと`
- [x] alternative representation routes: Simple / Visual / Difference / Evidence
- [x] single-region Reference-100 visual with no cross-region ranking
- [x] separate ROF-J 0–10 visual
- [x] condition/result non-causal boundary
- [x] repeated-observation explicit-count wording
- [x] nearby visual-label staggering at mobile width
- [x] no new persistence, external API, or generative AI
- [x] protected Primary and ROF-J cores unchanged

Final verification:
- existing App Source verifier: **273/273 PASS**
- Interpretation Core: **24/24 PASS**
- Meaning V2: **13/13 PASS**
- Room Integration: **18/18 PASS**
- Launch Integration: **11/11 PASS**
- PWA Integration: **7/7 PASS**
- Experience V2: **11/11 PASS**
- combined: **357/357 PASS**
- GitHub/App JS/MJS syntax target: **86/86 PASS**
- reconstructed runtime manifest: **79/79 PASS**
- protected Primary core SHA unchanged: `b47d1afdbb714c39c32868ed3aaf950f1aa2b71db0f98d3bca0112babc98adc8`
- protected ROF-J core SHA unchanged: `7ea31dbbbd03d5e74960ff0c7de53bc431536d743be6bc46fbf5ac8906063908`
- GitHub compare contains no protected-core changes
- principal Stage 6 GitHub files were byte-verified against the validated local audit copy

Meaning V2 SHA clarification:
- previous apparent mismatch was not a file mismatch;
- `eec517d...` was a commit SHA;
- correct Git blob SHA is `7fe16486365d8eacfd19ea8144f66378d1041e1a`, identical locally and on GitHub.

Release state:
- PR #49 remains Draft
- main remains at audited base
- formal Current remains untouched
- no merge or Current promotion has been performed

## Stage 7 — Guided Interpretation Dialogue
Status: **BASELINE COMPLETE — PASS**

Controlling design:
- `docs/interpretation/STAGE7_GUIDED_DIALOGUE_DESIGN_20260921.md`

Durable audit:
- `docs/interpretation/STAGE7_GUIDED_DIALOGUE_AUDIT_20260921.md`

User-approved direction:
- do not expose many interpretation items at once;
- narrow what the user wants to know through a chat-like deterministic sequence;
- keep interpretation support and downstream-function bridging clearly separated;
- use existing History / Simulation / Plan / Consultation / Reading / Support instead of recreating them inside Interpretation Room.

Implemented:
- [x] ordinary entry reduced to one primary interpretation + exactly two intent choices
- [x] `この結果を理解したい` → at most three representation choices
- [x] `次にどう活かすか考えたい` → History / Simulation / next-use bridge step
- [x] next-use → Plan / Consultation / Reading only
- [x] existing `nextCheckPoint` deferred until the next-use context
- [x] Evidence moved downstream from explanation rather than competing at entry
- [x] legacy `view=next` compatibility resolves to narrow management dialogue
- [x] no free-text chat, AI avatar, typing simulation, persistent conversation history, or external API
- [x] downstream functions are linked, not duplicated
- [x] Support precedence retained
- [x] scientific boundaries unchanged

Final verification:
- existing App Source verifier: **273/273 PASS**
- Interpretation Core: **24/24 PASS**
- Meaning V2: **13/13 PASS**
- Room Integration: **18/18 PASS**
- Launch Integration: **11/11 PASS**
- PWA Integration: **7/7 PASS**
- Experience V2: **11/11 PASS**
- Guided Dialogue V1: **14/14 PASS**
- combined: **371/371 PASS**
- reconstructed runtime manifest: **79/79 PASS**
- local reconstructed App Source syntax including local visual fixtures: **89/89 PASS**
- protected Primary core SHA unchanged: `b47d1afdbb714c39c32868ed3aaf950f1aa2b71db0f98d3bca0112babc98adc8`
- protected ROF-J core SHA unchanged: `7ea31dbbbd03d5e74960ff0c7de53bc431536d743be6bc46fbf5ac8906063908`
- GitHub compare contains no protected-core changes
- principal Stage 7 GitHub files byte-match the validated local audit copy

Visual audit:
- 390 px and 1280 px;
- entry / understand / manage / next-use / simple / visual / difference;
- page-level horizontal overflow: **0** for every audited view;
- ordinary choice counts: 2 / 3 / 3 / 3 / 2 / 2 / 2 respectively;
- unrelated scientific-boundary repetition was removed from manage/next-use steps after visual review.

Release state:
- PR #49 remains Draft
- main remains at audited base
- formal Current remains untouched
- no merge or Current promotion has been performed

## Stage 8 — Understanding-Focused Visual Interpretation
Status: **STAGE 8B IN PROGRESS — FOUR PRIMARY MEANING PATTERNS MAPPED AND VERIFIED**

Controlling work plan:
- `docs/interpretation/STAGE8_UNDERSTANDING_VISUAL_WORKPLAN_20260921.md`

Mandatory distinction:
- Result screen = display recorded/result information.
- Interpretation engine = help users understand what to look at, how to read it, what can be understood, what cannot be determined, and what to check next.
- Interpretation must not become a second Result screen.

User-approved direction:
- pursue an understanding-specialized Interpretation experience;
- go several explanatory steps deeper than Result;
- upgrade figures/diagrams rather than only adding prose;
- use motion when it communicates meaning;
- examples include arrows that grow to show direction and one-time focus glow for the item being explained;
- keep progressive disclosure and avoid information overload.

Implementation principles:
- one main interpretation + one main visual per ordinary step;
- normally two choices, never more than three ordinary choices;
- focus one region/information layer at a time;
- regional Reference-100 and ROF-J remain separate visual scales;
- no cross-region ranking;
- no danger/safety/goodness meaning from ordinary emphasis colors;
- use normal accent color for focus, not danger red;
- motion must never loop or flash;
- reduced-motion mode must show the same information in a static final state;
- reuse existing `ui/prototypeBodyRegionVisuals.js`, `ui/uiMotion.js`, and theme tokens;
- do not add an animation library or external asset dependency unless separately authorized;
- downstream History / Simulation / Plan / Consultation / Reading functions remain separate and are only bridged to.

Planned sequence:
- Stage 8A: first reusable visual batch — **implemented**: one body-region focus, local previous/Reference-100/current direction, one-time accent emphasis, reduced-motion static equivalent. ROF-J remains separate and unchanged in this batch;
- Stage 8B: map Meaning Core codes to visual explanation patterns;
- Stage 8C: integrate visuals into the Stage 7 guided dialogue;
- Stage 8D: strengthen explanation → next self-management observation/function bridge;
- Stage 8E: mobile/desktop/theme/dark/reduced-motion visual audit + full regression.

Stage 8 work-order rule:
1. identify the exact comprehension problem;
2. select one Meaning Core context;
3. select one visual transformation;
4. define what the motion means;
5. define the reduced-motion end state;
6. implement only that batch;
7. run regression and visual review;
8. record findings before the next batch.

Baseline before Stage 8:
- Stage 7 guided dialogue: **371/371 PASS**
- runtime manifest: **79/79 PASS**
- protected Primary and ROF-J cores unchanged
- PR #49 remains Draft
- main and formal Current remain untouched

## Stage 8A first-batch checkpoint — 2026-09-21

Durable audit:
- `docs/interpretation/STAGE8A_VISUAL_FOUNDATION_AUDIT_20260921.md`

Implemented:
- one selected body region is located using the existing prototype body-region visual definitions;
- non-selected paths are muted and the focus region uses the ordinary theme accent;
- the local comparison shows previous → current when strict compatible history exists;
- when compatible previous is unavailable, the visual correctly falls back to Reference-100 → current;
- the arrow communicates comparison direction only;
- one-time focus/current emphasis is short and non-looping;
- Reduced Motion shows the same final focus, markers and complete arrow with no animation;
- the existing ROF-J 0–10 visual remains a separate scale;
- the reused body-region visual module is included in the PWA precache set.

Verification at this checkpoint:
- pre-Stage-8 durable branch baseline: 371/371 PASS;
- audited Current/local baseline verification: 273/273 PASS, 17 suites, 77 syntax files, 0 syntax failures;
- current Stage 8A production-source focused checks: 8/8 PASS;
- current Stage 7/Stage 6/Stage 8A/PWA cross-surface checks: 15/15 PASS;
- 390 px render: viewport 390 px / scroll width 390 px, no horizontal overflow;
- comparison label overlap count: 0;
- exactly one body region focused;
- Reduced Motion: arrow final state visible immediately, focus/current animations disabled;
- protected Primary SHA-256 unchanged: `b47d1afdbb714c39c32868ed3aaf950f1aa2b71db0f98d3bca0112babc98adc8`;
- protected ROF-J SHA-256 unchanged: `7ea31dbbbd03d5e74960ff0c7de53bc431536d743be6bc46fbf5ac8906063908`.

Important verification boundary:
- the 273/273 result is the independently verified audited Current/main baseline, not a claim that the full feature branch was rerun locally;
- the full Stage 8E regression remains a later mandatory gate.

Release state:
- PR #49 remains intended to stay Draft;
- no merge to main has been performed;
- formal Current remains untouched;
- Stage 8B has not started.

## Stage 8B mapping checkpoint — CURRENT_SHIFT_WITH_HISTORY

User acceptance:
- Stage 8A static visual was accepted as a compromise-line baseline and Stage 8B was authorized to proceed.

Durable audit:
- `docs/interpretation/STAGE8B_CURRENT_SHIFT_AUDIT_20260921.md`

Mapped:
- `CURRENT_SHIFT_WITH_HISTORY` → Locate + Compare;
- one body region only;
- strict compatible previous → current;
- Reference-100 remains visible as the local regional reference;
- one short `この図で分かること` sentence;
- ROF-J is intentionally omitted from this step even if available, because it is not the primary meaning here.

Verification:
- focused production-source checks: **11/11 PASS**;
- target code uses `data-visual-pattern="locate-compare"`;
- unmapped Meaning Core codes remain on general visual behavior;
- Stage 7 two-choice entry remains unchanged;
- no new route or downstream-function duplication;
- runtime hash manifest and PWA hash contract updated for the changed presentation/CSS;
- targeted 390 px layout review found no new horizontal-layout issue;
- fresh production-browser visual audit remains reserved for Stage 8E.

## Stage 8B mapping checkpoint — CONDITION_AND_RESULT_CHANGED

Durable audit:
- `docs/interpretation/STAGE8B_CONDITION_RESULT_AUDIT_20260921.md`

Mapped so far:
- `CURRENT_SHIFT_WITH_HISTORY` → Locate + Compare;
- `CONDITION_AND_RESULT_CHANGED` → Locate + Compare + separated factual condition card.

Condition/result mapping rules:
- condition card is visually separate;
- at most two condition labels are shown, with `ほかN件` summary when needed;
- no line, arrow, or motion connects condition and regional result;
- one explicit sentence states that co-change does not establish cause;
- ROF-J is not mixed into this primary step.

Verification:
- condition/result focused checks after correcting one false-positive test expression: **9/9 PASS**;
- targeted 390 px layout review: no new horizontal-layout issue;
- `CURRENT_SHIFT_WITH_HISTORY` regression remained intact;
- `MULTI_LAYER_CHANGE` remains unmapped/general at this checkpoint;
- runtime/PWA hash contracts updated.

## Stage 8B mapping checkpoint — MULTI_LAYER_CHANGE

Durable audit:
- `docs/interpretation/STAGE8B_MULTI_LAYER_AUDIT_20260921.md`

Mapped so far:
- `CURRENT_SHIFT_WITH_HISTORY` → Locate + Compare;
- `CONDITION_AND_RESULT_CHANGED` → Locate + Compare + separated factual condition card;
- `MULTI_LAYER_CHANGE` → regional lane + separate ROF-J lane.

Multi-layer rules:
- explicit `情報1 · 部位別結果` and `情報2 · 主観情報`;
- static `別の尺度` separator;
- no inter-layer arrow or causal connector;
- one understanding note;
- regional Reference-100 and ROF-J 0–10 remain separate.

Verification:
- multi-layer focused checks: **10/10 PASS**;
- prior Stage 8B mappings remained intact;
- targeted 390 px layout review found both lanes inside the canvas;
- runtime/PWA hash contracts updated.

## Stage 8B mapping checkpoint — REPEATED_OBSERVATION

Durable audit:
- `docs/interpretation/STAGE8B_REPEATED_OBSERVATION_AUDIT_20260921.md`

Mapped so far:
- `CURRENT_SHIFT_WITH_HISTORY` → Locate + Compare;
- `CONDITION_AND_RESULT_CHANGED` → Locate + Compare + separated condition card;
- `MULTI_LAYER_CHANGE` → separate regional / ROF-J lanes;
- `REPEATED_OBSERVATION` → Locate + explicit compatible-record count visual.

Repeated-observation rules:
- fixed-size record points;
- explicit `過去N件のうちM件`;
- no comparison arrow;
- no motion intensity based on count;
- explicit no-trait/no-future-inference boundary.

Verification:
- repeated-observation focused checks: **10/10 PASS**;
- prior Stage 8B mappings remained intact;
- targeted 390 px layout review showed the fixed-size count visual inside the canvas;
- runtime/PWA hash contracts updated.

## Current next action

Continue Stage 8B with **one Meaning Core code only**:

- `CURRENT_REFERENCE_PATTERN`;
- Locate + Reference-100 → current;
- no previous marker when compatible previous is unavailable;
- explain current position as a future comparison point, not a good/bad evaluation.

## Stop conditions

Stop safely and report before proceeding if any of the following occur:
- protected calculation or ROF-J core would need modification;
- comparison semantics are ambiguous or cannot be resolved from Current;
- evidence wording would require a source claim not supported by persisted provenance;
- Safety logic would need to be bypassed or reinterpreted;
- existing data schema would require destructive migration;
- a test/regression failure cannot be isolated safely.
