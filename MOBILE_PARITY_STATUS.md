# RunLoad Mobile Prototype Parity Baseline

Date: 2026-09-20
Status: SMARTPHONE IMPLEMENTATION BASELINE / COURSE EDITOR SINGLE-SCROLL FIX

The smartphone UI is based on the frozen 15-screen prototype DOM/layout authority, with later audited smartphone refinements.

## Verification
- Retained V1.6R2 regression harness with the expected cache-version literal updated for this release: 251 / 251 PASS
- 16 / 16 retained suites PASS
- JS/MJS syntax in the retained harness: 80 / 80 PASS
- Protected `core/runloadCore.js` hash unchanged
- Protected `core/secondPillarRofJ.js` hash unchanged
- Previous Record/ROF-J/Course layout corrections remain active
- Mobile Course Editor no longer uses a nested full-screen `position: fixed; overflow: auto` scroll surface
- Mobile Course Editor now participates in the normal RunLoad document scroll
- The duplicate/sticky internal Course Editor header is hidden on smartphone; the Course List return action remains available as a normal content link
- Desktop Course Editor modal-style structure remains unchanged
- Prior foreground-resume recovery remains in place as a defensive fallback
- Final real-device iPhone confirmation remains pending
- PWA cache version is bumped so updated Course Editor CSS/markup replaces prior cached assets

## Fixed scientific boundary
This patch does not change course data semantics, calculation inputs, ROF-J semantics, Reference-100 semantics, source evidence, or the documented Direct/P1/P2 boundaries.
