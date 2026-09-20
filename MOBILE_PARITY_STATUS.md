# RunLoad Mobile Prototype Parity Baseline

Date: 2026-09-20
Status: SMARTPHONE IMPLEMENTATION BASELINE / MOBILE FORM POLISH V1.27 VERIFIED

The smartphone UI is based on the frozen prototype authority, with later audited smartphone refinements.

## Verification
- Retained V1.6R2 regression harness with the expected cache-version literal updated for this release: 251 / 251 PASS
- 16 / 16 retained suites PASS
- Retained JS/MJS syntax: 79 / 79 PASS
- Modified JavaScript syntax audit: 5 / 5 PASS
- Dedicated mobile form/UI audit: 18 / 18 PASS
- Protected `core/runloadCore.js` hash unchanged
- Protected `core/secondPillarRofJ.js` hash unchanged

## Audited refinements
- Record return/restoration notices use a compact in-flow status style and no longer occupy the large legacy notice geometry.
- The inactive RUN_WALK detail wrapper is hidden together with its contents, removing the blank panel below 走行形式.
- Course numeric/select inputs use a common mobile control geometry, visible focus state, and explicit percent units.
- Detailed slope sections are progressively revealed from one row up to five without changing the five-slot storage/read model.
- Surface percentage entry uses the same percent-control pattern and becomes one-column on narrow phones.
- Saved Course actions separate the primary "このコースを使う" action from compact secondary 編集 / 削除 actions.
- Empty saved-Course guidance is shortened to avoid awkward wrapping.
- Navigation architecture V2, Course Editor single-scroll, and foreground scroll recovery remain active.
- PWA cache is bumped so existing installations receive the updated CSS/JS.

## Fixed scientific boundary
These UI/interaction refinements do not change course semantics, calculation inputs, ROF-J semantics, Reference-100 semantics, source evidence, or the documented Direct/P1/P2 boundaries.
