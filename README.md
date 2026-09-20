# RunLoad

RunLoad is a pre-release regular web application for beginner runners to review their own running records, body-region Reference-100 values, subjective fatigue (ROF-J), history, plans, courses and local GPX information.

## Status
- Development-stage pre-release app for smartphone verification and iterative polish.
- This repository root is the deployable app, not the former UI/UX prototype.
- The frozen prototype is preserved in Git history and branch `archive/prototype-freeze-20260918`.

## Fixed interpretation boundaries
- Reference-100 is for within-region self-understanding; it is not a cross-region ranking.
- Distance is a separate running fact, not an automatic multiplier of the regional display.
- Missing or unsupported data is not converted to zero or fabricated q=1.
- ROF-J records subjective fatigue at the time of answering; it is not a readiness, recovery, safety or injury-risk score.
- session-RPE is not implemented.
- The app does not diagnose, prescribe, score injury risk/readiness/safety, or make automatic run/no-run decisions.
- Notebook is not part of this version.
- This version does not migrate or reinterpret old-app records.

## Data
App records are stored locally in the browser. GPX analysis is local-only in this version.

## Verification baseline
Latest user-language update: all 27 modified JavaScript files pass syntax audit; the user-facing legacy-term residual audit and balanced line-replacement non-interference audit pass. Protected calculation cores and storage implementation are unchanged. The retained 251-test V1.6R2 harness was not rerun against the exact V1.29 branch, so prior regression results are treated only as previous-release evidence.
