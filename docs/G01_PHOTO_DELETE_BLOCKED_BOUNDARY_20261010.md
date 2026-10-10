# G-01 / G-03 — IndexedDB blocked deletion and transient-open safety audit

Date: 2026-10-10. Scope: the **experimental** photo store only. The retired smartphone memo UI stays removed.

## Defect and consequence

The previous `clearAllPhotoMemos` used `indexedDB.deleteDatabase`. A `deleteDatabase().onblocked` event is a notification of another tab's live connection, **not a cancellation** of the delete request. The old implementation rejected and returned `false` on this notification, but a pending deletion could later complete when the other connection closed. Subsequently saved photos could disappear asynchronously, after the user was informed the cleanup had failed. This could create inconsistent cross-store outcomes even though primary record deletion was conservatively refused.

The previous `openDatabase()` could also permanently cache an already rejected `Promise` if `indexedDB.open` raised an immediate exception. A temporarily unavailable API could therefore remain unusable in the same tab until refresh. An onblocked open could later succeed and leak a connection after its Promise was already rejected.

## Correction and invariants

- `clearAllPhotoMemos` now opens the existing object store and commits a single `readwrite` `clear()` transaction, rather than scheduling `deleteDatabase()`. Success means the photo **records** have been cleared; the empty schema persists. Failure returns `false` so primary app data is not cleared. There can be no delayed database-delete request from this API.
- Transient open failures invalidate the cached rejected Promise. A rejected blocked open that later succeeds closes its handle without adopting the result.
- The existing 20-photo atomic count-and-add limit, JPEG/size/dimension validation, and cross-store fail-closed behavior remain unchanged.
- `tests/g01PhotoBlockedDeletionBrowser.test.cjs` holds an independent connection in a second tab, clears photos, verifies the independent tab sees no rows while its database stays open, saves new photos and verifies none disappear after the other tab closes; it tests desktop and mobile viewport widths. A transient forced `indexedDB.open` exception must not prevent the module from recovering in the same browser session. It also tracks off-origin requests and unrelated localStorage.
- Existing source-contract tests are adjusted to enforce transactional clearing rather than an old, unsafe `deleteDatabase` implementation.

## Evidence boundaries

These checks prove the specified browser scenario using Chromium and the current source snapshot, not real iOS Safari, crash recovery, all legacy backup schemas, or cross-store atomic transactions across IndexedDB and localStorage. G-01 and G-03 must remain **PARTIAL** until their complete authority criteria are independently passed. A-10 and actual-device D-01/D-02 remain unverified. No scientific coefficients or private user records are changed.
