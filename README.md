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
Latest Share Purpose refinement: dedicated V1.31 audit 18/18 PASS and modified JavaScript syntax 2/2 PASS. STEP 1 now contains only user-entered recipient/confirmation content, while body-region selection is part of STEP 2. The V1.30 Share Preparation workflow, protected calculation cores, storage implementation, and scientific source/model files are unchanged.
