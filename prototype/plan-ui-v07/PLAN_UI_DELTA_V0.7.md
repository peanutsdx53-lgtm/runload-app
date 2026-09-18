# Plan UI Prototype V0.7 — Input Clarity

Date: 2026-09-18
Status: PROTOTYPE ONLY / FORMAL CURRENT UNCHANGED

User feedback addressed:
- Planned-date input overflowed to the right on iPhone.
- "入力を早くする" and related helper copy were too abstract.

Changes:
- Planned date now uses the same constrained date-control pattern as Record:
  - visible YYYY/MM/DD display,
  - native date input remains tappable but visually hidden,
  - max-width and min-width guards prevent iOS native-date overflow.
- "入力を早くする" -> "前回の距離・時間を使う".
- The action now states the actual values: "6.2 km・39分を入力".
- Removed the duplicate "休養として入力" shortcut because 走行 / 休養 is already the primary toggle.
- "走行形式 / 必要な場合だけ設定" -> "走る／歩くの予定 / 途中で歩く場合だけ選択".
- Course helper copy now states that the plan can be saved with no course selected.
- General Plan helper copy now directly states that date / distance / time are entered and course is optional.

Round-trip candidates:
- Plan V0.7
- Simulation V0.13
- Course Settings V0.14
- GPX V0.15
- Activation V0.3
- Result V0.17
- Home V0.9

Unchanged:
- Plan semantics.
- Simulation engine semantics.
- Course / GPX unknown-value policy.
- Primary / Reference-100 semantics.
- ROF-J semantics.
- Notebook remains absent.
- Formal Current V1.16 / App V1.5R2 unchanged.

Candidate policy:
- Active root is not changed until smartphone confirmation.
