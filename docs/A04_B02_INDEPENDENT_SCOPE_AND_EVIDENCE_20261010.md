# A-04 / B-02 independent non-UI audit — 2026-10-10

## A-04: Incomparability of independently normalized region indicators

**The condition is explanatory and implementation-scoped, not a clinical validation.** The application's twelve values are independently normalized within their own reference conditions. For region \(r\), the reported coordinate has the form

\[I_r(v)=100\,\frac{C_r(v)}{C_r(v_{\mathrm{ref}})}\]

(or its explicitly documented project-defined multi-component synthesis). Thus `100` means *that region's own baseline*. For different regions `r != s`, distinct constructs, source populations, measurement endpoints and reference speeds are not converted into one physical unit. Consequently `I_r=120` and `I_s=105` do **not** mean that physical load or clinical risk at `r` exceeds that at `s` by 15 points.

**Concrete example:** the hip/ankle low-speed responses (R01/R08) use normalized positive and negative joint-work terms from Fukuchi 2017/Jin 2018, whereas R06 uses a Van Hooren 2024 tibial stress impulse response; R11 uses an explicitly project-defined normalized 50:50 combination of the medial and lateral midfoot peak plantar pressures from Ho 2010. Those are different measurement constructs; a common `100` label alone does not make them comparable. They must not be averaged, ranked, or interpreted as injury probabilities. Even regions derived from the same paper can have different endpoints/constructs.

**Eligible direct difference:** compare only records from the same region ID, model version, output semantic version, construct ID, and reference ID when numerical evidence is available. New v3.1 and historic v3.0 direct deltas are disallowed. Missing data is left missing, not imputed to zero.

**Executable evidence:** `tests/a04CrossRegionIncomparabilityAudit.test.mjs` reads the current engine's persisted result signatures and independently checks 12 same-region allowed cases, all 132 directed different-region cases, 48 model/reference/construct mutation counterexamples, and unknown-value handling. The production `comparePrimaryRegionalV2Signatures` code independently returns `INCOMPATIBLE` on mismatches; `ui/guideContent.js`, `ui/mobileWalkJogHistoryUi.js`, and `ui/interactions/simulationInteractions.js` contain the non-ranking boundary in user-facing copy. See Current's `PRIMARY_REFERENCE100_12REGION_CONDITION_MATRIX_CURRENT.csv` and the scientific authority. No source coefficient was changed.

**Claim boundary:** this PASS confirms the explanation can be traced to active code, not that the user has personally presented it orally or that the twelve model responses are clinically validated (A-10 is independent and not evaluated here).

## B-02: Implementation TODO/FIXME and provisional-code decision

**Audit scope:** the active `core`, `shared`, `screens`, and `ui` JS/MJS files, `app.js`, `service-worker.js`, and `index.html` on the exact Git tree. Historic source archives, generated evidence, editorial citations, and tests are excluded because they are not runtime implementations; all actual runtime files are traversed.

**Static audit:** `tests/b02StubAndTemporaryCodeAudit.test.mjs` searches every active JS/MJS/HTML text file for common code TODO/FIXME/TBD/XXX markers, unimplemented sentinel codes, English-language temporary implementation comments, and Japanese provisional implementation markers. The initial scan finds zero unresolved stub markers in 211 runtime files. This audit is repeated in CI for every release.

**Explicit exceptions or lookalikes:** HTML input `placeholder` is an intentional accessibility/user-input hint rather than unfinished JavaScript; the presence of `REFERENCE_NOT_READY` in `ui/interpretationRoomPresentation.js` is a meaningful **nonnumeric** lack-of-reference evidence state and actively explains that its value is not used in numerical output. The research model's experimental photo-storage infrastructure is retained for a separately approved future extension, not misrepresented as completed UI functionality. These are **not** covert temporary calculations. Other legacy duplicate branches, dead code, and architectural cleanup remain under B-01/B-03/B-05; a B-02 PASS does not automatically close them.

**Claim boundary:** the static scan does not prove the absence of every conceivable semantic defect, nor does it substitute for runtime regressions, code coverage or user studies. It verifies the narrower condition that unresolved temporary implementation markers are absent from the actual runtime and known nonnumeric deferred states have a documented reason. All regression/CI release gates apply to both tests and the unchanged runtime.
