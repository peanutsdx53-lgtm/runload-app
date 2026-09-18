# RunLoad Desktop Result Update Policy — V0.9

Status: prototype design rule for UI/UX work. This does not change calculation, persistence, or semantic output.

## Principle
Desktop and mobile expose the same product functions. Desktop uses the available width to keep overview and comparison visible at the same time; it must not become a stretched mobile screen.

## Result screen
- Keep the current 3-part body map and Reference-100 direction colors.
- Keep numbers off the body-map overview itself.
- Keep the two comparison modes: focused regions and all 12 regions.
- On desktop, keep the comparison list alongside the body map.
- Body-map region click and comparison-row click continue to open the same region detail/trend.
- Run facts remain compact and collapsible.
- ROF-J remains a separate second pillar.

## Desktop presentation
- Use a wide two-column regional section rather than stacking it vertically.
- The comparison panel may remain visible/sticky while reviewing the body map.
- Do not expose extra calculations or source information merely because more space is available.
- Do not add desktop-only product functions.
- Region detail may use a two-column presentation (current region/value + trend) because the underlying function is unchanged.
- Maintain keyboard focus states and ordinary browser zoom.

## Preservation
The mobile interaction policy from V0.8 remains unchanged. Desktop refinement must not overwrite the portrait/landscape mobile rules.
