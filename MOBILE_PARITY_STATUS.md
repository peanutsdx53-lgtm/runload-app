# RunLoad Mobile Prototype Parity Baseline

Date: 2026-09-20
Status: SMARTPHONE IMPLEMENTATION BASELINE / SHARE PREPARATION V1.30 VERIFIED

## Share Preparation V1.30
The former 「相談」 feature is redefined as 「共有用にまとめる」.

Purpose:
- RunLoad prepares a factual base that the user can show to an instructor, coach, medical professional, family member, or another person.
- The recipient views the material; RunLoad does not send it automatically.
- One common selected data set feeds on-screen viewing, text copy, and print/PDF output.

Shared candidate information:
- target person
- what the user wants checked
- current run facts
- fatigue before/after
- body-record observations
- selected body-region indicator
- directly comparable recent change when available
- next item to check
- saved next plan when available

## UI / output rules
- The flow is one sequence: recipient/purpose -> included information -> preview -> output method.
- The old split between short memo and report is retired from the runtime route.
- Changing the selected body region updates only the region indicator and comparable recent change; typed recipient/purpose text remains in place.
- Screen viewing uses a dedicated full-screen read-only presentation.
- Print/PDF uses A4 portrait, card-level page-break protection, and a compact region table.
- Body-record summaries are capped to the first three displayed items plus a remaining-count summary so the document does not become unnecessarily dense.
- Distance remains a separate run fact and is not multiplied into the body-region indicator.

## Share Purpose V1.31
- STEP 1 is reduced to 「共有の目的」 with only recipient and confirmation-content fields.
- Recipient and confirmation content are user-entered only; generated consultation text is not prefilled.
- The body-region selector is moved to STEP 2 because it controls which information is shared, not the sharing purpose.
- Example/suggestive question text is removed; placeholders only describe what to enter.
- Preview, viewer, PDF, and copied text use the common label 「確認内容」.
- Dedicated V1.31 audit: 18 / 18 PASS.
- Modified JavaScript syntax: 2 / 2 PASS.

## Verification
- Modified JavaScript syntax: 10 / 10 PASS
- Final Share Preparation audit: 38 / 38 PASS
- Existing consultation-boundary compatibility audit: 13 / 13 PASS
- Dynamic region-selection synchronization audit: 6 / 6 PASS
- Retained V1.6R2 harness environment itself: 251 / 251 PASS
- The 251-test harness was not rerun with the exact V1.30 branch overlaid, so 251/251 is not claimed as V1.30 regression evidence
- Protected calculation cores unchanged
- Storage implementation unchanged
- Scientific source/model files unchanged
- PWA cache bumped for deployment

## Fixed scientific boundary
This release changes sharing workflow, presentation, and output only. It does not change calculation inputs, Reference-100 mathematics, fatigue-scale values, storage shape, scientific source evidence, or the documented Direct/P1/P2 boundaries.
