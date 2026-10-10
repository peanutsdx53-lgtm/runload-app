# RunLoad E-01 source-to-HTML and privacy audit, round 2 (2026-10-11)

## Authority and current bounds

- Formal baseline: Current V2.67, GitHub main `489c6b97ebdb316c7c7286f49726bed86788de0a`, tree `0cceaa761fd42b2b60b211c4d1d0f96933ce19af`.
- The original handoff reports **43 HTML display paths**. A reproducible enumeration of *the present code* identifies **40 direct HTML write expressions in 24 JS source files**: `innerHTML =`, `insertAdjacentHTML` (including optional-chained call sites), plus zero `outerHTML`, `document.write`, `.srcdoc=`, unsafe contextual fragment, or `setHTMLUnsafe` writes. The original 43-to-current-40 semantic mapping is not proved: neither the deleted status of three old paths nor an all-route security PASS is claimed.
- Every currently observed direct write has its own row in `docs/E01_HTML_SINK_REGISTER_20261011.csv` with code location, data provenance, trust boundary, review method, and restrictions. This count is a **static direct-write inventory**, not all transitive screen output paths.
- Importantly, `app.js` inserts large delegated `renderPlatformShell` and `renderPlatformHeader` outputs. One direct `innerHTML` sink can host many separately rendered fields. A direct-write tally alone does not verify them. They remain a critical deeper tracing target.

## Verification evidence added by round 2

1. `tests/e01SourceSinkInventoryIndependent.test.mjs` verifies the complete 40-write source inventory by path/multiplicity and prohibits additions or unreviewed use of `eval`/`new Function`. It also checks the delegated shell contract and inventories literal OSM tile origin references. The guard must fail on an added HTML sink until its provenance is reviewed; the test is not an XSS proof.
2. `tests/e01AdversarialEndToEndBrowser.test.cjs` starts a real HTTP server and tests actual production ESM renderers in Chromium with **no CSP policy in the isolated fixture** so escaping must withstand browser HTML parsing independently of CSP. It submits attacker-controlled SVG, script-handler images, srcdoc iframe, `javascript:` link and attribute-breakout payloads through backup filename/inspection issues, stored mobile activity record fields, and simulation course / result-state flows. It checks active DOM nodes, script effects and attempted outbound requests. Browser verification runs twice (mobile + desktop, with the mobile-only history view checked on the mobile viewport). It does not change saved records in the actual user origin.
3. Existing source and DOM evidence from round 1 is retained. Existing bounded E-01 Chromium test (`e01LiveDomInjectionRegression.test.cjs`) still checks restore, course, form message and support return-link injection under the actual application CSP. Other tests specifically cover GPX name / SVG numerical profile, record-body numeric summaries, desktop timeline and historic hash parameter escaping.
4. The required H01 browser CI invokes the new E01 adversarial test, and its existing whole-repository Node/syntax and browser tests remain mandatory.

## Source-to-HTML risk categories

| Family | Dynamic source | Boundary and status |
|---|---|---|
| App shell / screen render delegates | saved profile, records, plans, historical results, restored data | **PARTIAL**, not all transitive templates exhaustively traced |
| Backup restore preview | imported filename, blocking and warning text | EscapeHtml / existing & new real browser attack tests |
| Mobile activity history | localStorage JSON fields, query-selected records | EscapeHtml / real browser attack test and round-1 G01 browser tests |
| Desktop history / body timeline | hash query parameters / text from rendered records | URLSearchParams / escapeHtml / independent Node tests |
| Simulation / comparison | source result, mutable course fields and names | EscapeHtml / new browser attack test |
| GPX elevation profile | XML points and fallback file name | Numerical SVG construction and textContent; existing input boundary tests, real GPX file load still desirable |
| Record input / mobile measurement | course, segment and body readings | Source-level review and numeric/enum guards; remaining transitive fields not yet end-to-end |
| Consultation / visual template / mobile icon clone | user report text; DOM template/icon HTML | Report textContent; cloned trusted markup provenance must be rechecked |
| Guide / version / policy / static UI | fixed constants and bundled references | No attacker-authored input expected; structural register coverage |

## Privacy and security context (do not conflate with DOM XSS)

- GPS trace data stored in browser scope are not automatically safe because of localStorage; theft becomes possible if an injection or another same-origin page can read them.
- OpenStreetMap tile fetches can disclose the geographic area being viewed, even if full coordinate tracks are not uploaded; existing opt-in must be preserved. Browser test forbids unexpected requests from injected text, not all legitimate map requests.
- JSON backup remains **plaintext**; confidentiality on exported file or shared device cannot be claimed. Do not introduce unapproved encryption or recovery UX.
- GitHub Pages site paths on the same `https://<account>.github.io` origin share localStorage. Prefixes and CSP of RunLoad's own page do not isolate storage from other project pages in that origin. Hosting choice remains an approval/release gate.
- No new UI, cryptography, hosting, research model coefficients, scientific sources, results, archive transformations or GPS transmission were implemented.

## Closure decision

**E-01 remains PARTIAL.** Exhaustive transitive delegated-screen source-to-DOM coverage, reconciliation of the handoff's original 43-path inventory, stronger integrated restored-record attacks and multi-origin hosting isolation confirmation are not demonstrated by these tests. No condition count may be increased using this evidence alone. Keep 44-item aggregate at PASS26 / PARTIAL15 / FAIL0 / uninspected3 unless another separate authority has legitimately changed the formal matrix.
