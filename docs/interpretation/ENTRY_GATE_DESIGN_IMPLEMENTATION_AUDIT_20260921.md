# RunLoad Interpretation — Entry Gate Design / Implementation Audit

Date: 2026-09-21
Status: COMPLETE — PASS
Branch: `feature/runload-interpretation-room-v1`
PR: #49 (Draft / unmerged)

## Purpose

Define and implement the public entry points into the deterministic understanding flow without changing the role of the Result screen.

This audit fixes the information architecture, wording boundary, and entry behavior. It does **not** freeze the future PC layout.

## Design authority for the entry gates

### 1. Centrality is not the same as screen prominence

The calculation engine and the understanding/interpretation engine are both central application systems.

However, the Result screen remains tightly coupled to calculated outputs. Its primary responsibility is to display the two result layers. The understanding flow is therefore presented as a **derived action after the results**, not as the main content or an introduction to the Result screen.

### 2. Result screen

Fixed order:

1. current run summary
2. regional result
3. subjective fatigue result
4. optional entry: `今回の結果を理解する`
5. History and other downstream actions

Implemented wording:

- `結果を見たあとに`
- `今回の結果を理解する`
- `表示された内容を順番に整理して確認します。`

The gate does not display internal/research terminology such as:

- `RunLoad解釈`
- `解釈エンジン`
- `計算エンジン`
- `Reference-100`

The result gate is intentionally styled as a neutral secondary surface:
- ordinary surface background;
- ordinary line border;
- no warning/danger token;
- no warning-like gradient.

### 3. Home screen

The latest **run** record card now exposes two distinct routes in this order:

1. `結果を見る`
2. `結果を理解する`

The first route remains the primary record-result action.

The understanding route is visually weaker:
- transparent background;
- ordinary accent outline;
- same record context.

The former independent promotional block (`必要なときに開く / RunLoad解釈`) was removed.

Rest records do not expose the understanding route because there is no normal two-layer run result to interpret.

### 4. Global navigation

No permanent/global navigation item was added.

The understanding flow remains record-contextual and is entered from screens where a target run record is already known.

### 5. PC-layout boundary

The implementation fixes the **information hierarchy**, not the final PC geometry.

Future PC layout work may change:
- columns;
- widths;
- placement within the available content area;
- card alignment.

It must preserve:
- Result outputs before the understanding entry;
- `結果を見る` before `結果を理解する` on Home;
- understanding as a contextual/derived route, not a competing Result-screen primary block.

## Files changed

- `screens/resultScreen.js`
- `screens/homeScreen.js`
- `styles/prototype-mobile-parity.css`
- `tests/interpretationEntryGateV1.test.mjs`
- `service-worker.js`
- `RUNTIME_SHA256SUMS.txt`
- `tests/interpretationRoomPwaIntegrationV1.test.mjs`

A temporary final-audit GitHub Actions workflow was tested as an audit mechanism, did not produce workflow runs in this environment, and was removed from the final branch tree.

## Verification

### Dedicated entry-gate suite

`tests/interpretationEntryGateV1.test.mjs`

Result:
- **8/8 PASS**

Covered:
- Result gate follows both result layers;
- plain-language gate wording;
- Home separates result viewing from understanding;
- old promotional block removed;
- rest record excludes understanding entry;
- neutral/non-warning result styling;
- visually secondary Home understanding action;
- no global-navigation entry.

### Current GitHub source cross-check

Result:
- **15/15 PASS**

Included:
- entry ordering;
- wording boundary;
- Home route order;
- rest-record behavior;
- no global-navigation link;
- entry styling semantics;
- runtime-manifest alignment;
- PWA refresh marker;
- protected-core SHA verification.

### Layout measurement

Network-free browser measurement using production CSS:

390 px:
- document width: 390 px
- Result horizontal overflow: 0
- Home horizontal overflow: 0
- Result order: PASS
- result understanding gate width: 330 px
- Home primary/secondary action width: 300 px each

1280 px:
- document width: 1280 px
- Result horizontal overflow: 0
- Home horizontal overflow: 0
- Result order: PASS
- result understanding gate max width: 840 px
- Home primary/secondary action width in probe: 480 px each

These measurements verify current compatibility only. They do not freeze the future PC layout.

## Runtime integrity

Current SHA-256:

- `screens/homeScreen.js`
  - `1af7fcb33964bca7a7f95952f5327d1ea824ca9c90606f9509a4113ef3c43527`
- `screens/resultScreen.js`
  - `6942f353ea8e1b371b250706d00f0eb13e95ebd2a75084144161de2fdc8a8227`
- `styles/prototype-mobile-parity.css`
  - `f60d6c38026c659091c57f563e2b69a0574fccddfaed0b9a6fc574adf2bc5c39`
- `service-worker.js`
  - `f8e32ba17d22f66677ce257699261a66d4f389928007c0692bc6ba6685c1669c`

PWA cache name remains:
- `runload-app-current`

The Service Worker source was changed only to trigger resource refresh while retaining the stable cache-name policy.

## Scientific/protected-core integrity

Protected calculation core:
- `b47d1afdbb714c39c32868ed3aaf950f1aa2b71db0f98d3bca0112babc98adc8`
- PASS / unchanged

Protected ROF-J core:
- `7ea31dbbbd03d5e74960ff0c7de53bc431536d743be6bc46fbf5ac8906063908`
- PASS / unchanged

No calculation logic, ROF-J semantics, causal inference, diagnosis, safety judgment, run/rest prescription, or new persistent data class was introduced.

## Release boundary

- PR #49 remains Draft.
- main remains unchanged.
- formal Current remains unchanged.
- no merge or Current promotion is authorized by this checkpoint.

## Completion judgment

The **entry-gate design and implementation are complete**.

The remaining Interpretation-engine closure item is the final whole-feature regression/audit boundary. Entry-gate completion does not by itself authorize merge or formal Current promotion.
