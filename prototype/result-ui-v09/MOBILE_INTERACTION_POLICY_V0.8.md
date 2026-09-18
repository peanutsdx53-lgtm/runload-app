# RunLoad Mobile Interaction Policy — V0.8

Status: prototype design rule for UI/UX work. This does not change calculation, persistence, or semantic output.

## 1. Use intentionally
- Portrait is the default mobile reading layout.
- Landscape is supported with a dedicated presentation; it does not unlock different functions.
- Pinch zoom remains available. Do not use `user-scalable=no`.
- Browser back / iOS back-swipe remains available for body-region detail navigation.
- Bottom sheets are used for dense mobile selection such as the 12-region comparison.
- Safe-area insets and `prefers-reduced-motion` are respected.
- Tap feedback is visual and brief.

## 2. Control locally
- Interactive controls use `touch-action: manipulation` so double-tap zoom is not triggered by buttons while pinch zoom remains available.
- Buttons, tabs, SVG body regions, and navigation controls are non-selectable; ordinary explanatory text remains selectable/copyable.
- Long-press callout/drag is suppressed only on interactive diagrams and controls.
- Sheet/detail opening locks background scrolling and restores the prior scroll position when closed.
- Portrait/landscape changes must preserve selected tab, open detail target, and current UI state.

## 3. Avoid / suppress
- No scroll hijacking.
- No swipe gesture for region switching where it can conflict with page scroll or browser-back gestures.
- No repeated navigation from a double tap.
- No body-region activation when a touch gesture has clearly moved as part of scrolling.
- No image/SVG dragging on the body map.
- No layout that requires landscape to access a function.
- No automatic reset of state after rotation.
- No globally disabled zoom.

## 4. Responsive rule
PC and mobile expose the same product functions but may present them differently.
- PC may keep comparison/list information visible alongside the body map.
- Mobile stores the same comparison/list function in a bottom sheet.
- Phone landscape remains a mobile presentation, not a desktop layout merely because its CSS width is large.

## 5. Current Result interaction ownership
- Body map tap: open that region's detail/trend.
- 12-region comparison button: open comparison sheet.
- Comparison row tap: open that region's detail/trend.
- Run facts: expand/collapse only.
- Browser back from detail: return to Result.
