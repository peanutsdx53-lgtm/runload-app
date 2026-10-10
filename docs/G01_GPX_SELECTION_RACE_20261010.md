# G-01 GPX file-selection race, scientific input provenance — 2026-10-10

## Reproduction and scope
The local GPX upload step asynchronously awaited `File.text()`. The previous listener committed analysis and enabled Apply without verifying that the inspected File was still the browser's selected file. If A took longer than B, A could replace B's visible analysis; clearing or resetting during pending A could subsequently revive A. A same-named File object substituted without a change event could also be applied incorrectly. This could transfer an unreviewed course/slope candidate into Course Settings and corrupt the provenance of a user's later model input.

Six independent synthetic file-read and DOM-integration Node tests bind the **real** `bindGpxAnalysis` handler. Before patch: 4 failures / 2 passes. After patch: 6 passes / 0 failures, with the existing eight GPX presentation, parse, filename-escape and missing-data tests passing. No external XML file or user information was used.

## Narrow non-UI repair
- Increment a selection revision and invalidate the previous candidate and Apply approval immediately on every selection and reset.
- After awaiting File.text(), and before publishing the result, verify revision and **File object identity**. Discard stale successes and stale errors without changing the newest result or status.
- Store the exact approved File object; refuse Apply whenever the selected object is different, there is no approved candidate, or Apply is disabled.
- Preserve all existing text, scientific grade, score, course navigation, parser constraints and HTML encoding behavior.
- Increment PWA cache/UI version to `2026.10.10.69` so browsers do not mix cached modules.

## PASS boundary
This verifies a specific local GPX scientific input provenance and no-stale-Apply invariant. G-01 overall remains PARTIAL, including as-yet-unaudited storage modes, cross-browser file APIs, device quota failures and old backups. No model coefficient, reference source, old records, authority or general UI/UX has been changed. Full Node, GitHub Chromium workflows, Git source tree and formal Current verification are additional mandatory release gates.
