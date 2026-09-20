# RunLoad Pre-release Status

Date: 2026-09-20
Status: PRE-RELEASE REGULAR APP / MOBILE LAYOUT + RESUME RECOVERY PATCH

Verification:
- retained V1.6R2 regression harness with release cache literal updated: 251 / 251 PASS
- retained suites: 16 / 16 PASS
- retained JS/MJS syntax: 79 / 79 PASS
- protected Primary core hash unchanged
- protected ROF-J core hash unchanged

Audited UI refinements:
- Smartphone Record bottom clearance is increased from 68px to 96px so the collapsed final card can fully clear the fixed save controls.
- ROF-J current descriptor and official wording areas reserve stable two-line height; long official wording no longer changes the sheet's overall vertical geometry between adjacent slider values.
- Course Library "＋新しいコース" content is centered inside its control.
- Mobile Course Editor reserves additional bottom clearance above the fixed primary navigation.
- Course Editor save/cancel actions use the same centered control geometry.
- App foreground recovery reconciles visible modal/subflow state with body lock classes on `pageshow` and `visibilitychange`.
- The resume recovery path requires final real-device iPhone confirmation after deployment.
- PWA cache version is bumped so existing installations receive the corrected CSS and JS.

The app remains a development-stage research application. Scientific interpretation boundaries in the README and Current research package remain controlling.
