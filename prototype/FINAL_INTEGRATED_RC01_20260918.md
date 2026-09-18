# RunLoad UI/UX Final Integrated Prototype RC01

Date: 2026-09-18  
Status: FINAL PROTOTYPE RELEASE CANDIDATE / FORMAL CURRENT UNCHANGED

## 1. Adopted prototype screen set

- Home: `prototype/home-ui-v13/`
- Record: `prototype/record-ui-v16/`
  - body / subjective record is integrated as a Record subflow
  - shoe / personal context is integrated as a Record subflow
- Result: `prototype/result-ui-v21/`
  - 12-region list / body map / region detail are integrated in Result
- History: `prototype/history-ui-v14/`
- Plan: `prototype/plan-ui-v09/`
- Simulation: `prototype/plan-simulation-ui-v15/`
- Course Settings / Editor: `prototype/course-flow-ui-v16/`
- GPX local analysis: `prototype/gpx-local-analysis-v17/`
- Result Activation: `prototype/activation-ui-v07/`
- Consultation: `prototype/consultation-ui-v03/`
- Public Support: `prototype/support-guidance-ui-v03/`
- Reading: `prototype/reading-ui-v02/`
- Privacy: `prototype/privacy-ui-v03/`
- More: `prototype/more-ui-v06/`
- Settings: `prototype/settings-ui-v06/`

Root `index.html` routes to Home V0.13.

## 2. Fixed product decisions represented in RC01

- Notebook / Record Notebook is completely absent from the new-app candidate.
- No legacy Notebook migration, compatibility, archive, or read-only path.
- New-app record scope begins after new-app release.
- session-RPE is absent.
- ROF-J remains subjective fatigue at answer time and is displayed publicly as:
  - 走る前の疲労感
  - 走った後の疲労感
- Result does not use public PRE / POST labels.
- Reference-100 remains a within-region self-understanding reference.
- Distance remains a separate run fact and is not automatically multiplied into the regional display value.
- Missing information is not treated as zero.
- No diagnosis, prescription, injury-risk score, readiness score, safety score, or automatic run/no-run decision.
- Public Support is separate from RunLoad numeric-result interpretation.
- Standard blue theme is the adopted prototype theme.

## 3. Completed prototype flows

- Root -> Home -> each major destination.
- Record keeps the five-item main navigation.
- Record -> Course Settings -> GPX -> Course Settings -> Record.
- Plan -> Course Settings -> Plan.
- Plan -> Simulation -> Plan.
- Plan saved item -> Record prefill.
- Record save -> Result.
- Result body region -> region detail -> Result.
- Result -> Activation -> Consultation / Reading / Plan / Simulation.
- More -> Consultation / Public Support / Privacy / Reading / Settings.
- Consultation -> Public Support.
- Settings -> Privacy.

Prototype-only functional state is stored under keys beginning with `runloadPrototype`.
Formal App storage is not intentionally modified by RC01.

## 4. Closed placeholder / dead-end items

RC01 contains no deliberate UI route using:
- `href="#"`
- `data-pending`
- “次の工程で設計”
- “後続工程で設計”
- “遷移を想定”
- the old Record CURRENT FLOW PRESERVED placeholder

History's nonfunctional edit button was removed rather than leaving a dead action.

## 5. Cross-screen static audit

Checked across the adopted screen set:
- local href/src targets exist in the RC tree
- old prototype-version references: 0 in adopted candidate routes
- Notebook literals: 0
- session-RPE literals: 0
- five-item navigation order: Home / 記録 / 結果 / 履歴 / その他
- `viewport-fit=cover` present
- bottom safe-area treatment present in page or linked stylesheet
- inline / external JavaScript syntax checks passed where applicable
- root points to the final Home candidate

Simulation engine preservation:
- V0.14 engine SHA: `6a55cbeebb4ef7f1570a1d81180417dbf520112c`
- V0.15 engine SHA: `6a55cbeebb4ef7f1570a1d81180417dbf520112c`
- byte-for-byte equal: yes

## 6. Scope boundary

This RC is the final UI/UX prototype candidate, not the Formal App integration.

Unchanged:
- Formal Current V1.16
- Accepted App V1.5R2
- calculation semantics
- 12-region model semantics
- Reference-100 meaning

Formal integration must connect the accepted prototype UI to the existing audited calculation/storage layers without silently changing those semantics.

## 7. Next phase after user review / prototype freeze

1. Freeze this prototype set.
2. Prepare successor handoff using this file plus the existing UI/UX authority handoff.
3. Start Formal App integration in a separate chat/workstream.
4. Re-run formal semantic / calculation / storage audit after integration.
5. Only then consider Current promotion.

