# RunLoad Guided Interpretation Dialogue — Audit

Date: 2026-09-21

## Decision

**PASS — deterministic guided dialogue baseline established.**

Audited implementation head before audit-document-only commits:
- `662180e205c249c8e37297e3e7e9b08e84979448`

Audited base / current main:
- `8d2937c7bbfe3a7094601628a109d31309edd775`

PR #49 remains Draft. Formal Current remains untouched.

## Product role

RunLoad is treated primarily as a self-management application.

Interpretation Room now has two clearly separated responsibilities:

1. **interpretation support**
   - provide one primary meaning;
   - narrow what the user wants to understand;
   - change representation when needed.

2. **self-management bridge**
   - identify what the user wants to do next;
   - hand off to an existing RunLoad function;
   - do not recreate that function inside Interpretation Room.

## Information-load contract

Ordinary entry:
- one RunLoad interpretation;
- one compact boundary;
- exactly two choices:
  - `この結果を理解したい`
  - `次にどう活かすか考えたい`

Understand step:
- maximum three representation choices;
- Difference / Visual / Simple only when available;
- no History / Simulation / Plan / Consultation / Reading links in this step.

Manage step:
- maximum three choices;
- compatible History bridge when available;
- Simulation bridge when enabled;
- `次回に活かす` as the progressive next step;
- Plan / Consultation / Reading are not shown yet.

Next-use step:
- maximum three choices;
- Plan;
- Consultation;
- Reading;
- History / Simulation are not repeated.

Existing `nextCheckPoint` is shown only after the user reaches the next-use context.

## Responsibility separation

Interpretation Room:
- meaning framing;
- question narrowing;
- representation switching;
- function bridge selection.

History:
- past-record exploration.

Simulation:
- hypothetical condition editing/comparison.

Plan:
- user-entered next-run/rest planning.

Consultation:
- user-selected sharing preparation.

Reading:
- background/general research.

Support:
- existing support/safety precedence.

No downstream function UI is duplicated inside Interpretation Room.

## Dialogue form

The interaction is chat-like in sequence but remains deterministic.

Not introduced:
- free-text chat input;
- unconstrained text generation;
- AI avatar;
- typing indicator;
- persistent dialogue history;
- external API.

URL state:
- `view=dialogue`
- `topic=understand|manage|next-use`

Legacy `view=next` remains compatible and now resolves to the narrow management dialogue rather than the old broad function list.

## Final regression

Existing App Source verifier:
- **273 / 273 PASS**

Interpretation suites:
- Core V1: **24 / 24 PASS**
- Meaning V2: **13 / 13 PASS**
- Room Integration V1: **18 / 18 PASS**
- Launch Integration V1: **11 / 11 PASS**
- PWA Integration V1: **7 / 7 PASS**
- Experience V2: **11 / 11 PASS**
- Guided Dialogue V1: **14 / 14 PASS**

Combined:
- **371 / 371 PASS**

Runtime manifest:
- **79 / 79 SHA-256 matches**

Local reconstructed App Source syntax audit:
- **89 / 89 JS/MJS PASS**
- this includes local-only visual-audit fixture files not committed to GitHub.

GitHub branch tree contains:
- 69 JS/MJS runtime/new-test files.

## Visual audit

Production Presentation output and production CSS were rendered with Playwright `set_content`.

Viewports:
- 390 × 844
- 1280 × 900

Audited views:
- entry;
- understand;
- manage;
- next-use;
- simple;
- visual;
- difference.

Results at both widths:
- page-level horizontal overflow: **0**
- document scroll width equals viewport width.

Choice counts:
- entry: 2
- understand: 3
- manage: 3
- next-use: 3
- simple explanation follow-up: 2
- visual explanation follow-up: 2
- difference explanation follow-up: 2

One refinement during visual review:
- repeated scientific-boundary text was removed from manage/next-use bridge steps because it was unrelated to those decisions;
- the scientific boundary remains on the initial interpretation and relevant explanation surfaces.

## Scientific boundaries

Unchanged:
- no diagnosis;
- no injury probability;
- no regional/ROF-derived danger or safety conclusion;
- no run/no-run recommendation;
- no causal inference from condition/result co-change;
- no cross-region physical ranking;
- ROF-J remains separate;
- strict compatible-history comparison remains;
- existing Support precedence remains.

Protected cores are not changed by the GitHub compare:
- `core/runloadCore.js`
- `core/secondPillarRofJ.js`

## GitHub / local identity

Validated local files and GitHub branch are byte-identical for:

- Presentation blob: `ea991d3145891eae3e9a3579815ee7dc4eb56b5e`
- Screen blob: `86c1b82980d48183146a2b14963a4ea87c3bf1ef`
- CSS blob: `7468cd3a7d4567fbb71e384bb53537352544fde4`
- Room integration test blob: `1ecbdccd970dcb362c6f9f989eedde2c77124f6e`
- Experience V2 test blob: `2fcc8bf9b4f876f72481b769ac146bc33b861e6b`
- Guided Dialogue test blob: `a364eb0911e5be43f934fc3ecd4bdfc0f9778488`
- PWA test blob: `dbfb5d60ec3b45eacc8066e0cbf178b3607e8b00`
- runtime manifest blob: `600d4cdb233d6b8ed039d9930d8d70964f7bcb9c`

## Release state

- PR #49: Draft
- main: unchanged
- formal Current: unchanged
- merge: not performed
- Current promotion: not performed

## Next refinement

This guided-dialogue implementation is a baseline, not a final UX freeze.

Future refinement may adjust:
- exact interpretation wording;
- which question is offered first by context;
- visual hierarchy and colors;
- transitions between explanation and downstream functions;
- whether additional deterministic question paths are useful.

The fixed principle is progressive disclosure:
**one question at a time, normally two choices and never more than three ordinary choices per step.**
