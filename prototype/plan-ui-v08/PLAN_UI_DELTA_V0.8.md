# Plan UI Prototype V0.8 — Summary Copy Layout

Date: 2026-09-18
Status: PROTOTYPE ONLY / FORMAL CURRENT UNCHANGED

User feedback addressed:
- Small helper text overlapped the main text inside:
  - "前回の距離・時間を使う"
  - "走る／歩くの予定"

Changes:
- Details-card summaries now use a two-column grid:
  - left: minmax(0, 1fr) text block
  - right: disclosure arrow
- Main text and helper text are block-level and always stack vertically.
- Added explicit line-height and gap for smartphone widths.
- Kept existing wording and behavior from Plan V0.7.

Synchronized candidates:
- Plan V0.8
- Simulation V0.14
- Course Settings V0.15
- GPX V0.16
- Activation V0.4
- Result V0.18
- Home V0.10

Unchanged:
- Plan semantics.
- Simulation engine semantics.
- Course / GPX unknown-value policy.
- Primary / Reference-100 semantics.
- ROF-J semantics.
- Notebook remains absent.
- Formal Current V1.16 / App V1.5R2 unchanged.

Candidate policy:
- Active root remains unchanged until smartphone confirmation.
