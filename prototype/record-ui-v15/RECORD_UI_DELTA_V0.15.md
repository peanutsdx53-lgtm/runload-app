# Record UI Prototype V0.15 — Body / Shoe Subflows

Date: 2026-09-18
Status: PROTOTYPE ONLY / FORMAL CURRENT UNCHANGED

Closed placeholder screens:
- "身体の記録" is now a real prototype input flow.
- "今回のシューズ" is now a real prototype input flow.

Body record:
- Explicit status: not checked / checked-no-region / record regions / consultation-oriented record.
- Reuses the same 12-region map grammar as Result.
- Selected regions have user-entered 1-5 degree and optional laterality.
- Common optional timing, sensation, and note.
- Consultation mode exposes only user-selected factual flags and a consultation note.
- RunLoad numeric results are not used to decide urgency.

Shoe / personal context:
- saved shoe selection
- shoe name / label
- optional save-for-next-time
- five active focus tags
- no duplicate free-text memo; free-text remains in Record "気づきと次回".

Navigation:
- Record primary navigation remains visible while subflows are open.
- Back returns to today's Record without forcing save.
- Each subflow has an explicit apply-and-return action.

Explicitly absent:
- Notebook.
- session-RPE.
- diagnostic or injury-risk judgment.

Formal Current V1.16 / App V1.5R2 unchanged.
