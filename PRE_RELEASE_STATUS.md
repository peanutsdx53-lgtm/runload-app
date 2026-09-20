# RunLoad Pre-release Status

Date: 2026-09-20
Status: PRE-RELEASE REGULAR APP / COURSE EDITOR SINGLE-SCROLL FIX

Verification:
- retained V1.6R2 regression harness with release cache literal updated: 251 / 251 PASS
- retained suites: 16 / 16 PASS
- retained JS/MJS syntax: 80 / 80 PASS
- protected Primary core hash unchanged
- protected ROF-J core hash unchanged

Audited refinement:
- The smartphone Course Editor no longer creates a second full-screen fixed scroll container inside the normal app shell.
- Its content now uses the same document scroll surface as the rest of the smartphone app.
- The internal sticky "コース一覧 / 新しいコース" header is hidden on smartphone to prevent the duplicate-header/overscroll state observed on iPhone.
- A normal in-content "‹ コース一覧" return link preserves the navigation path.
- Existing Course Editor bottom clearance and centered action-button corrections remain active.
- Desktop Course Editor behavior is not changed.
- Prior iOS foreground recovery remains as a fallback for other transient scroll surfaces.
- Final real-device iPhone confirmation remains pending.
- PWA cache version is bumped so existing installations receive the corrected structure.

The app remains a development-stage research application. Scientific interpretation boundaries in the README and Current research package remain controlling.
