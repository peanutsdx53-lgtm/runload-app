# Mobile Measurement: Estimated Energy Expenditure — Source Record

Status: supporting reference for the smartphone-only measurement feature. This is not promoted to the RunLoad primary research foundation.

Implementation status: implemented for the mobile measurement flow in app version `v2026.09.28.15`.

## Purpose

RunLoad may display an **estimated energy expenditure (kcal)** for smartphone GPS running measurements. It must not be presented as a directly measured calorie value.

## Primary supporting source

Herrmann SD, Willis EA, Ainsworth BE, et al. **2024 Adult Compendium of Physical Activities: A third update of the energy costs of human activities.** Journal of Sport and Health Science. 2024;13(1). Open-access full text is available through PubMed Central.

- Open-access article: https://pmc.ncbi.nlm.nih.gov/articles/PMC10818145/
- Official Adult Compendium: https://pacompendium.com/adult-compendium/
- Official Running MET table: https://pacompendium.com/running/
- Official unit conversions / metabolic equations: https://pacompendium.com/unite-conversions/
- Official downloadable 2024 Adult Compendium PDF: https://pacompendium.com/wp-content/uploads/2024/03/1_2024-adult-compendium_1_2024.pdf

## Relevant definitions and conversions

The official Compendium material states:

- 1 MET = 3.5 mL O2/kg/min.
- 1 MET = approximately 1 kcal/kg/hour.
- METs to kcal/min: MET × 3.5 × body mass (kg) ÷ 200.
- The 2024 Running table provides speed/activity-specific MET values for running and jogging.

The official unit-conversion page also lists the ACSM running metabolic equation, but RunLoad does not use that equation in this implementation because grade handling and its implementation boundary have not been adopted.

## Implemented RunLoad model

Model ID: `adult-compendium-2024-running-speed-v1`

Implementation file: `ui/runMeasurementEnergy.js`

The implementation:

1. Takes the user's stored **body mass (kg)** at measurement start.
2. Uses GPS-derived running distance and the measurement's active duration (paused time excluded by the measurement layer).
3. Calculates average speed.
4. Selects a level-running/jogging MET value from the controlled 2024 Adult Compendium Running table.
5. Calculates estimated energy using `MET × 3.5 × body mass (kg) ÷ 200 × duration (min)`.
6. Displays the value as **推定消費エネルギー**.
7. Stores calculation provenance together with the saved measurement when measurement metadata is persisted.

### Included running rows

The first model uses only the level speed-based running/jogging rows from codes `12026`, `12028`, `12029`, `12030`, `12045`, `12050`, `12060`, `12070`, `12080`, `12090`, `12100`, `12110`, `12115`, `12120`, `12130`, `12132`, `12134`, and `12135`.

The supported speed domain is therefore 2.6 to 14.0 mph. The model does not extrapolate outside that domain.

Some official speed rows contain small gaps. When an average speed falls inside one of those gaps, RunLoad selects the nearest adjacent official speed band. It does **not** interpolate or invent a new MET value. The stored `mapping` field records whether the speed was within an official range or was assigned to the nearest adjacent range.

### Excluded rows / conditions

The initial model does not automatically use:

- jog/walk combination rows,
- uphill/downhill rows,
- hilly terrain rows,
- stairs,
- competitive track rows,
- stroller/backpack/barefoot variants,
- corrected MET / resting-metabolic-rate adjustment.

These require separate model decisions if they are added later.

## Missing / invalid data behavior

No estimate is generated when:

- stored body mass is missing or outside the app's accepted profile range (25–180 kg),
- valid GPS distance is below 10 m,
- duration is unavailable,
- average speed is outside the supported running speed domain.

RunLoad does not silently invent a default body mass or substitute another value.

## Height

Height is already available in RunLoad profile data, but the standard Compendium MET conversion above does **not** require height. Height is therefore not used in this first calculation.

The Compendium also discusses corrected MET approaches in which individual characteristics may be used to adjust resting metabolic rate. Such a correction would be a separate model decision and requires its own implementation and validation boundary.

## Stored provenance

When an estimate is available, the measurement metadata preserves:

- model ID,
- estimated kcal,
- selected MET,
- Compendium activity code,
- speed-band mapping type,
- body mass used,
- average speed used,
- active duration used.

This is intended to keep the estimate reproducible even if the user's profile body mass changes later.

## Scientific / UI boundary

- This output is an estimate, not a direct calorimetry measurement.
- It is not a safety, recovery, readiness, injury-risk, or run/no-run judgment.
- It remains separate from Reference-100 and ROF-J.
- GPS values that are not sufficiently valid do not generate a fabricated estimate.
- Run/walk sessions require special handling; they are not treated as continuous running without an explicit model decision.
- Elevation/grade correction is not included in the initial model.
- The Compendium itself notes that it was not developed to determine precise individual energy cost. RunLoad therefore avoids wording that implies precision.

## Citation / provenance record

Retrieved and reviewed for RunLoad on 2026-09-28.

Supporting prior reference:

Ainsworth BE, Haskell WL, Herrmann SD, et al. **2011 Compendium of Physical Activities: a second update of codes and MET values.** Medicine & Science in Sports & Exercise. 2011;43(8):1575-1581. DOI: 10.1249/MSS.0b013e31821ece12. PubMed: https://pubmed.ncbi.nlm.nih.gov/21681120/
