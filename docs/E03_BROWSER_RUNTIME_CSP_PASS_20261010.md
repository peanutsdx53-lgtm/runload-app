# E-03: Browser-enforced CSP and dependency scope (2026-10-10)

**Verdict: PASS for E-03 technical runtime security policy, with human/physical-device tests excluded.** This does not change E-01, E-02, D-01, D-02, C-04 or other separate criteria.

## Static accepted design
- Actual `index.html` Content-Security-Policy: default, script, font, connect, img, style, object, base URI, form, worker, and manifest origins explicitly constrained; script source `self`, no unsafe-inline scripts. The **only intentional inline exception is CSS** for no-flash boot support.
- Runtime third-party imagery: only `https://tile.openstreetmap.org/...` images, with explicit explanatory consent. Requests reveal displayed tile area to the service and are therefore not categorized as private/zero-external.
- Development-only localhost WebSocket exception: `ws://127.0.0.1:*` and `ws://localhost:*`, no all-origins wildcards. No remote JavaScript runtime library required.
- `object-src 'none'` and `base-uri 'none'`; escaped user data in HTML is separately audited in E-01, which remains PARTIAL.

## Independent real-browser exercise

Using GitHub Actions Linux Chromium + Playwright and a local HTTP app server, run `node tests/e03BrowserCspNetwork.test.cjs`. The script uses two viewports (1440x900 and 390x844), intercepts every external request before the network, and returns a synthetic valid one-pixel PNG only to allowed OSM tile image URLs. **No public tile service or other third-party receives any real recorded location from the test**. The synthetic map is mounted independently of app navigation to isolate CSP and consent behavior from later UI changes.

Assertions per viewport:
1. The real `index.html` loads and its app dependencies return no 4xx; zero third-party requests without consent.
2. Script, object, base-URI, localhost-only WebSocket, style and img-src policies present with exact intended origins and exceptions.
3. New map receives coordinate track without tile requests; visible consent text describes external data disclosure.
4. Explicit opt-in triggers only OSM image tile GET requests, and a browser-decoded PNG image appears (not a text-only/DOM-only claim).
5. Browser offline mode prevents new tile requests after zoom.
6. Development localhost WebSocket handshake completes under real CSP.
7. Inline CSS styling is applied; injected inline JavaScript is blocked; disallowed off-origin fetch and image are blocked, each with browser `securitypolicyviolation` evidence.
8. Every third-party request attempt is captured; there is no unwanted host in the trace.

`tests/auditMapPrivacyConsent.test.mjs`, `tests/distributionPrivacySurface.test.mjs`, complete nonbrowser Node suite, app JS syntax, and the original A-03/desktop/mobile CI run alongside this dedicated audit. GitHub Actions run URLs and commit identity are written to the current audit record after success.

## Scope boundaries

- This technical PASS does not mean **all user-generated data and every application workflow** was captured or that E-02 is closed. The latter needs the wider sources-to-sinks privacy flow audit and sensitive data redaction tests.
- It is not an actual VS Code Live Server extension test; its WebSocket exception is enforced in the browser against a faithful local server handshake, leaving C-04 separate.
- It is not a user's real GPS, a real OpenStreetMap network response, a physical device permission dialogue, or final accessibility/UX test.
- No UI or scientific formula changes are needed for this criterion. The test's headless browser dependency is CI-only and is not bundled with the static application runtime.
