# RunLoad GPS Measurement

## Purpose

The GPS measurement flow records observable run facts before the existing RunLoad record flow.

Flow on the mobile layout:

`start -> run-measurement -> record-input -> result -> run-route`

The root entry follows the existing responsive breakpoint rather than browser/OS identification. Mobile-width layouts open the start choice screen; desktop-width layouts open the normal RunLoad home screen. GPS actions are de-emphasized on desktop, while records, plans, results, history, settings, storage, and scientific logic remain shared.

GPS measurement does not replace or modify the scientific calculation model. It supplies measured distance and elapsed time to the existing record input screen. A saved route is stored separately and linked to the saved record ID.

## Runtime requirements

- HTML, CSS, and JavaScript only.
- HTTPS secure context is required for browser geolocation. GitHub Pages provides HTTPS.
- The user must explicitly allow location access in the browser/OS.
- RunLoad should remain in the foreground during measurement. Browser background or screen-lock GPS continuity is not guaranteed.
- Screen Wake Lock is requested when supported. Failure to obtain a wake lock does not stop measurement.

## Measurement logic

The implementation is intentionally small and explainable.

- Position source: `navigator.geolocation.watchPosition()`
- High-accuracy location requested.
- Position accuracy worse than 50 m is rejected.
- A segment implying speed above 15 m/s is rejected as implausible for the intended running use.
- Movement below 2 m is not added to distance unless enough time has passed for a stationary sample.
- Distance is calculated with the Haversine formula.
- Current pace uses approximately the latest 20 seconds and requires at least 30 m of movement in that window.
- Average pace uses measured distance and elapsed time.
- When a saved plan has both distance and duration, its average planned pace is used as the comparison value.
- A faster-than-planned condition must continue for 10 seconds before an in-app warning is emitted.
- The warning is visual and attempts a short tone and vibration when supported.
- Stored routes are reduced to at most 2,000 points to limit browser storage use.

These values are implementation filters and UI behavior, not medical, injury-risk, or safety thresholds.

## Route map

RunLoad uses a small internal Web Mercator/slippy-tile renderer. No third-party JavaScript map library is bundled.

Map tiles are loaded from the OpenStreetMap standard tile service:

- https://tile.openstreetmap.org/
- Attribution is displayed in the map as `© OpenStreetMap contributors`.
- OpenStreetMap data is provided under the ODbL.
- Use of the standard tile service must follow the OpenStreetMap Foundation Tile Usage Policy.

The application does not bulk-download tiles or provide offline map tile storage.

## Data handling

GPS permission is requested only when the user starts measurement.

During measurement, RunLoad processes location points in the browser. If the user keeps **Save route on this device** enabled, the simplified route is stored in browser local storage after the corresponding RunLoad record is successfully saved.

Saved GPS routes:

- are linked by RunLoad record ID;
- are included in RunLoad backup/export data;
- are restored with supported backups;
- are removed when the associated record is deleted;
- are restored if that record deletion is undone;
- are removed by the application's full local-data deletion operation.

Displaying a map requires external requests for map images. The requested tile URLs necessarily correspond to the displayed geographic area. RunLoad does not automatically upload the saved RunLoad record or stored GPS route to an external analysis service.

## Deliberate boundaries

The GPS feature does not automatically infer:

- road or surface material;
- a medically meaningful workload or risk state;
- reliable elevation/grade from phone GPS;
- background tracking while the browser is suspended;
- location when the user has not started measurement and granted permission.

Surface and other course facts that affect the existing model remain user-confirmed inputs.

## Verification

The repository contains `tests/runMeasurementCore.test.mjs` for the deterministic GPS calculation helpers. Runtime files remain covered by `RUNTIME_SHA256SUMS.txt`.

Manual acceptance status (2026-09-23):

- iPhone: launch screen, screen transitions, map display, and location movement tracking passed.
- Run-dependent distance/pace behavior, pace warning, finish-to-record flow, and saved route behavior still require an actual run.

Real-device acceptance testing is still required for:

- iOS Safari/PWA location permission behavior;
- Android Chrome/PWA location permission behavior;
- GPS stability outdoors;
- screen wake behavior;
- audible/vibration warning behavior;
- OpenStreetMap tile loading over the deployed GitHub Pages origin.
