# RunLoad B-01 / B-03 non-UI source reachability and legacy-branch review — Round 3

## Identity and scope

Baseline: formal V2.68, GitHub main `a7c2719c91bf30481d2e91e62298c2f4dcc53385`, Git tree `aeadca25ca004d15cffaca6baf6324d6b2c8a88d`. All source scans use the actual 573-file extracted Source archive. Audit files and tests are additive; **no runtime JS/CSS/HTML/SW, user records or scientific sources are changed** in this round. The test in `tests/b01B03DependencyAndLegacyIndependent.test.mjs` guards the current structural conclusions in CI.

## Independently checked facts

- Source package: 573 files; deployed/runtime content: 331 files excluding `.nojekyll` metadata, including 210 JavaScript files (209 index-page import-graph nodes and 1 Service Worker entry), 111 CSS files, and other HTML/manifest/image assets.
- Static TypeScript AST scan of all 210 runtime JS files independently found **502 static, dynamic-literal or re-export references**, 0 missing targets, 0 syntax/parser errors and 0 nonliteral dynamic imports. From the 5 real `index.html` script roots **all 209 page-side JS files are transitively reachable**. SW is the separate worker entry. A separate regex/graph implementation was compared with the AST results on the 502-edge baseline, and 5 CI-executable guard tests independently check the entire current file-level graph.
- Stylesheets: 111 CSS files; HTML links include 27 common CSS paths, `ui/platformStyles.js` enumerates 99 platform-load entries (sets overlap); **union covers 111/111**. 0 missing CSS paths. Exact-content CSS duplicates **0** (SHA-256 of individual files). Exact-content runtime JS duplicates **0**.
- Worker: 329 local entries were enumerated from `service-worker.js` URL lists; all referenced paths exist and all runtime resources except the worker script itself are in the list. Both mobile and desktop platform bundles are intentionally preserved for offline setup; tests also verify the edge list.
- Literal storage-key namespaces: 19 found by a conservative string search. A `v1` suffix identifies a stored schema, **not** evidence that the key is unused or that deleting it is safe. No storage keys or saved data were mutated.
- `TODO`, `FIXME` and `deprecated` executable placeholders were not found as active unfinished runtime branches in this audit. This is *not* a function-level proof of dead-code absence, especially when callbacks, string catalogs, DOM bindings and service-worker cache fallback are considered.

## Old version / duplicate triage (decisions are conservative)

| Location | Current role | Decision |
| --- | --- | --- |
| `core/internal/primaryModelResults.js` (`allowLegacy`, historic v3.0 marker) | Validates archived results without treating them as newly computed v3.1 | Retain — deleting it could change archived research interpretation |
| `core/internal/restoreInspection.js` (`allowLegacy: true`) | Performs restore validation on historic model records | Retain — not a legacy engine selection |
| `core/internal/recordWorkflow.js` (`isPriorResult`, `HISTORIC_ARCHIVE_UNAVAILABLE`) | Preserves identity and incompatibility of old model results, avoiding silent v3.1 recalculation | Retain |
| `ui/platformBootstrap.js` conditional dynamic imports | Selects one of two currently supported screen/layout runtimes | Retain |
| `ui/platformStyles.js`, `service-worker.js` platform URL groups | Load and cache the responsive platform dependencies | Retain |
| Current storage identifiers ending in `v1`/`v2` | Record/schema identifiers, not evidence of deprecated code | Retain |

No file was independently demonstrated to be runtime-unreachable, exactly duplicated, and safe for deletion. **No code deletion is authorized by this evidence**, and the audit correctly avoids modifying historical results or scientific coefficients.

## Remaining B-01 / B-03 acceptance gaps

1. File reachability does not imply every function, exported symbol, dynamic event callback or CSS selector is used. A complete symbol-level and CSS selector semantics audit is still needed before promoting B-01 to PASS.
2. Some compatibility handling is historically necessary. Absence of an unused full file does not prove every obsolete branch has been retired. B-03 needs actual-screen functional trace and explicit mapping from older specifications to each remaining branch.
3. SW update/offline behavior requires actual HTTP/Chromium/physical-device checks; the B-01 graph test cannot certify offline persistence by itself. See Round 4, B-04/B-05/C-04 and D-01/D-02.
4. The user-facing 44-condition formal audit matrix remains unchanged unless the full acceptance criteria are proved. **B-01 and B-03 remain PARTIAL**.

## Reproduction

1. `node --test tests/b01B03DependencyAndLegacyIndependent.test.mjs`
2. All repository nonbrowser tests are run in `H01 Comprehensive Release Regression` and `A03 Source, Science and Browser Verification` CI (Node 22).
3. Full H01 browser suite must be SUCCESS to promote even these audit-only changes. For TypeScript AST cross-check, traverse `typescript.createSourceFile` over all runtime `.js` files and collect `ImportDeclaration`, `ExportDeclaration` and literal `import()` call nodes; 502 edges were enumerated at this baseline. This additional analyzer is *not* bundled into RunLoad or its runtime.
4. Standalone audit evidence, the full module edge list, 331-role file inventory and legacy keyword occurrences are deposited in ChatGPT Library `/RunLoad_App_Audit_Active/` to avoid publishing internal audit scaffolding as application runtime code.

## Security limits

File-level graph and guarded model provenance **do not** establish E-01 XSS safety, E-07 permissions/storage resilience, encrypted backups, GitHub Pages origin isolation or third-party OSM/GPS privacy. No such PASS is claimed here.

## 2026-10-11 non-UI additive review — orphan exported symbols

A fresh TypeScript AST inventory of the current repository counted 210 runtime JavaScript files and 429 JS/MJS files including tests. It found two exported functions and four exported constants with no references outside their own declarations: `isFiniteNumericValue`, `personalChallengeDefinitions`, `SELF_INTERPRETATION_STORE_VERSION`, `INTERPRETATION_REFERENCE_HISTORY_LIMIT`, `MOBILE_STYLE_URLS`, `DESKTOP_STYLE_URLS`. They were removed conservatively, together with the now-dead private `flattenStyleGroups` helper. `MOBILE_STYLE_GROUPS` / `DESKTOP_STYLE_GROUPS` and platform loading remain intact; no storage key, user record, research model, UI or stylesheet is deleted. Repeating both AST scans after removal yields zero singly-referenced top-level function declarations and zero singly-referenced top-level variable declarations. New guard test enforces these removals; full graph/offline/functional tests still required.

The independent CSS selector scan still includes candidate selectors without literal matches in source. These can be valid runtime-generated, stateful, SVG, media, pseudo-selector or browser-generated classes; no selector is deleted or asserted unused from string absence. The remaining symbol-level dynamic usages, all event states and every CSS selector cannot be proven absent solely by these static checks. **B-01 remains PARTIAL unless the original full gate is independently satisfied**.

### Selector-level non-closure (not removal authority)

A postcss CSS parser scanned all 111 stylesheets and extracted **1,735 distinct class names**. Comparison with all runtime JS/HTML/manifest strings leaves **309 classes with no exact source-text occurrence** (examples include legacy-looking `share-viewer`, `region-copy-pc` and dynamically selected `status-label--*`). This is a discovery register, *not* a proof of dead selectors: classes can be synthesized by conditional concatenation or supplied by generated markup. Nothing in this count licenses deleting the CSS or applying a complete B-01 PASS. Actual DOM/route/class-state coverage or a stronger semantic proof is still required before eliminating them.
