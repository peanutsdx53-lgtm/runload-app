# Mobile Measurement Auto-Record — Implementation Boundary

Status: smartphone-only supporting feature. This does not alter the RunLoad primary scientific model, Reference-100, or ROF-J.

## Purpose

Reduce manual entry after smartphone GPS measurement by carrying objectively observable or cautiously estimated running facts into the normal record form.

## Automatically carried facts

- GPS distance
- active measurement duration (paused time excluded)
- GPS route track when route saving is enabled
- estimated energy expenditure from the separately documented 2024 Adult Compendium model
- estimated steps when device motion access is available
- GPS-derived route-pattern candidate
- GPS-altitude-derived uphill / flat / downhill candidate when altitude coverage is sufficient

## Estimated steps

Model ID: `device-motion-peak-v1`

The first implementation uses browser `DeviceMotionEvent` acceleration signals and a deterministic peak/refractory rule. It is displayed and stored as **推定歩数** / `ESTIMATED`, not as a validated pedometer measurement.

Important boundaries:

- Motion permission may be required on iOS.
- If motion access is denied or unavailable, RunLoad does not fabricate a step count.
- No distance ÷ height stride-length fallback is used in this version because no controlled source/model has yet been adopted for that conversion.
- Paused measurement time does not accumulate steps.
- The algorithm is a usability estimate and has not been validated against a research-grade step counter.

## Course auto-analysis

Model ID: `gps-course-analysis-v1`

The first implementation uses the accepted smartphone measurement track.

### Route pattern

RunLoad classifies a route as a candidate among:

- LOOP
- OUT_AND_BACK
- ONE_WAY
- MIXED
- UNKNOWN

The classification is a geometric heuristic using start/end proximity and route retracing. It is not treated as ground truth.

### Grade / elevation

- Live GPS altitude and altitude accuracy are preserved with the stored route points.
- Altitude is smoothed before segment-grade calculation.
- Clearly implausible grade segments are excluded.
- Uphill / flat / downhill uses the same ±1% direction boundary already used by local GPX analysis.
- Grade is only marked `KNOWN_PROFILE` when usable altitude coverage reaches at least 80% of measured route distance.
- If altitude data are insufficient, slope remains unknown rather than inferred.

### Surface

Road / ground surface is **never inferred from GPS alone** in this implementation.

All surface fields stay `UNKNOWN` / 0 until the user supplies them. This prevents GPS route automation from silently converting map/location assumptions into model inputs.

## Record handoff

On smartphone measurement handoff:

- distance and duration remain the measured values;
- a device-motion step estimate is inserted as `stepsProvenance = ESTIMATED` when available;
- route pattern and grade candidates are inserted into the course fields;
- surface is explicitly left unknown;
- the user can edit the values before record save;
- the user can optionally save the GPS-derived course conditions to the course library.

## Separation from scientific outputs

These measurement conveniences do not directly modify:

- Reference-100 calculations,
- ROF-J values,
- readiness / recovery,
- injury risk,
- safety decisions,
- run / no-run decisions.

Any future use of these fields by a scientific model requires a separate source/trace/model-boundary review.
