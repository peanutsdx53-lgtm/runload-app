# B-01 pre-UI complete CSS reachability audit — 2026-10-11

## Exact acceptance and bounds

The acceptance condition is **document and remove only proven unreachable or exact-duplicate code**, including platform loaders, dynamic classes, and cached assets. This does not mean removing code with ambiguous external/visual contracts. An earlier AST import graph found all 209 page-side JS modules reachable from `index.html`, plus the dedicated service worker; 111/111 stylesheets are referenced by platform loader or index, and SW has each asset. Exact duplicate JS/CSS file hashes: zero. Orphan exported symbols (six) and one private helper were retired in V2.80. B-03 historic v3.0 archive branch is retained and must not be deleted.

## CSS semantic proof

A PostCSS selector parser and a separate full-runtime JavaScript/HTML string+class-constructor scan enumerated original CSS classes. Of the 268 names absent as exact strings after prior pruning, 208 were proved not present in executable literals and not constructible by the inspected runtime class builders. They were removed at selector level, preserving comma-list siblings and surrounding conditional/media rules. Changes affect **37 stylesheets**, and remove **1117 CSS selectors** and **853 entire CSS rules** (about **126,120 bytes**). Every original CSS file remains (111/111); all imported app code, persisted schemas, scientific model coefficients and archived results are unchanged.

The remaining **60** names absent as exact strings are explicitly registered in `docs/B01_CSS_FULL_SELECTOR_REACHABILITY_20261011.json`. They are retained for actual runtime state/class prefix generation (`mobile-home-ambient--`, `achievement-card--`, `status-label--`, etc), application settings `rl-*`, or visual/test compatibility obligations. No uncertain selectors were removed. Regression `tests/b01CssSemanticFullReachabilityIndependent.test.mjs` fails on any newly unexplained CSS class and explicitly checks 111 loader/SW ownership, class generators and the exact 60-name retained register.

## Negative tests and independent correction

The first candidate lost a tested desktop theme selector and the compact mobile interpretation order due to class names being constructed from individual state fragments rather than present as exact strings. Three of the 224 Node test modules FAILED. Those deletions were **reverted in the candidate before release**, and the revised deletion filter retains every class mentioned in 224 non-browser test modules plus the explicitly audited state generators. The corrected independent full run: 224/224 modules PASS, 1 browser-only SKIP, 0 FAIL. This is not evidence that any arbitrary future application code will never add a new dynamic class: the new fail-closed class-inventory test is required on each code update.

## Related E-01 limitation

A CSS selector inventory cannot prove DOM safety. The separate E-01 transitive input→HTML trust-boundary register has 38 direct writer expressions, while archived 2026-10-08 inventory had 41 statement entries. The 43-path historic handoff describes a different/undocumented denominator and is **not reconciled simply by subtracting three**. App shell includes multiple delegated template routes. Preserve E-01 PARTIAL until all untrusted source flows are audited and browser fuzz is complete. No E-01 PASS assertion is made by this B-01 audit.

## Release checks

Full Node + JS syntax; PR+main H01 real Chromium mobile/desktop offline, appearance, consultation, security; Git tree full equality; 111/111 CSS file inclusion; Source/Public shared bytes; Original Sources SHA; Current manifest/CRC/outer SHA; independent clean unpack and Library readback required for formal promotion. If any check fails, **B-01 remains PARTIAL and Current is unchanged**.
