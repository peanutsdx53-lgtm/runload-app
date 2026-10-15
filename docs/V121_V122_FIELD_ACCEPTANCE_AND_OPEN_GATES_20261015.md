# RunLoad v121→v122: iOS GPX picker and device acceptance

Scope: \`peanutsdx53-lgtm/runload-app\` only. G2 is reference material, not a target.
The approved 44-item ledger has 40 PASS, 3 PARTIAL (D-05, E-07, G-04), 1 deferred (A-10). The active pre-research target is 43 items. These historical counts do not automatically change based on individual observations.

## Owner-reported device observations (2026-10-15)

- GPS behavior in v121: the owner reports that the prior GPS-related confirmation is complete. This does not independently certify every D-05 sensor/permission scenario or every E-07 failure mode.
- ① Backups exported successfully.
- ② An invalid \`.gpx\` file was disabled by the iPhone native file chooser. The same invalid input with \`.xml\` extension was selectable, and the application displayed the expected parsing error. Existing courses unchanged.
- ③ Malformed JSON backup was marked "復元不可", without changing saved data.
- ④ iPhone VoiceOver: 12-region comparison, readout and selection frame, detail navigation and return all successful.
- ⑤ RunLoad "大きめ" text size: home/input/results usable; selection survived reload.
- ⑦ Region status distinguishable by labels, not color alone.

These are explicit owner acceptance reports; they are not equivalent to fresh automated tests or unrestricted device coverage.

## v122 bounded repair

The mobile-only GPX \`input[type=file]\` removes its \`accept\` hint, which could gray out GPX extensions under OS file-provider MIME interpretation. The desktop picker is unchanged. Actual content validation, 10 MB limit, stale-selection checks, no auto-save, and invalid-file refusal in \`gpxAnalysisInteractions.js\` remain unchanged. Node contract/denial tests and full CI must pass before merging. Because an iOS device is not driven by CI, selection of a real \`.gpx\` in the new version remains device-unverified until explicitly reported.

## Formal gate boundaries after automated checks

- **D-05**: Owner's GPS confirmation is recognized; any original conditions outside that scope must be independently verified or explicitly dispositioned. Do not infer full PASS.
- **E-07**: Malformed GPX/XML and JSON backup rejection have device evidence; quota, OS interruption, permission revocation, and recovery need their own bounded evidence. Retain PARTIAL until full original criteria are satisfied.
- **G-04**: iPhone VoiceOver, font-size persistence, and legend labels have device evidence. Android TalkBack and Safari 200% were deprioritized by the owner, not passed. Original G-04 acceptance criteria still apply; retain PARTIAL rather than weakening them.
- **A-10**: Deferred until research/presentation acceptance by the owner.

Do not modify scientific computation, protected original sources, ROF-J, local record schema, or saved user data. Do not delete archival/legacy assets as a side effect of this change. A separate owner-authorized retention review is needed after full acceptance.
