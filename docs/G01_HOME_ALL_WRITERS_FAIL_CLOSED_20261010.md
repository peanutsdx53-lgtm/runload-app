# G-01 — comprehensive mobile home persistent preference write boundary (2026-10-10)

## Finding and scope

The earlier guarded methods in `ui/interactions/mobileHomeLayoutState.js` did not protect *all* paths that can save the same three localStorage keys. `ui/mobileHomeWidgetIconSwap.js`, `ui/mobileHomeDropCoordinator.js` and `ui/mobileHomeEditScroll.js` wrote these keys directly. In addition, `ui/mobileHomeDefaultLayout.js` and `ui/mobileHomePageCapacity.js` used the generic `writeMobileHomeJson` utility, which previously suppressed errors without validating existing data. Browsing unreadable preferences safely defaults in memory, but the previous write paths could overwrite damaged yet potentially recoverable original bytes.

## Bounded repair

- `ui/mobileHomeGridUtilities.js` now implements one synchronous, fail-closed write gateway for exactly the existing layout, position and widget preference keys. The gateway validates the old raw JSON envelopes and prospective values before writing, refuses absent/denied storage, and checks for a changed value just before each write.
- A multi-key write first validates **all** referenced stored keys and refuses the entire edit if even the last item is damaged. If a later write fails, it makes a conditional best-effort rollback of earlier writes, never clobbering an intervening different value.
- The three direct drag/swap helpers now use the guarded gateway. Existing `writeMobileHomeJson` calls in first-use and page-capacity paths are protected by delegation to the same gateway. The original DOM layout/gesture algorithms are unchanged.
- Original preference keys and saved schema versions remain unchanged. No scientific model, records, user text, study originals, historical results or UI design were changed.

## Independent regression limits

- New Node tests exercise malicious/malformed JSON, arrays/null, bad envelope shape, denied read, missing keys, valid legacy layouts, last-key preflight rejection, successful multi-key writes, unknown/duplicate keys, `QuotaExceededError` after partial write, concurrent value replacement, storage absence and full writer static coverage.
- The new gateway is a data preservation layer, **not** a browser-global atomic transaction. localStorage has no all-key atomic commit and different tabs can still race after an equality check; the project-level exclusive editing lock remains independently required. A rollback may be blocked by denied storage and must not be presented as an unconditional guarantee.
- G-01 as a whole remains PARTIAL pending the other save/restore/permission and actual-device boundary conditions. Real iOS/Android storage quota behavior, browser crashes and every historical backup format have not been proved here.
