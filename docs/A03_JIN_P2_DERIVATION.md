# A-03: Jin (2018) to Fukuchi (2017) low-speed P2 derivation

## Status and scope

This is a **RunLoad project-defined, cross-source bridge**, not a value directly reported by Jin or Fukuchi, not external validation, and not an injury-risk probability. It applies only to R01 (hip) and R08 (ankle), for 2.25 <= running speed < 2.50 m/s. At 2.50 m/s, the Fukuchi-based reference is 100.

## Published inputs and adopted operation

Jin (2018), dissertation Table 3.2, stance-phase positive/negative joint work (J/kg), at 2.2 and 2.6 m/s:

| Region | Positive work at 2.2 | Positive at 2.6 | Negative at 2.2 | Negative at 2.6 |
|---|---:|---:|---:|---:|
| R01 hip | 0.05 | 0.13 | 0.12 | 0.13 |
| R08 ankle | 0.51 | 0.46 | 0.31 | 0.31 |

For each component C in {positive, negative}, compute the research interpolation

`C(v) = C(2.2) + (C(2.6)-C(2.2))*(v-2.2)/0.4`

for v = 2.25 and 2.50 m/s, then

`B_region(2.25) = [ C_positive(2.25)/C_positive(2.50) + C_negative(2.25)/C_negative(2.50) ] / 2`.

Define `B_region(2.50) = 1`. The adopted endpoint ratios are:

- R01: 0.7482174688057041.
- R08: 1.0330687830687831.

Linearly interpolate between the 2.25 and 2.50 endpoints for speeds within the bounded P2 interval. Multiply this ratio by 100 for the region-specific reference-100 display. Speeds below 2.25 are out of this model's coverage; do not extrapolate.

## Limits and retention

Neither 2.25 nor 2.50 m/s was directly measured in Jin Table 3.2. The join to Fukuchi's 2.50 m/s baseline and the 50/50 weighting are RunLoad research choices, and **do not establish empirical equivalence of the two source populations, stance/stride conditions, or instruments**. Values are within-region workload-response indices, not diagnoses or clinical thresholds. The 2.50 m/s anchor is a design normalization and does not transfer the source's original units across studies.

Old result records with model version `runload-primary-regional-reference100-v3.0` and original snapshot `PRIMARY_REGIONAL_REFERENCE100_V3` remain available as historical read-only data. New records use model/output v3.1 and snapshot `PRIMARY_REGIONAL_REFERENCE100_V3_1`. Both versions may coexist but **must not be used for direct numerical deltas across model versions**. The old coefficient values are not overwritten or silently relabeled. Archived invalid old results are not replaced with new calculations.

## Independent checks

Original-source numerical crosswalk for Jin R01/R08 and original-v3.0 backup restoration regression are included in A-03 audit evidence. Full test-suite results for the exact Git tree must be verified via the linked A-03 CI workflow before release. The original dissertation PDF is part of the private research archive and is not redistributed by this source file.
