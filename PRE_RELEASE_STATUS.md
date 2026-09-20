# RunLoad Pre-release Status

Date: 2026-09-20
Status: PRE-RELEASE REGULAR APP / HISTORY INTERACTION + SELECTION PATCH

Verification:
- dedicated History interaction regression: 4 / 4 PASS
- retained V1.6R2 full regression harness: 251 / 251 PASS
- retained suites: 16 / 16 PASS
- retained JS/MJS syntax: 79 / 79 PASS
- prior V1.20 dark-mode verification: 302 / 302 tests, 18 / 18 suites, 81 / 81 syntax; previous-release evidence, not rerun for this patch
- protected Primary core hash unchanged
- protected ROF-J core hash unchanged

Audited UI refinements:
- History "記録を探す / 部位を比較" controls now navigate through the current History router.
- History "すべて / 走行 / 休養" controls now filter while preserving the current search/period context.
- History period, graph display and body-region picker controls are wired through the same interaction path.
- Segmented selected states now use the shared semantic selection border/surface tokens rather than blending into the surrounding light-mode surface.
- PWA cache version is bumped so existing installations receive the corrected JS/CSS.

The app remains a development-stage research application. Scientific interpretation boundaries in the README and Current research package remain controlling.
