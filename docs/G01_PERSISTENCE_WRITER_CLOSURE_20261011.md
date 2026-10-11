# G-01 durable storage, recovery, and same-app concurrency — pre-UI completion assessment

## Formal acceptance meaning

The original G-01 criterion is that a record remains consistent on reopening after a completed save, and that a failed save/restore/update/delete is reported as a failure. The specified negative tests include concurrent actions, import/restore, capacity refusal and malformed data. This technical assessment is bounded to **supported browsers on secure origins, current officially supported data shapes, and RunLoad's own application routes**. It does not assert that Web Storage has multi-key atomic commits, that an unrelated same-origin website cannot mutate the same storage, or that every physical-device OS storage fault has been witnessed. Those limitations belong to E-07, release-hosting controls and D-01/D-02, and remain explicit release constraints.

## Exhaustive persistent-writer check

The new writer-census regression checks every runtime `.setItem` call across the application modules, including the shared storage gateway and auxiliary modules. The principal application storage owns 22 named namespaces (20 user-data keys and backup/recovery history), protected by `createStorageGateway` snapshot/preflight/conditional rollback and error propagation. The remaining current app writers are grouped by actual persistence type:

- Durable localStorage: primary gateway, mobile activity record store, mobile Quick Tools, mobile Home preferences, saved GPS routes, mobile achievements, tutorial-read state. All known main-record and backup write paths were covered by existing negative tests before this round, including corrupt backup recovery, data-size refusals, storage denial, restore selection races, IDB photo deletion while another tab holds the database, and GPX mutation.
- Transient sessionStorage: record-input workspace, temporary GPX/course flows, mobile walk/jog live analysis, boot recovery and Home launch visual state. These are not evidence that a completed user record is durably stored. They do not substitute for durable localStorage/IndexedDB testing.
- The origin-scoped exclusive Web Lock is acquired **before application route modules initialize**; a second RunLoad editor on the same supported origin is blocked instead of writing. Real Chromium 390px and 1440px tests verify the lock, saved-record reopen, backup reconstruction, and read-only history reacting to genuine cross-tab storage events. Cross-origin/other-project interference is separately identified and must not be described as a localStorage atomicity guarantee.

## New independently reproduced deficits and repairs

1. Mobile achievement state previously treated invalid JSON, future schema versions and non-object stored maps as an empty achievement state, then overwrote the damaged original. An unchanged history with additional unknown fields was silently pruned. A `QuotaExceededError` after marking an achievement as announced could still report it as consumed. The corrected write boundary rejects unreadable/future/corrupt state, preserves unrecognized prior fields, checks raw data just before writing, and returns no consumed announcements if persistence fails. Missing energy estimates no longer become measured zero in achievement statistics.
2. Tutorial-read history had the same corrupt-JSON-to-`{}` write problem. The non-essential tutorial state now refuses to rewrite damaged values or an intervening changed raw value. Failure does not stop running or saving.
3. The added independent test was RED 0/4 on original code and GREEN 4/4 after correction. A second independent writer ownership guard checks every `.setItem` location and the supported editor lock/transaction contracts.

## Scope and release constraints

- No existing user data are rewritten by migration; there are no storage-key changes, deletions, app-UI/UX redesign, new hosting requirements or source-document/model-coefficient modifications.
- Web Locks are supported browsers' *same-origin RunLoad-editor concurrency control*, not a claim that `localStorage` provides cross-key atomic commits. If Web Locks cannot be acquired, bootstrap already refuses to load the editable application.
- Conditional rollback is **best effort**; a quota-failing implementation can reject both forward writes and attempted rollback. The failure is not declared successful, and a manual backup/recovery flow may be needed. A universal power-loss recovery guarantee cannot be proved by JavaScript simulation.
- The localStorage scope is shared between GitHub Pages projects on the same user origin. This is still a deployment/privacy decision gate, not solved by this change.
- Supported current and protected old-v3.0 results stay version-tagged and read-only when appropriate. Unknown, not actually encountered archival schemas cannot legitimately be claimed to be verified.
- All existing node/browser regression suites, the new writer census and corruption/denial tests, and formal Source/Public, Git tree, Current manifest and Original Sources integrity checks must PASS before any change in the formal G-01 gate.
