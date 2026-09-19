# RunLoad Mobile Prototype Parity Baseline

Date: 2026-09-19
Status: SMARTPHONE IMPLEMENTATION BASELINE / USABILITY PATCH VERIFIED

The smartphone UI is based on the frozen 15-screen prototype DOM/layout authority, with later audited smartphone refinements.

## Verification
- Current full regression: 269 / 269 PASS
- 17 / 17 suites PASS
- JS/MJS syntax: 80 / 80 PASS
- Protected `core/runloadCore.js` hash unchanged
- Protected `core/secondPillarRofJ.js` hash unchanged
- Display settings use compact collapsible rows and save/apply immediately on selection
- Result body silhouette uses defined theme tokens and upper-region overlays received minor alignment tuning
- Record activity/date and Plan date controls have explicit interactive styling
- Reference-100 below/down color uses canonical `--color-info`
- PWA cache version bumped so corrected UI assets replace prior cached assets

## Fixed scientific boundary
UI refinement must not change Reference-100 semantics, distance separation, missingness handling, ROF-J separation, or the documented Direct/P1/P2 evidence boundaries without a new scientific review.
