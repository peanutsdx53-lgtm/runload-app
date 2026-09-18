# Notebook UI Prototype V0.1

Date: 2026-09-18
Status: PROTOTYPE ONLY / FORMAL CURRENT UNCHANGED

## Basis
- Formal Current V1.16 / App V1.5R2 Notebook implementation inspected.
- Notebook role preserved: remember the day / experience.
- Earlier approved OneThing direction retained, but Current semantics remain the source of truth.

## V0.1 design
- Makes "今日の1つ" the single visual hero of the day page.
- Keeps the six Current oneThing themes unchanged:
  - 今日のからだ
  - 今日のコース
  - 今日できたこと
  - 今日の気づき
  - 次回見ること
  - 休む日のメモ
- Shows explicit selected facts from an existing run as supporting information, not as a second result screen.
- Does not infer rest from missing runs.
- Does not analyze free text or create achievement / risk / readiness scores.
- Current optional notebook content is staged under disclosures rather than shown all at once.
- Mobile editor uses a bottom sheet; desktop uses the same function in a centered dialog.
- Desktop day page uses a two-column composition; mobile remains single-column.
- Pinch zoom remains available; Safe Area and prefers-reduced-motion are considered.

## Unchanged
- Formal Current / App Source
- Notebook persistence semantics
- Primary calculation semantics
- Result V0.9 / Record V0.9 / History V0.7
- repository root redirect