# RUNNING_PRIMARY — scientific calculation candidate (not active)

**Status: isolated, prerelease, not connected to any app screen/storage or runtime import.**

This package implements the research Current A1/A2/B reference model on a separate code path, without modifying the installed `core/internal/primaryModelEngine.js` (v3.1), experimental `mobileWalkJogSpeedModel.js`, any UI, backup, ROF-J or persistence logic.

- `runningEvidenceRegistry.js`: read-only 12-series registry transcribed from Current/18 (reference originals and anchors) and Current/13 (Gazendam coefficients). A2 values in Current/18 are formula-derived demonstration points, **not independently measured published points**.
- `runningEvidenceEngine.js`: A1 published anchors / A2 source equation / B adjacent-within-source linear interpolation; reject invalid speed, mixed gait, unsupported activity, unapproved E, out-of-range; return evidence provenance, source SHA, original units, reference signature, semantics. Running-record adapter returns **literature reference only**, never a personal measurement.
- `tests/zScienceRunningEvidenceCandidate.test.mjs` plus `tests/fixtures/research/{current18,current19,current13}.csv`: SHA-pinned **independent Current data** for 65 original/model anchor checks, 53 prior direction checks, selected boundary and E negative checks. Fixtures are separate from engine records and never generated from engine outputs.

Run from the source root:

```sh
node --test tests/zScienceRunningEvidenceCandidate.test.mjs
node --test tests/*.test.mjs
```

Not yet done: actual product routing or UI integration; 42-case boundary/ROF-J/storage end-to-end tests on the **new** engine; full model and meaning-version migration; 12-region detail display, interpretation and history; browser/real-device tests; validation of the full 19-person OSF aggregate. None of these may be called PASS based on this candidate.

Current strictly overlapping running speed interval: **10.008–12.0 km/h**; 1.992 km/h wide. No accepted E extensions. No inter-study bridge or extrapolation. Historical records and results retain original model semantics.

**Do not promote this folder to runtime until user accepts the latest UI baseline and end-to-end product tests meet the formal scientific acceptance conditions.**
