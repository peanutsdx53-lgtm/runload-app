# Mobile Measurement: Estimated Energy Expenditure — Source Record

Status: supporting reference for the smartphone-only measurement feature. This is not promoted to the RunLoad primary research foundation.

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

The official unit-conversion page also lists the ACSM running metabolic equation, but RunLoad should not adopt that equation automatically unless its validity range and grade handling are explicitly implemented and verified.

## Initial RunLoad implementation boundary

Recommended first implementation:

1. Use the user's stored **body mass (kg)**.
2. Use the completed measurement's valid running duration and GPS-derived average speed.
3. Select the corresponding running/jogging MET category from the controlled 2024 Adult Compendium table.
4. Estimate energy expenditure using the standard MET conversion.
5. Display the result as **推定消費エネルギー（kcal）** or equivalent wording that clearly indicates estimation.

Do not silently invent a default body mass. If body mass is missing or invalid, do not calculate the value.

## Height

Height is already available in RunLoad profile data, but the standard Compendium MET conversion above does **not** require height. Height must therefore not be inserted into the first calculation merely because it is available.

The Compendium also discusses corrected MET approaches in which individual characteristics may be used to adjust resting metabolic rate. Such a correction would be a separate model decision and requires its own implementation and validation boundary.

## Scientific / UI boundary

- This output is an estimate, not a direct calorimetry measurement.
- It is not a safety, recovery, readiness, injury-risk, or run/no-run judgment.
- It must remain separate from Reference-100 and ROF-J.
- GPS values that are not sufficiently valid must not generate a fabricated estimate.
- Run/walk sessions require special handling; they must not be treated as continuous running without an explicit model decision.
- Elevation/grade correction is not included in the initial model unless a reliable grade input and an appropriate validated equation are explicitly adopted.
- The Compendium itself notes that it was not developed to determine precise individual energy cost. RunLoad must therefore avoid wording that implies precision.

## Citation / provenance record

Retrieved and reviewed for RunLoad on 2026-09-28.

Supporting legacy reference:

Ainsworth BE, Haskell WL, Herrmann SD, et al. **2011 Compendium of Physical Activities: a second update of codes and MET values.** Medicine & Science in Sports & Exercise. 2011;43(8):1575-1581. DOI: 10.1249/MSS.0b013e31821ece12. PubMed: https://pubmed.ncbi.nlm.nih.gov/21681120/
