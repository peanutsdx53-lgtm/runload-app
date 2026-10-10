# G-02 / G-03 — pre-release numerical identity and archival preservation (2026-10-10)

## Version, intent, and boundaries

RunLoad is **not publicly released**. An ordinary newly created record starts with the current scientific calculation model `runload-primary-regional-reference100-v3.1` and the matching v3.1 output semantic version. Supporting every historical **development build** as an upgrade target is not a pre-release acceptance requirement. Development-era model v3.0 fixtures and research calculations remain immutable evidence; a previously stored numeric output must not be silently relabeled, updated or mixed with v3.1 values. No bulk migration is authorized and no retired-model UI/UX feature is required.

G-02 acceptance: for a given record, the 12 region values and their missing-value semantics are identical through calculation, current-model storage, history and report generation, with the same meaning in mobile and desktop result render functions. G-03 acceptance: reading, backing up, restoring, deleting/undoing or explicitly editing archived internal development data must not silently change an old result into a newer model's numeric output. Neither contract establishes medical validity, device-specific reliability, end-user comprehension or clinical predictions.

## Independent evidence and executable test

`tests/g02G03PreReleaseScopeIndependent.test.mjs`:

1. New pre-release run records both begin with the **current** v3.1 model ID and v3.1 output semantic ID, with 12 computed regions and no transient-recovery warning.
2. Every one of the 12 region values is compared, unchanged, between the original persisted model result, record workflow, history exact-value rows, consultation report and numeric labels in both desktop/mobile rendered HTML. The region-detail renderer is also invoked for every region.
3. A complete portable backup export/restore preserves all stored v3.1 region results, model version, output semantics and comparison signatures exactly.
4. A rest-only record remains a **rest**, and all 12 report/history value states stay unavailable (`null`), not fabricated zero scores or direct comparison points.

Historical non-destructive proof continues via `tests/g03HistoricLifecycleIndependentAudit.test.mjs` (8 tests), `tests/g03LegacyModelReadOnlyBoundary.test.mjs` (2), `tests/a03HistoricV30Import.test.mjs` (3), and `tests/a03ModelVersionCoexistence.test.mjs` (2): 15/15 G-03 selected previous-model tests PASS. These include synthetic historical v3.0 backup import, identical-byte preservation, 12-region non-comparability across semantic versions, metadata mismatch, corrupt older calculation, unknown older model, explicit edit as a separate v3.1 result, delete/Undo and no writes during repeated reads.

Scientific Golden v3.1 remains 74/74 and independent source anchors 10/10; the underlying scientific authority or coefficients are not altered. The complete Node and GitHub/browser CI regression suites must remain green after this test-only addition.

## Decision rule for the 44-item audit

The original G-02 criterion is **same input, calculation→saved value→history→report numeric meaning is unchanged**. The original G-03 criterion is **old saved results are not silently recomputed/reinterpreted into the current model**. This evidence and independent replay establish those *software semantic* contracts. Real iOS/Android restarts, browser permission exhaustion, restoration across arbitrary unarchived prerelease builds, fully accessible final screens and later user explanations are **separate** G-01/D-01/D-02/D-05/E-07/F/G-04 acceptance gates. They must not be called PASS on this evidence.

No general UI/UX redesign, model coefficient change, deletion of research histories or release to end users is included. This document and tests are non-UI correctness and audit evidence only.
