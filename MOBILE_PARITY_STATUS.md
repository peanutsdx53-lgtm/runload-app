# RunLoad Mobile Prototype Parity Baseline

Date: 2026-09-20
Status: SMARTPHONE IMPLEMENTATION BASELINE / NAVIGATION ARCHITECTURE V2 VERIFIED

The smartphone UI is based on the frozen 15-screen prototype DOM/layout authority, with later audited smartphone refinements.

## Navigation rule
- Primary destinations remain Home / 記録 / 結果 / 履歴 / その他.
- Primary destinations use the RunLoad brand header and have no local back button.
- Auxiliary screens use one shared context header: back target on the left, current screen title in the center, global menu on the right.
- Global menu and primary navigation remain the only intentional app-wide duplicate navigation surfaces.
- Within a screen, the same target/object/purpose should have one navigation control.
- Different saved records or other different object IDs remain separate valid destinations.
- Navigation uses links; save/delete/state-change operations use buttons.

## Verification
- Retained V1.6R2 regression harness with the expected cache-version literal updated for this release: 251 / 251 PASS
- 16 / 16 retained suites PASS
- JS/MJS syntax: 80 / 80 PASS
- Dedicated navigation architecture audit: 29 / 29 PASS
- Protected `core/runloadCore.js` hash unchanged
- Protected `core/secondPillarRofJ.js` hash unchanged
- All 5 primary screens resolve without a local context-back header
- All 12 auxiliary screens resolve to a centralized context header
- Course Library duplicate recent/saved course actions are consolidated into one newest-first saved list
- Reading cards use one article-detail route
- Result body-region detail navigation is single-source from the body map; comparison rows are informational
- Settings -> Privacy preserves Settings as the parent and suppresses the redundant Settings action on that path
- Mobile context headers are sticky and use a >=44px back target
- Existing iOS Course Editor single-scroll and foreground recovery protections remain active
- PWA cache version is bumped so the updated navigation structure replaces prior cached assets

## Fixed scientific boundary
Navigation/UI changes do not alter course data semantics, ROF-J semantics, Reference-100 semantics, calculation inputs, source evidence, or the documented Direct/P1/P2 boundaries.
