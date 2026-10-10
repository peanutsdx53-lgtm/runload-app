# G-01: prevent data overwrite when mobile activity archive cannot be read (2026-10-10)

## Reproduced data-loss defect

Before this patch, `listMobileExtensionRecords()` returned `[]` on any localStorage JSON corruption, non-array root or storage read rejection. `saveMobileExtensionRecord()` reused that display-only fallback and immediately wrote a new array, **silently replacing unreadable existing user bytes**. An interrupted write, external invalid format, or a browser storage API failure therefore risks data destruction on the next valid activity save.

A six-case independent regression was run against the prior code: **five expected failures (RED), one passing normal case**. It checked malformed JSON, object/null/string root, storage read exception, and normal empty/existing archive behavior.

## Narrow repair and data contract

Only the *write path* now uses `readMobileRecordsForWrite`: absent archive `null` creates an empty array; valid JSON array remains appendable; corrupted JSON/non-array/permission refusal causes a distinct fail-closed `MOBILE_ACTIVITY_RECORD_READ_FAILED`, without calling `setItem` or changing old data. Unavailable storage retains the previous `MOBILE_ACTIVITY_RECORD_WRITE_FAILED` code for existing callers and tests. The history read-only fallback retains its prior behavior (no destructive on-read repair). The save UI already reports save failure generically. No change to model engine, research data, scientific constants, output semantics or UI/UX layout.

## Regression and limitations

After patch, six-case new independent test **6/6 PASS**, existing mobile edge conditions remain valid, full Node test suite **424 PASS / 0 FAIL / 1 SKIP**. This protects against malformed/archive-read refusal; it does **not** establish complete G-01 browser/IndexedDB/iOS data safety or guarantee all multi-tab cases. It is an isolated fix under conditional approval, not an assertion that the complete 44-condition audit is finished.
