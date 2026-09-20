# RunLoad Pre-release Status

Date: 2026-09-20
Status: PRE-RELEASE REGULAR APP / NAVIGATION ARCHITECTURE V2

Verification:
- retained V1.6R2 regression harness with release cache literal updated: 251 / 251 PASS
- retained suites: 16 / 16 PASS
- retained JS/MJS syntax: 80 / 80 PASS
- dedicated navigation architecture audit: 29 / 29 PASS
- protected Primary core hash unchanged
- protected ROF-J core hash unchanged

Audited navigation refinements:
- The five primary destinations keep the RunLoad brand header and no local back action.
- Auxiliary screens use one centralized Settings-style context header with back / current title / global menu.
- Duplicate local back links are hidden on smartphone where the shared context header provides the same route.
- Course Library no longer exposes both recent-course and saved-course action routes for the same course; saved courses are newest-first.
- Course Editor has one cancel/return route via header and one bottom save action.
- Reading cards have one article-detail link.
- Result region comparison rows are informational; body-map regions are the single route to region detail.
- Settings -> Privacy preserves Settings as the parent; Privacy avoids a second Settings route on that path.
- Context-header back controls use a >=44px touch target and the mobile topbar is sticky.
- Existing iOS Course Editor single-scroll and foreground scroll recovery remain active.
- PWA cache version is bumped so existing installations receive the navigation update.

The app remains a development-stage research application. Scientific interpretation boundaries in the README and Current research package remain controlling.
