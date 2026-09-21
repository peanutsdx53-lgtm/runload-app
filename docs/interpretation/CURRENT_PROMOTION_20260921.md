# Current Promotion — 2026-09-21

Status: COMPLETE

## Current artifacts

- `RunLoad_Current_App_Source_20260921.zip`
  - SHA-256: `2053df07c93ca1d73ae861ec3ee4fadc427f77e27780841a6dc8c37f77fc01ab`
- `RunLoad_Public_App_20260921.zip`
  - SHA-256: `65d099a18bed0e73a17b107c993eccf0150b217babfb7d98b867b384d445795b`
- `RunLoad_CURRENT_COMPLETE_20260921.zip`
  - SHA-256: `83118aa846c706da13250cff42b30ac64ea909a0b67423cef68b858e83ad083d`

## Verification

- result-understanding tests: **19/19 suites; 175/175 assertions PASS**
- previous Current regression: **17/17 suites; 273/273 assertions PASS**
- integrated App Source: **36/36 suites; 448/448 assertions PASS**
- JS/MJS syntax: **98/98 PASS**
- runtime SHA manifest: **78/78 PASS**
- App Source ↔ Public App hashed runtime: **78/78 byte-identical**
- protected Primary / ROF-J cores: **unchanged / PASS**
- CURRENT COMPLETE prepack self-verifier: **14/14 PASS**
- CURRENT COMPLETE fresh-extraction self-verifier: **14/14 PASS**

## Result-understanding feature

Why needed:
- displaying the 12-region result and ROF-J result alone does not guarantee that a beginner runner can identify what to inspect, what can/cannot be understood, and what should be checked next.

What it does:
- deterministically reorganizes persisted current results and compatible history into attention, comparison, known/unknown and next-check information without changing calculated values.

What it does not do:
- diagnosis;
- injury-risk prediction;
- safe/danger or run/rest decision;
- training prescription;
- causal inference;
- cross-region physical ranking;
- generative-AI free text.

## Publication note

PR #51 is merged to main.

A fresh GitHub Pages workflow run/artifact for this Current was not observed through the available GitHub interfaces. Therefore Current 2026-09-21 does not claim byte parity with a new Pages artifact.

## Next application phase

The result-understanding feature is closed.

Next:
1. PC/mobile layout correction;
2. small application defects;
3. final UI refinement.
