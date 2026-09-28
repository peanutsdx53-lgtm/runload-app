# GPS Measurement

## Purpose

The smartphone measurement flow records observable running facts and carries supported values into the normal record flow.

Current mobile flow:

`start -> run-measurement preparation -> active measurement -> post-measurement -> record-input -> result -> run-route`

Desktop layout does not expose GPS measurement as an active feature. Records, plans, results, history, settings, storage, and the scientific calculation model remain shared.

GPS measurement does not replace or modify Reference-100 or ROF-J. It supplies measured or explicitly labelled estimated facts to the existing record flow.

## Runtime requirements

- HTML, CSS, and JavaScript only.
- HTTPS secure context is required for browser geolocation on deployed use.
- The user must explicitly allow location access.
- The application should remain in the foreground during measurement. Browser background or screen-lock GPS continuity is not guaranteed.
- Screen Wake Lock is requested when supported. Failure to obtain it does not stop measurement.
- Device motion access is optional and may require separate permission on some smartphones.

## Measurement modes

The preparation screen supports:

- free running;
- target duration;
- target distance.

Target-duration mode shows remaining time. Target-distance mode shows remaining distance. Reaching a target produces an in-app notice and, according to the user's settings and device support, a generated notification tone and vibration.

The user can pause and resume active measurement. Paused time is excluded from active duration and from the device-motion step estimate.

## GPS measurement logic

- Position source: `navigator.geolocation.watchPosition()`.
- High-accuracy location is requested.
- Position accuracy worse than 50 m is rejected.
- A segment implying speed above 15 m/s is rejected as implausible for the intended running use.
- Movement below 2 m is not added to distance unless enough time has passed for a stationary sample.
- Distance is calculated with the Haversine formula.
- Current pace uses approximately the latest 20 seconds and requires at least 30 m of movement in that window.
- Average pace uses accepted GPS distance and active elapsed time.
- When a saved plan has both distance and duration, its average planned pace can be used for comparison.
- A faster-than-planned condition must continue for 10 seconds before an in-app warning is emitted.
- Finishing a measurement requires at least 10 m of accepted GPS movement so that an accidental zero-distance record is not treated as a completed measured run.
- Stored routes are reduced to at most 2,000 points to limit browser storage use.

These values are implementation filters and UI behavior, not medical, injury-risk, or safety thresholds.

## Notification behavior

Measurement notification sound and vibration can be enabled or disabled separately in settings.

- Notification sound is generated in code with the Web Audio API; no external sound file is required.
- Audio is prepared from the user's measurement-start interaction so that supported mobile browsers can play later measurement notices more reliably.
- Vibration uses `navigator.vibrate()` only when the browser exposes it.
- Unsupported vibration does not block sound or visual notices.
- Goal-reached and pace-warning notices remain visible in the application even when sound or vibration is disabled.

## Estimated steps

When browser device-motion access is available, RunLoad can show and store **estimated steps**.

- Source: `DeviceMotionEvent` acceleration signals.
- Method: deterministic movement-peak and refractory-time detection.
- Stored/displayed status: estimated, not a validated pedometer measurement.
- If motion access is unavailable or denied, no step count is fabricated.
- No distance-to-height stride-length fallback is used.

## Estimated energy expenditure

The smartphone measurement flow can show **estimated energy expenditure (kcal)** when the required data are available.

- Body mass is read from the stored profile at measurement start.
- Accepted GPS distance and active duration produce an average speed.
- A running-speed MET value is selected from the controlled 2024 Adult Compendium running rows.
- Estimated energy uses `MET × 3.5 × body mass (kg) ÷ 200 × duration (min)`.
- Height is not used by this model.
- Missing body mass, insufficient distance, missing duration, or unsupported speed produces no estimate.
- The output remains an estimate and is separate from Reference-100, ROF-J, readiness, safety, and injury-risk interpretation.

The source record and exact model boundary are kept in `docs/references/mobile-measurement-energy-expenditure.md`.

## Course auto-analysis

The accepted smartphone GPS track can be used to reduce manual course entry after measurement.

Automatically carried or proposed values include:

- measured distance;
- active duration;
- saved route geometry when route saving is enabled;
- estimated steps when device motion is available;
- route-pattern candidate;
- uphill / flat / downhill candidate when altitude coverage is sufficient;
- estimated energy expenditure when eligible.

### Route pattern

The route pattern is a geometric candidate among loop, out-and-back, one-way, mixed, and unknown. It is editable before the record is saved and is not treated as ground truth.

### Altitude and grade

- Live GPS altitude and altitude accuracy can be preserved with accepted route points.
- Altitude is smoothed before segment-grade calculation.
- Implausible grade segments are excluded.
- Uphill / flat / downhill uses the existing ±1% directional boundary.
- Grade is treated as known only when usable altitude coverage reaches at least 80% of measured route distance.
- If altitude data are insufficient, slope remains unknown rather than inferred.

### Surface

Road or ground surface is not inferred from GPS alone. Surface fields remain user-confirmed inputs.

## ROF-J connection

The preparation screen and post-measurement screen use the same ROF-J input presentation as the normal record flow.

- PRE is optional.
- POST is optional.
- When used, the same run lifecycle is carried through measurement and record input.
- ROF-J remains a subjective fatigue record only and is not combined with GPS, pace, estimated steps, estimated energy, readiness, or safety decisions.

## Route map and external communication

The application uses an internal Web Mercator/slippy-tile renderer. No third-party JavaScript map library is bundled.

Map tiles are loaded from the OpenStreetMap standard tile service:

- `https://tile.openstreetmap.org/`
- Attribution is displayed as `© OpenStreetMap contributors`.

The application does not bulk-download or precache map tiles. Therefore the live map is the main measurement feature that requires external network access after the application itself has been cached.

The requested tile URLs necessarily correspond to the displayed geographic area. Saved records and stored GPS route data are not automatically uploaded to an external analysis service.

## Local storage and offline behavior

The application runtime files are precached by the Service Worker. After a successful online load and cache installation, the main application can start and use local record, result, history, plan, course, settings, ROF-J, local GPX, and other locally implemented functions without network access.

Expected exceptions include:

- OpenStreetMap map images;
- external reference links;
- browser features that depend on device/browser permission or platform support.

GPS positioning itself is supplied by the device/browser rather than by an application web API endpoint, but availability and quality depend on the device and operating environment.

## Saved measurement data

When route saving is enabled and the corresponding record is saved, supported measurement metadata can include:

- start/end timestamps;
- distance and active duration;
- route points;
- accepted/rejected GPS point counts;
- measurement mode and target;
- estimated steps and their provenance;
- route-analysis candidate metadata;
- estimated energy and its calculation provenance.

Saved GPS measurement data are linked to the saved record, included in supported application backup/restore handling, and removed together with the associated record according to the application's data-management workflow.

## Deliberate boundaries

The smartphone measurement feature does not automatically determine:

- road or surface material;
- a medically meaningful workload or risk state;
- readiness or recovery;
- injury probability;
- whether the user should run;
- reliable background tracking while the browser is suspended.

## Verification status

Deterministic helpers and integration contracts are covered by the repository test files, including GPS core logic, ROF-J handoff, energy estimation, auto-record handling, and notification settings.

Real-device acceptance remains necessary for behavior that cannot be guaranteed by static code inspection, especially:

- outdoor GPS quality;
- iOS and Android permission behavior;
- screen wake behavior;
- notification sound behavior;
- vibration support on compatible devices;
- device-motion step estimation;
- altitude availability and quality;
- OpenStreetMap tile loading.
