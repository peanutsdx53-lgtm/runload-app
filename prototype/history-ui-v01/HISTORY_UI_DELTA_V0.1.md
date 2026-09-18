# RunLoad History UI Prototype V0.1

Status: PROTOTYPE ONLY / Formal Current unchanged.

## Scope
- History only.
- Current functions and semantic boundaries are retained.
- No production integration.

## Main layout change
- History entry point is split visually into `記録を探す` and `部位を比較`.
- Regional comparison is the visual protagonist.
- Eight representative comparable records are shown.
- Mobile uses staged disclosure for the comparison table.
- Desktop keeps the wide table visible and uses chart + selected detail side-by-side.

## Comparison display
- `基準比率`: Reference-100 = 100 as the neutral reference.
- `前回差`: difference from the previous comparable saved record.
- No good/bad, safety, readiness, injury-risk or diagnostic interpretation.
- Incompatible records remain saved but are excluded from the comparison line.

## Interaction rules represented
- Pinch zoom remains enabled.
- Bottom sheet locks/restores background scroll.
- Browser back closes the region picker.
- Safe Area and prefers-reduced-motion are considered.
- Text remains selectable; local controls suppress accidental selection only.