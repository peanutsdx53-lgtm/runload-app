# RunLoad Mobile Prototype Parity Baseline

Date: 2026-09-20
Status: SMARTPHONE IMPLEMENTATION BASELINE / MOBILE LAYOUT + RESUME RECOVERY PATCH

The smartphone UI is based on the frozen 15-screen prototype DOM/layout authority, with later audited smartphone refinements.

## Verification
- Retained V1.6R2 regression harness with the expected cache-version literal updated for this release: 251 / 251 PASS
- 16 / 16 retained suites PASS
- JS/MJS syntax in the retained harness: 79 / 79 PASS
- Protected `core/runloadCore.js` hash unchanged
- Protected `core/secondPillarRofJ.js` hash unchanged
- Smartphone Record screen bottom clearance increased so the collapsed final card can clear the fixed save controls
- ROF-J descriptor/official-word areas reserve stable two-line height so slider content does not jump when long labels wrap
- Course "新しいコース" and editor action labels are centered; mobile course editor reserves bottom space above the fixed navigation
- iOS/PWA resume recovery now reconciles body dialog/subflow classes on `pageshow` and visible `visibilitychange`
- Resume recovery is code-audited; final real-device iPhone confirmation remains pending
- PWA cache version is bumped so updated CSS/JS replaces prior cached assets

## Fixed scientific boundary
UI refinement does not change ROF-J wording or scale semantics, Reference-100 semantics, distance separation, missingness handling, ROF-J separation, or the documented Direct/P1/P2 evidence boundaries.
