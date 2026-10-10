# G-01 — asynchronous backup selection race, fail-closed restore guard (2026-10-10)

## Verified failure on pre-fix source

The settings backup-file `change` listener awaited `inspectBackupFile(file)` without invalidating an earlier approved inspection first. Two independent data-protection failures were reproduced with deterministic, deferred read results:

1. A user selects backup A and completes its inspection, then selects B while B is still being read. The old restore button can still restore **A**, contrary to the current selection of **B**.
2. A slow inspection of A can finish after a faster inspection of B and overwrite B's displayed verification and `pendingRestoreInspection`, so restore may use the **wrong file**.

Before the fix, the focused tests for both scenarios failed; test assertions showed restoration of `A.json` after selection of B and late A replacing B's preview. In a restore operation this is a data-loss hazard because the current device records are replaced, even though the pre-restore backup mechanism itself remains in place.

## Corrective behavior

`ui/interactions/settingsInteractions.js` now uses a monotonically increasing selection generation, clears previously approved inspection/file identity immediately on each new selection, and displays a non-destructive pending-inspection message. When asynchronous work finishes, an obsolete generation or a changed actual `File` object cannot update the preview. A restore button additionally requires that its approved inspection matches `fileInput.files[0]` by object identity; name equality alone is insufficient. Clearing the selection invalidates all in-flight jobs. A failed read leaves restoration blocked.

This is a narrowly scoped behavioral correction to the existing backup-restore operation. It does not alter scientific computations, backup format, stored data, presentation architecture, UI/UX decisions, or the required pre-restore backup.

## Independent synthetic tests

`tests/g01RestoreFileSelectionRace.test.mjs`: four Node tests cover (a) immediate invalidation, (b) out-of-order completion, (c) removal during an in-flight read, and (d) changed `File` identity with the same filename. The tests use only synthetic backup inspections and mock the restoration operation; they do not manipulate user records. Before correction, the first two fail. After correction, all four pass.

CI/other test results must be attached separately. This closes a **specific G-01 race route**, not the overall G-01 audit criterion. Full cross-store durability, offline actual-device verification, and user approval of future UI/UX remain separately gated. No `PASS` claim is made for those areas.
