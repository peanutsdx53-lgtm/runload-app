# RunLoad Mobile Prototype Parity Baseline

Date: 2026-09-20
Status: SMARTPHONE IMPLEMENTATION BASELINE / HISTORY INTERACTION + SELECTION PATCH VERIFIED

The smartphone UI is based on the frozen 15-screen prototype DOM/layout authority, with later audited smartphone refinements.

## Verification
- Dedicated History interaction regression: 4 / 4 PASS
- Retained V1.6R2 full regression harness: 251 / 251 PASS
- 16 / 16 retained suites PASS
- JS/MJS syntax in the retained harness: 79 / 79 PASS
- Prior V1.20 dark-mode verification remains 302 / 302 tests, 18 / 18 suites, 81 / 81 syntax as previous-release evidence; it was not rerun for this patch
- Protected `core/runloadCore.js` hash unchanged
- Protected `core/secondPillarRofJ.js` hash unchanged
- History mode, record-type, period/display and region-picker controls are wired to the current router flow
- Segmented selected states use the shared semantic selection border/surface tokens across prototype-parity screens
- Previous mobile usability, dark-mode and Reference-100 semantic-color corrections remain active
- PWA cache version is bumped so updated History JS/CSS replaces prior cached assets

## Fixed scientific boundary
UI refinement does not change Reference-100 semantics, distance separation, missingness handling, ROF-J separation, or the documented Direct/P1/P2 evidence boundaries.
