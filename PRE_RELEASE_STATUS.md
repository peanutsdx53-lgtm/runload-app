# RunLoad Pre-release Status

Date: 2026-09-20
Status: PRE-RELEASE REGULAR APP / iOS SCROLL-SURFACE RESUME RECOVERY

Verification:
- retained V1.6R2 regression harness with release cache literal updated: 251 / 251 PASS
- retained suites: 16 / 16 PASS
- retained JS/MJS syntax: 80 / 80 PASS
- dedicated iOS resume static audit: 13 / 13 PASS
- protected Primary core hash unchanged
- protected ROF-J core hash unchanged

Audited recovery refinement:
- The prior foreground recovery still reconciles stale dialog/subflow body classes.
- Visible fixed/internal scroll surfaces are now explicitly refreshed after iOS/PWA foreground resume.
- Scroll positions are captured before refresh and restored afterward.
- Course Editor, Record subflows/sheets, Result detail/sheets, History region sheets, Reading sheets, menus and guide/tutorial panels are covered.
- The document scroll surface is refreshed as a fallback for ordinary screens.
- Mobile internal scroll surfaces explicitly use iOS momentum scrolling.
- Recovery runs on both `pageshow` and visible `visibilitychange`.
- Final real-device iPhone confirmation remains pending.
- PWA cache version is bumped so existing installations receive the recovery code.

The app remains a development-stage research application. Scientific interpretation boundaries in the README and Current research package remain controlling.
