# B-04 / B-05 / C-04 independent startup and offline audit (Round 4)

## Scope and authority
- Base: Current V2.69 / Git tree `90c756e2f2ec54577a7558796e25fdf770564534`.
- Only essential runtime startup-control files changed following a reproduced failure: `core/internal/platformInfrastructure.js` and the three aligned version/cache labels. No scientific model, research archive, user records, cryptography, hosting topology, or UI layout changed.
- B-04: No files removed in Round 3. Round 4 intentionally fixes a late-load Service Worker registration defect, and therefore existing startup code is no longer byte-identical. All other runtime files preserve SHA except startup helper and aligned version labels. This is not a deletion-compatibility experiment.
- B-05: Responsibility structure is documented at `docs/CODEBASE_ARCHITECTURE.md`; 209 page modules plus SW are reachable, but function/handler level duplicate and CSS selector audit remains pending.

## Distinguish these environments explicitly
1. Ordinary development HTTP (`127.0.0.1`, `localhost`), including **Live Server-equivalent** static serving: `core/internal/platformInfrastructure.js` intentionally opts out of SW registration and unregisters existing local SW. Local startup does not prove a cold offline PWA reload.
2. Real VS Code + Ritwick Dey Live Server extension: **not installed/executed in this CI or container**; actual extension integration and operating-system GUI checks remain unverified.
3. Production-like trustworthy second-loopback origin `http://127.0.0.2` (browser secure context without TLS, not a real production hostname), served at a GitHub Pages-like `/runload-app/` path: SW registration, platform cache, real browser offline reload and localStorage retention are validated by the added browser test. This is a *simulation*, not a test of the real GitHub Pages domain or handset.
4. Physical device offline, GPS, app-installed launch, platform-specific permissions and mobile Safari remain separate D-01/D-02.

## Independently reproducible commands
- `node tests/b04B05C04StartupParityIndependent.test.mjs`: root vs project-subpath HTTP assets, correct MIME, no build, platform selection and SW path contract, offline inventory existence.
- `node tests/b04B05C04ColdOfflineRealBrowser.test.cjs`: real Chromium through Playwright, needs `npm install --no-save playwright@1.55.0` and `npx playwright install chromium`; it tests mobile and desktop viewport and local HTTP opt-out. CI can execute where hosted localhost Chromium navigation is allowed.
- `node tests/httpStartupContract.test.mjs`: preexisting simple HTTP asset gate.
- Full H01, A03, Desktop CI are still required for any merge.

## Explicit remaining boundaries
- The absence of a concrete Round 3 runtime deletion means no post-deletion legacy record migration compatibility can be newly claimed.
- A successful local HTTP response is not itself an interactive Live Server extension launch or user-device offline run. Do not upgrade C-04 based only on this test.
- GitHub Pages paths on same origin can access the same origin localStorage; these tests do not prove storage confidentiality.
- Offline availability does not guarantee map tiles or geolocation, which are outside self-hosted offline resources.
- Required B-05 audits at symbol, dynamic handler, CSS selector specificity and duplication depth are still incomplete; keep PARTIAL unless full gate evidence arrives.

## RED -> GREEN discovery and narrow repair
- H01 browser initially timed out waiting for the production-like Service Worker to control the app. This led to a direct real-production-source VM regression (`tests/b04PwaLateLoadRegistrationIndependent.test.mjs`): **RED 1/3 PASS, 2 FAIL**.
- `registerPwaServiceWorker()` attached a `window.load` listener even when the page had already finished loading after asynchronous ESM bootstrap; late registration never runs.
- The local development guard incorrectly compared `location.protocol` against `"http"` rather than `"http:"`, so it could not detect a normal loopback HTTP URL.
- Fix: dispatch registration/cleanup from `queueMicrotask` when `document.readyState === 'complete'`, otherwise keep existing one-shot `window.load` scheduling; correct `http:` comparison. GREEN 3/3 PASS, no app data or scientific model modifications.
- Synchronized cache and version from 2026.10.11.73 to 2026.10.11.74 so repaired startup code is not silently mixed with stale installed assets.
