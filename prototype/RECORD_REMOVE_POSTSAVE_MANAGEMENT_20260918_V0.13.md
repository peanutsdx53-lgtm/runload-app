# Record V0.13 — Remove Post-save Management Placeholder

Date: 2026-09-18
Status: PROTOTYPE ONLY / FORMAL CURRENT UNCHANGED

Decision:
- Remove "保存後の管理 / 保存済み記録とバックアップ" from Record.
- Record is for entering and saving the current record only.
- Saved-record lookup/edit belongs to History.
- Backup/restore belongs to future Settings / More design.

Record end structure:
1. 気づきと次回
2. save controls
3. persistent primary navigation

Synchronized prototype set:
- Home V0.5
- Record V0.13
- Result V0.13
- History V0.12
- Plan V0.4
- Simulation V0.9
- Course Settings V0.11
- GPX V0.12

Unchanged:
- Record 1 -> 2 -> 3 -> 4 hierarchy.
- Persistent primary navigation introduced in Record V0.12.
- Mobile Draft / Save bar remains above primary navigation.
- Primary / Reference-100 semantics.
- ROF-J semantics.
- Course / GPX unknown-value policy.
- Formal Current V1.16 / App V1.5R2.
- Notebook remains absent.
