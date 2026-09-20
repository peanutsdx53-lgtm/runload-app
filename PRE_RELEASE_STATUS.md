# RunLoad Pre-release Status

Date: 2026-09-20
Status: PRE-RELEASE REGULAR APP / RECORD BOTTOM-CLEARANCE PATCH

Verification:
- Record collapsed-card bottom-clearance audit: PASS
- retained V1.6R2 regression harness with release cache literal updated: 251 / 251 PASS
- retained suites: 16 / 16 PASS
- retained JS/MJS syntax: 79 / 79 PASS
- protected Primary core hash unchanged
- protected ROF-J core hash unchanged

Audited UI refinement:
- On smartphone Record screens, the screen-level bottom padding is increased from the shared 42px baseline to 68px.
- The change applies only below 55rem, where the fixed mobile save bar and primary navigation coexist.
- Collapsed optional card 4 can now scroll fully above the fixed save controls instead of ending beneath them.
- No form structure, record data, validation, calculation, or comparison semantics are changed.
- PWA cache version is bumped so existing installations receive the corrected CSS.

The app remains a development-stage research application. Scientific interpretation boundaries in the README and Current research package remain controlling.
