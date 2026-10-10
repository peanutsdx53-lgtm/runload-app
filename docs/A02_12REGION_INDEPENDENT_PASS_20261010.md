# A-02 — 12-region Reference-100 independent numerical crosswalk (2026-10-10)

**Criterion:** explain the R01–R12 formula, admissible inputs/conditions and meaning of a region-specific 100. **Verdict: PASS for the technical and numerical explanation criterion; not external validation of health outcomes.**

## Reproduction methods
- Oracle 1: standalone Python using source figures, published coefficients and expressly project-defined normalization; **does not import or execute JavaScript engine**. Full matrix: **55/55 PASS**.
- Oracle 2: independently hand-transcribed cadence/grade/environment restrictions and component ratios compared with live engine: **14/14 PASS**.
- Source-accuracy support: A-03 closed 2026-10-10 for seven source families, original figures, coefficient models and P1/P2 derivations. Historical Gazendam Figure 3 540-case sensitivity/rediscretization remains a project approximation, not raw measurements.
- Existing Golden74/74, science Boundary13/13 and all-node+browser CI are separate regression checks; **we do not count those as independent source replications**.

## Per-region explanation and independent sample
All ratios are normalized **within the same region**, not comparable in physical magnitude *between* body parts. Display = 100 × ratio, and a value >100 is not a diagnosis or injury-risk percentage.

| Region | Source and computation | Baseline m/s | Independent direct example (m/s) | Display 100×ratio |
|---|---|---:|---:|---:|
| R01 | Fukuchi (2017); positive/negative distance-normalized joint work (equal-weight project composite) | 2.50 | 3.50 | 129.2192 |
| R02 | Gazendam & Hof (2007); gluteal EMG activity normalized to 2.5 m/s | 2.50 | 3.50 | 89.4320 |
| R03 | Gazendam & Hof (2007); anterior thigh EMG activity normalized to 2.5 m/s | 2.50 | 3.50 | 90.1892 |
| R04 | Gazendam & Hof (2007); posterior thigh EMG activity normalized to 2.5 m/s | 2.50 | 3.50 | 82.1840 |
| R05 | Hagen (2023); PF joint stress impulse relative to 2.78 m/s | 2.78 | 3.00 | 94.9026 |
| R06 | Van Hooren & Meijer (2024); tibial stress impulse relative to 2.78 m/s | 2.78 | 3.33 | 84.9243 |
| R07 | Gazendam & Hof (2007); posterior lower-leg EMG activity normalized to 2.5 m/s | 2.50 | 3.50 | 81.0523 |
| R08 | Fukuchi (2017); positive/negative distance-normalized joint work (equal-weight project composite) | 2.50 | 3.50 | 96.2639 |
| R09 | Van Hooren & Meijer (2024); Achilles tendon strain impulse relative to 2.78 m/s | 2.78 | 3.33 | 85.1936 |
| R10 | Ho (2010); heel peak plantar pressure relative to 2.5 m/s | 2.50 | 2.00 | 89.2316 |
| R11 | Ho (2010); medial and lateral midfoot peak pressure (50:50 project composite) | 2.50 | 2.00 | 94.5696 |
| R12 | Ho (2010); three forefoot peak-pressure components (1/3 project composite) | 2.50 | 2.00 | 93.3037 |

## Domain and source-provenance boundaries
- 12 reference-point checks: exactly 100 at region-specific reference speed. Source families and definitions match current Authority.
- 12 representative speed examples, 12 below-domain samples, 12 above-domain samples, 7 bounded P1/P2 extension examples all match the independent oracle (55 cases in total).
- R01/R08 below 2.50 m/s use Jin→Fukuchi research-defined P2 bridge 2.25–2.50; R06/R09 2.25–2.78 m/s use bounded published-regression P1; R10–R12 above 2.50 m/s use Li→Ho research-defined P2.
- R05 joint cadence only within speed/relative cadence source hull; R09 cadence only at 3.33 m/s and ±10 steps/min; R06 cadence deliberately inactive.
- Grade numerical contributions only on source-native R05/R06/R09 at 2.78 m/s within ±6 **degrees**, and R10 at 2.00 m/s uphill 0–15 **percent**. Degrees are converted from grade percentage, not equated.
- Tested incompatible/missing cadence, out-of-condition grade, and R05 mixed grade-cadence; no unsupported multiplication. Surface and footstrike are contextual only (14/14 independent condition checks).
- A source-grounded numeric region response is an explanatory index, never an absolute biomechanical load, clinical safety threshold, or medically validated prediction.

## Historical model semantics
- Formal Current V2.47 model/output semantic version v3.1. Read-only historical v3.0 outputs are preserved and direct cross-version deltas blocked.
- Internal legacy identifier `FUKUCHI_POSITIVE_NEGATIVE_WORK_PER_STRIDE_NORMALIZED_50_50` remains for historical provenance compatibility. **Its name is not a dimensional formula:** implementation divides source work-per-stride by stride length before baseline normalization, yielding work per distance; documentation and explanations must state this accurately. It must not be presented as published injury risk.
- No original PDFs or private ROF-J author confirmations are redistributed by the public app.

## Reproduce
1. Run `node engine_crosswalk.mjs > engine_actual.json` in the audit evidence bundle with sibling V2.47 source at the recorded directory, or adjust the one source import line.
2. Run `python independent_oracle.py` and `python conditions_oracle.py` using standard Python only, after populating `conditions_actual.json` via the companion Node runner.
3. Inspect `a02_oracle_result.json` and `a02_conditions_result.json` for 55 and 14 true per-case PASS fields and 0 failures.

## Boundary of PASS
This PASS closes A-02 **technical algorithm explainability and independent calculation**. It does not close A-04 usability of comparisons, E-01 XSS, F group human comprehension, patient validation, participant studies, third-party clinical review, or browser implementation under future UI changes.
