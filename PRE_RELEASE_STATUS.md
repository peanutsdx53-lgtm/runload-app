# RunLoad Pre-release Status

Date: 2026-09-20
Status: PRE-RELEASE REGULAR APP / DARK MODE THEME INTEGRITY PATCH

Verification:
- 302 / 302 tests PASS
- 18 / 18 suites PASS
- protected Primary core hash unchanged
- protected ROF-J core hash unchanged

Audited UI refinements:
- Legacy prototype color aliases now resolve to the current theme-token system.
- Fixed light-only backgrounds/text in History, Record, Result, Simulation, Course and GPX are replaced by theme-aware semantic tokens.
- Accent and model actions use theme-appropriate foreground tokens in dark mode.
- Disabled and placeholder states no longer rely on fixed light-palette colors.
- Key dark semantic color pairs meet a 4.5:1 contrast gate in the static regression suite.

The app remains a development-stage research application. Scientific interpretation boundaries in the README and Current research package remain controlling.
