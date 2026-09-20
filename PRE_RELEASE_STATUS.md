# RunLoad Pre-release Status

Date: 2026-09-20
Status: PRE-RELEASE REGULAR APP / SHARE PREPARATION V1.30

Verification:
- modified JavaScript syntax: 10 / 10 PASS
- final Share Preparation audit: 38 / 38 PASS
- consultation-boundary compatibility audit: 13 / 13 PASS
- dynamic body-region synchronization audit: 6 / 6 PASS
- retained V1.6R2 harness baseline: 251 / 251 PASS
- exact V1.30 branch was not overlaid onto the retained 251-test harness; the baseline result is not treated as V1.30 regression evidence
- protected calculation cores unchanged
- storage implementation unchanged
- source/scientific-model files unchanged

Audited Share Preparation changes:
- User-facing feature name is 「共有用にまとめる」 rather than 「相談」.
- One shared content selection powers screen display, text copy, and print/PDF.
- Current run, fatigue, body record, selected body-region indicator, comparable prior change, next check, and saved next plan can be included.
- Selected body-region changes use the existing deterministic consultation/comparison service.
- The legacy quick/report runtime split is removed.
- A4 print/PDF output uses meaningful sections, compact body-record summaries, a body-region table, and card-level page-break protection.
- No auto-send behavior is introduced.
- No diagnosis, run-permission, safety-score, RPE, or whole-run aggregate-score output is introduced.

The app remains a development-stage research application. Scientific interpretation boundaries in the README and Current research package remain controlling.
