# RunLoad Mobile Prototype Parity Baseline

Date: 2026-09-20
Status: SMARTPHONE IMPLEMENTATION BASELINE / RECORD BOTTOM-CLEARANCE PATCH VERIFIED

The smartphone UI is based on the frozen 15-screen prototype DOM/layout authority, with later audited smartphone refinements.

## Verification
- Record collapsed-card bottom-clearance audit: PASS
- Retained V1.6R2 regression harness with the expected cache-version literal updated for this release: 251 / 251 PASS
- 16 / 16 retained suites PASS
- JS/MJS syntax in the retained harness: 79 / 79 PASS
- Protected `core/runloadCore.js` hash unchanged
- Protected `core/secondPillarRofJ.js` hash unchanged
- Mobile Record content now reserves 68px of screen-level bottom space in addition to the mobile shell navigation clearance
- With the fixed save bar geometry, the collapsed final card can clear the fixed controls with an additional visual gap
- Previous History interaction, dark-mode and Reference-100 semantic-color corrections remain active
- PWA cache version is bumped so updated Record CSS replaces prior cached assets

## Fixed scientific boundary
UI refinement does not change Reference-100 semantics, distance separation, missingness handling, ROF-J separation, or the documented Direct/P1/P2 evidence boundaries.
