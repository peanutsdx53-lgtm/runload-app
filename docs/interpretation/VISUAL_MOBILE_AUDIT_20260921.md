# RunLoad Interpretation Room — Visual / Mobile Audit

Date: 2026-09-21

## Scope

Automated visual-layout audit of the production Interpretation Room presentation and production CSS.

Implementation head audited before this document-only commit:
- `c5e69458654ae52d2a824c72a3343ef559ffd135`

Viewports:
- mobile: 390 × 844
- desktop: 1280 × 900

Views:
- Summary
- Detail
- Evidence
- Next

Existing-screen launch points checked at mobile width:
- Home
- Result
- Body-part detail
- History

The audit used Chromium rendering through Playwright `set_content`, with the production CSS inlined into the generated fixture. No runtime code or CSS substitutions were used other than the audited feature-branch files.

## Finding and correction

### Mobile Detail horizontal overflow

Before correction:
- viewport width: 390 px
- document scroll width: 666 px
- cause: the 620 px minimum-width detail table expanded the parent CSS grid instead of remaining inside the intended horizontal-scroll wrapper

Correction:
- `styles/interpretation-room.css`
- set `min-width: 0` on:
  - `.screen--interpretation-room`
  - `.interpretation-room-view`
  - `.interpretation-panel`
  - `.interpretation-table-wrap`
- correction commit: `8d00e8883f977832eb9fde54a2329670f836b07b`
- corrected stylesheet SHA-256: `89a45320c3a8a1f580627c37549d62c15d5c68ee9cdfcbc912bc5c6d719c7033`

After correction:
- viewport width: 390 px
- document scroll width: 390 px
- table wrapper client width: 332 px
- table internal scroll width: 620 px
- page-level visible-overflow elements: 0

Regression coverage:
- Room integration test added: `MOBILE-DETAIL-TABLE-STAYS-WITHIN-ROOM-VIEWPORT`
- integration suite is now **18/18 PASS**

## Final viewport results

### Mobile 390 px

Summary:
- document width: 390 / 390
- page-level horizontal overflow: none
- first-level choices: four
- choice width: 366 px
- choice height: approximately 72.5 px

Detail:
- document width: 390 / 390
- page-level horizontal overflow: none
- detail table scrolls inside its own wrapper
- table wrapper: 332 px client / 620 px scroll width

Evidence:
- document width: 390 / 390
- page-level horizontal overflow: none
- selected evidence detail opens inside the viewport

Next:
- document width: 390 / 390
- page-level horizontal overflow: none
- choice cards remain inside the viewport

### Desktop 1280 px

All four views:
- document width: 1280 / 1280
- page-level horizontal overflow: none
- Interpretation Room main width: 860 px
- Detail table fits without horizontal scrolling at this viewport

## Existing-screen launch-point check

Home:
- reuses the existing “必要なときに開く” area
- compact RunLoad Interpretation item; no new large command-center card

Result:
- reuses the existing result-use action position
- launch item height: approximately 68 px

Body-part detail:
- contextual text-button launch
- no persistent large Interpretation card

History:
- contextual text-button launch in the selected-record action area
- no persistent large Interpretation card

Normal five-item bottom navigation remains unchanged outside the independent Interpretation Room.

## Post-fix regression

- Existing App Source: **273/273 PASS**
- Interpretation Core: **24/24 PASS**
- Interpretation Room Integration: **18/18 PASS**
- Interpretation Room Launch Integration: **11/11 PASS**
- Interpretation Room PWA Integration: **7/7 PASS**
- combined assertions: **333/333 PASS**
- JS/MJS syntax: **84/84 PASS**
- runtime manifest: **79/79 SHA-256 matches**
- protected Primary calculation core: unchanged
- protected ROF-J core: unchanged

## Audit conclusion

**Automated visual/mobile layout audit: PASS after one contained CSS correction.**

No merge or formal Current promotion is authorized by this document alone. User-visible acceptance remains the final gate.
