# RunLoad Mobile Prototype Parity Baseline

Date: 2026-09-20
Status: SMARTPHONE IMPLEMENTATION BASELINE / UI ALIGNMENT V1.28 VERIFIED

The smartphone UI is based on the frozen prototype authority, with later audited smartphone refinements.

## Verification
- Retained V1.6R2 regression harness with the release cache literal updated for this release: 251 / 251 PASS
- 16 / 16 retained suites PASS
- Retained JS/MJS syntax: 79 / 79 PASS
- Modified JavaScript syntax audit: 6 / 6 PASS
- Dedicated V1.28 UI alignment audit: 20 / 20 PASS
- Protected `core/runloadCore.js` hash unchanged
- Protected `core/secondPillarRofJ.js` hash unchanged

## Audited refinements
- Detailed Course sections use one mobile field geometry for percentage, type, and optional grade; smartphone layout is vertically aligned.
- Record environment temperature and memo controls are equal-width, equal-initial-height, vertically stacked fields.
- Selected body-region records separate the region/delete row from aligned intensity and laterality controls.
- Shared Record fields use a consistent mobile minimum control height and border/radius treatment.
- The ROF-J fatigue section is centered on the main content column rather than using the previous full-bleed offset.
- The long ROF-J interpretation boundary remains available but is collapsed under “この指標について” so it does not compete with the result itself.
- History prototype section-number markers are removed because the screen has no corresponding numbered sequence.
- Reading category filters explicitly indicate horizontal scrolling and include a right-edge visual cue.
- PWA cache is bumped so existing installations receive the updated CSS/JS.

## Fixed scientific boundary
These UI/interaction refinements do not change course semantics, calculation inputs, ROF-J semantics, Reference-100 semantics, source evidence, storage shape, or the documented Direct/P1/P2 boundaries.
