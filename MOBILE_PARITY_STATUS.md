# RunLoad Mobile Prototype Parity Baseline

Date: 2026-09-20
Status: SMARTPHONE IMPLEMENTATION BASELINE / USER LANGUAGE V1.29 VERIFIED

The smartphone UI is based on the frozen prototype authority, with later audited smartphone refinements.

## User-language rule
- User-facing labels lead with meaning rather than research or implementation terminology.
- ROF-J is shown primarily as 「疲労感」.
- Reference-100 is shown primarily as 「部位ごとの目安」.
- Formal names remain only in explanatory/detail text where provenance matters.
- Internal identifiers and calculation/storage terminology remain unchanged.

## Verification
- Final syntax audit for all 27 modified JavaScript files: 27 / 27 PASS
- User-facing legacy-term residual audit: PASS
- Diff-shape audit: all 27 implementation files are balanced line-for-line replacements; no new control-flow, event, storage, routing, or calculation logic was added
- Protected `core/runloadCore.js` unchanged
- Protected `core/secondPillarRofJ.js` unchanged
- Storage implementation unchanged
- The retained 251-test V1.6R2 harness was not rerun against the exact V1.29 branch because the repository has no CI and the retained harness is stored separately in Library; prior regression evidence remains previous-release evidence only
- PWA cache is bumped so existing installations receive the wording update

## Main wording changes
- ROF-J -> 疲労感
- Reference-100 -> 部位ごとの目安
- 基準100 -> その部位の基準
- RUN_WALK -> 走りと歩きを混ぜた場合
- シミュレーション -> 条件比較
- 勾配 -> 坂の傾き
- GPX-facing labels -> ルートファイル（GPX）
- 実走時間 -> 実際に走った時間
- 走行形式 -> 走り方
- けがリスク / 傷害リスク -> けがの危険性

## Fixed scientific boundary
This release changes presentation wording only. It does not change ROF-J descriptors, scale values, Reference-100 mathematics, calculation inputs, course semantics, source evidence, storage shape, or the documented Direct/P1/P2 boundaries.
