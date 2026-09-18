# GPX Local Analysis Technical Prototype V0.1

Date: 2026-09-18
Status: TECH PROTOTYPE ONLY / NOT INTEGRATED / FORMAL CURRENT UNCHANGED

## Purpose
Test whether RunLoad can derive course-gradient input candidates from a user-selected GPX without external service integration.

## Privacy / external-service boundary
- GPX is selected explicitly by the user.
- Parsing and analysis occur in browser memory only.
- No GPX upload.
- No external map tiles.
- No elevation API.
- No fetch / XHR / WebSocket / EventSource / sendBeacon.
- CSP sets `connect-src 'none'`.
- This prototype does not persist the GPX or coordinates.
- Reloading/closing the page discards the selected data.

## Supported GPX content
- GPX 1.x XML root.
- Primary: trkseg/trkpt.
- Fallback: rtept.
- Distance calculated from latitude/longitude.
- Gradient analysis only where elevation `<ele>` exists.
- Missing elevation is NOT filled from an external service and is NOT silently imputed.

## Analysis method (input assistance only)
- 20 m spatial resampling of continuous elevation runs.
- 5-sample moving elevation smoothing (approximately 100 m around dense sample output).
- Local grade evaluated across a user-selectable 40 / 60 / 100 m distance window.
- Default flat band: ±1.0%, user-selectable ±0.5 / ±1.0 / ±2.0.
- Up / flat / down shares are distance-weighted across elevation-analyzable intervals.
- Representative uphill/downhill grade uses a distance-weighted median.
- Major sections are the longest contiguous classified sections >=60 m.
- Accumulated ascent/descent is approximate and based on the smoothed resampled elevation series.

These are technical input-assistance rules, not research Authority and not a medical/training judgment.

## Candidate-use gate
- Elevation coverage >=90%: candidate can be handed to Course Settings for confirmation.
- Elevation coverage <90%: shares are shown as reference for elevation-covered parts only and automatic handoff is disabled.
- No elevation: no gradient candidate; manual Course Settings route.

## Safety / integrity
- Reject DOCTYPE / ENTITY XML.
- 20 MB file limit.
- 100,000 point limit.
- Invalid coordinates are ignored.
- Unknown surface is never inferred from GPX.

## Not yet integrated
- Course Settings V0.1
- Simulation V0.3
- Record V0.9
- Formal Current V1.16 / App V1.5R2

Next gate after user review:
1. Validate iPhone file selection with real user-owned GPX.
2. Adjust wording / analysis controls if needed.
3. Only then integrate `GPXから読み込む` into Course Settings.