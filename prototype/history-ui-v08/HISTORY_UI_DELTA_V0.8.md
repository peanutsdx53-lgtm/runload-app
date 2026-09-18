# History UI Prototype V0.8 — Past Note Archive

Date: 2026-09-18
Status: PROTOTYPE ONLY / FORMAL CURRENT UNCHANGED

Purpose:
- Keep History V0.7 comparison behavior unchanged.
- Retire Notebook as a separate creation/editing destination.
- Preserve only previously saved note content as a read-only archive under History.

Changes:
- Added "ノートありだけ表示" filter inside "記録を探す".
- Added "以前の記録ノート" action only to records that actually have archived note data.
- Added a read-only archive sheet with date, saved theme, saved text, and explicit saved facts.
- Added browser-back / Escape handling for the archive sheet.
- Removed the former generic Notebook action from History records.

Boundary:
- No new note creation.
- No note editing from the archive.
- No inference from missing note data.
- Existing History comparison semantics, Reference-100 meaning, period/region interactions, and sample comparison values are unchanged.
- Formal Current V1.16 / App V1.5R2 unchanged.
