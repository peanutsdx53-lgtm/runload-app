# E-01: reflected HTML attribute injection in support navigation — non-UI repair (2026-10-10)

## Original defect and why it matters

A URL fragment parameter `returnTo` was accepted in `screens/shared/supportGuidanceScreen.js` when it began `#/consultation`, `#/record-input`, or `#/more`. Although those prefixes prevented an arbitrary external navigation target, they did **not** remove HTML metacharacters. Both `href="${backHref}"` insertions then parsed attacker-controlled quotation marks or elements into the HTML document. In particular an adversarial `#/record-input\"><img src=\"https://tile.openstreetmap.org/0/0/0.png\" ...>` could create an unsanctioned image element, even when inline event handlers were blocked by the existing CSP. CSP is a valuable second layer, **not** a replacement for escaping.

## Repair

Use the existing `escapeHtml()` on the `backHref` value at **both** HTML attribute insertion points; preserve the current internal fragment routing and label logic. Do not change public advice, the scientific calculation, private original materials, external emergency URLs, or the page design. The browser decodes escaped query-string ampersands back into correct `href` attribute values. Bump PWA cache/application/About version to `2026.10.10.72` so cached clients can retrieve the repaired module.

## Independent verification

- Before fix: 5/5 deterministic Node regression cases failed (malicious `returnTo` and ordinary route attr fidelity) using original `supportGuidanceScreen.js`.
- After fix: the same 5/5 pass; real headless Chromium DOM parser verifies three hostile paths produce exactly two intact internal back-links and zero unexpected images, SVG, event-handler attributes or attack attributes.
- Complete Node suite: 493 PASS, 0 FAIL, 1 SKIP (494 total). JS/MJS syntax 407/407 PASS. Browser/GitHub CI gates required before merge and formal Current synchronization.

## Acceptance limitations

**E-01 overall remains PARTIAL.** This closes one independently verified source-to-sink flaw, not a claim that all 43 originally listed sink locations, imported backups, or every user-authored note/GPX/photo display has been proven immune to code injection. E-02/E-03 existing consent/CSP boundaries remain separate.
