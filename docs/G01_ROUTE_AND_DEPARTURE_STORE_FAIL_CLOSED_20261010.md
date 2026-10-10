# G-01 — fail-closed GPS route archive and departure-check storage (2026-10-10)

## Verified pre-fix loss paths

`ui/runMeasurementState.js` read a missing/invalid localStorage JSON array through a display-oriented `readJson(..., [])` fallback. `commitPendingRunMeasurement` would then write a new one-item array, overwriting an old damaged-but-recoverable raw GPS archive. If localStorage access was blocked, the `storage('local')` fallback silently wrote to an in-memory map, returned `saved: true`, and cleared the pending GPS measurement; the route was not persisted on device.

`ui/mobileQuickToolsStore.js` had the analogous issue: `loadMobileQuickTools()` intentionally converts unreadable archives to empty collections for display, but both add and delete used it as write authority. A corrupted departure-check archive could be replaced by an apparently successful new archive. Existing unversioned partial records and retired memo collections must be preserved.

Independent synthetic regression `tests/g01PersistedRouteAndQuickToolsFailClosed.test.mjs` reproduced **5 failed / 3 passing of 8 pre-fix tests**. No user data, model coefficients, scientific originals, or private author material were used. The pre-fix log is retained only in non-public Current verification material.

## Fix and data contract

- Route commits now require direct access to actual persistent localStorage. They distinguish missing key (empty new collection) from denied access, malformed JSON, nonarray data, or structurally invalid entries. Any unreadable archive returns `RUN_MEASUREMENT_STORAGE_READ_FAILED`, `saved:false`, and **does not clear pending measurement** or write to storage. Quota errors likewise preserve the pending measurement.
- `findSavedRunMeasurement` remains a non-mutating display path; it does not grant write authority.
- Quick-tool mutations use a strict storage reader, rejecting denied access, bad JSON, future schema versions and malformed collections without modifying raw bytes. It accepts original unversioned, partially populated historical archives; all retired memo collections and unknown fields remain untouched. No retired memo UI is restored.
- The existing record-save interaction already displays a post-save warning when GPS route persistence returns `ok:false`; no UI layout or text changes were necessary.
- Explicit version change to `2026.10.10.68` across Service Worker cache, app-version page and About page to prevent old script/cache mixing.

## Evidence and restrictions

`node --test tests/*.test.mjs` **434 total / 433 PASS / 0 FAIL / 1 SKIP** locally after the fix (including 9 new adversarial tests). JS/MJS syntax all pass. `mobileMeasurementAutoRecord` test now provides a deterministic mock persistent storage instead of relying on the old unsafe memory fallback.

A PASS here establishes only the above bounded technical conditions. G-01/G-02/G-03/G-04 all-device storage/recovery, incomplete 44-condition audit, inaccessible old-schema backup coverage, actual iOS/Android offline, and requested user-facing UI/UX decisions remain separately gated. Do not change their status solely because these new regressions pass.
