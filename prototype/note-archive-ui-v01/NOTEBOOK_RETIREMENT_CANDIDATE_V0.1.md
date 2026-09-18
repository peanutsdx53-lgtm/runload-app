# Notebook Retirement Candidate V0.1

Date: 2026-09-18
Status: PROTOTYPE / NOT FORMAL CURRENT

## Proposed product role
- Stop creating new independent Notebook pages.
- New user reflections remain in Record:
  - 今回の気づき
  - いつもとの違い
  - 次回確認したいこと
- History remains the place to find and compare past records.
- Existing Notebook content is preserved as a read-only archive under History.

## Existing data boundary
Do NOT silently remap Notebook fields into Record fields.

Preserve as original Notebook-origin data:
- oneThingTheme
- oneThingNote
- pageTitle
- dailyComment
- selectedMaterials / references
- monthlyIssue data where present
- observation-loop metadata where present

The prototype shows the human-readable archive concept only. Formal implementation must retain storage/backup compatibility until an explicit migration/retirement rule is approved.

## Navigation candidate
- Remove Notebook as a creation destination / feature destination.
- No primary navigation slot is added.
- History may expose a subordinate link: 以前の記録ノート.
- Archive is read-only; related saved record may be opened when a valid reference exists.

## Why
Record V0.9 already owns new reflection input, while History owns past-record retrieval/comparison. A separate Notebook creation workflow duplicates those roles and adds another diary-like surface.

## Unchanged
- Formal Current V1.16 / App V1.5R2
- Record V0.9
- Result V0.9
- History V0.7
- existing persisted data
- repository root redirect
