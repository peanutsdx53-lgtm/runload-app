# RunLoad Mobile Prototype Parity Baseline

Date: 2026-09-20
Status: SMARTPHONE IMPLEMENTATION BASELINE / iOS SCROLL-SURFACE RESUME RECOVERY

The smartphone UI is based on the frozen 15-screen prototype DOM/layout authority, with later audited smartphone refinements.

## Verification
- Retained V1.6R2 regression harness with the expected cache-version literal updated for this release: 251 / 251 PASS
- 16 / 16 retained suites PASS
- JS/MJS syntax in the retained harness: 80 / 80 PASS
- Dedicated iOS resume static audit: 13 / 13 PASS
- Protected `core/runloadCore.js` hash unchanged
- Protected `core/secondPillarRofJ.js` hash unchanged
- Previous Record/ROF-J/Course layout corrections remain active
- Foreground recovery still reconciles transient body lock classes
- Foreground recovery now also reactivates visible internal scroll surfaces and preserves their scroll positions
- The document scroll surface is also refreshed when foreground recovery runs and no blocking guide dialog is active
- Mobile fixed/inner scroll surfaces explicitly retain iOS momentum scrolling
- Recovery is triggered by both `pageshow` and visible `visibilitychange`
- Final real-device iPhone confirmation remains pending
- PWA cache version is bumped so updated CSS/JS replaces prior cached assets

## Fixed scientific boundary
This patch does not change ROF-J wording or scale semantics, Reference-100 semantics, distance separation, missingness handling, ROF-J separation, or the documented Direct/P1/P2 evidence boundaries.
