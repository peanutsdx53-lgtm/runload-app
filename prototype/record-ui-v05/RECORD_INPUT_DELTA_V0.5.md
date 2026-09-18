# RunLoad Record Input UI Prototype V0.5 — Rule-based date control

The native iPhone date field is no longer used as the visible layout surface.

- Visible date text is rendered by RunLoad in a fixed two-column grid.
- Column 1 is the date label; column 2 begins immediately after it.
- The entire row uses the same max-width rule as the distance/time block.
- The real HTML date input is transparent and absolutely overlays the visible value area.
- Tapping still opens the device-native date picker.
- The visible value is synchronized from the native input in YYYY/MM/DD form.
- This removes dependence on WebKit's internal date-text positioning.
- V0.2 compact distance/time sizing and RPE removal remain preserved.
