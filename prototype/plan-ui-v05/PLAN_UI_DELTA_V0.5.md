# Plan UI Prototype V0.5 — Shared Course Flow

Date: 2026-09-18
Status: PROTOTYPE ONLY / FORMAL CURRENT UNCHANGED

Purpose:
- Shorten Plan.
- Remove duplicate course/grade/surface entry from Plan.
- Reuse the shared Course Settings flow already used by Record and Simulation.

Changes:
- Primary Plan inputs are now:
  - 予定種別（走行 / 休養）
  - 予定日
  - 距離
  - 実走予定時間
- Course is optional and opens shared Course Settings.
- Removed Plan-local free-text course name, grade selector, surface selector, and unused heading field.
- Quick start now contains only:
  - 前回の距離・時間
  - 休養として入力
- "距離・時間を少なくする" was removed because it was an arbitrary preset rather than a neutral copy/edit starting point.
- Running format remains optional secondary disclosure.
- Added an optional route to Simulation: "前回と条件を比べる".
- Course selection returns to Plan using the shared sessionStorage selection contract.
- Plan -> Course -> GPX -> Course -> Plan round-trip is supported.
- Plan -> Simulation -> Plan round-trip is supported.

Boundary:
- Plan does not prescribe distance, time, rest, or course.
- Simulation remains a comparison tool, not a recommendation.
- Unknown course conditions remain unknown.
- Formal Current V1.16 / App V1.5R2 unchanged.
