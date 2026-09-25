# 走行記録アプリ

This browser-based application helps beginner runners review their own running records, body-region Reference-100 values, subjective fatigue (ROF-J), history, plans, courses, and local GPX information.

## Current application structure

The repository root is the deployable application.

- `core/`: deterministic domain logic and interpretation logic
- `screens/`: screen-level rendering and screen-specific composition
- `ui/`: shared presentation, navigation, interactions, and browser UI services
- `styles/`: theme tokens, shared layout/components, screen styles, responsive/mobile/desktop layers
- `tests/`: executable regression, boundary, navigation, presentation, and integration tests

See `docs/CODEBASE_ARCHITECTURE.md` for ownership and maintenance rules.

## Scientific and interpretation boundaries

- Reference-100 supports within-region self-understanding; it is not a cross-region ranking.
- Distance is a separate running fact, not an automatic multiplier of the regional display.
- Missing or unsupported data is not converted to zero or fabricated as q=1.
- ROF-J records subjective fatigue at the time of answering; it is separate from Reference-100.
- ROF-J is not a readiness, recovery, safety, injury-risk, or run/no-run score.
- session-RPE is not implemented.
- The app does not diagnose, prescribe training, estimate injury risk, or make automatic safety decisions.
- Legacy records are not silently reinterpreted as current Reference-100 values.

## Runtime technology

Runtime implementation is vanilla JavaScript, CSS, and HTML. The Web Manifest and PNG icons are deployment assets, and `.mjs` files are JavaScript regression tests. No framework or build step is required.

## Data and deployment

Application data is stored locally in the browser. GPX analysis is local-only. The repository root is the PWA/web deployment payload.

## Verification

Changes should keep all JavaScript/MJS syntax checks, runtime reachability checks, PWA precache-path checks, and all test suites passing.
