# GPX Local Analysis V0.2

Date: 2026-09-18
Status: TECH PROTOTYPE ONLY / FORMAL CURRENT UNCHANGED

## User feedback addressed
- Removed the three large explanatory cards from the first viewport.
- GPX file selection is now the first primary action.
- Added a compact one-line privacy statement instead of three cards.
- Added a collapsed "GPXを持っていない方" explanation.
- Added three non-blocking paths:
  1. choose a GPX
  2. try the fictional local sample
  3. return to manual Course Settings

## Product positioning
GPX is optional input assistance, not a required RunLoad workflow.
The interface does not assume that beginner runners know how to obtain GPX.

## Acquisition guidance
The UI gives generic guidance only:
- export one's own recorded route from a GPS watch/running service if GPX export is supported
- save the .gpx to Files/Downloads
- otherwise use manual Course Settings
No external service is connected, scraped, embedded, or automatically opened.

## Technical boundaries unchanged
- connect-src 'none'
- no network APIs
- no GPX persistence
- no external map/elevation service
- no surface inference
- no slope analysis without elevation data
