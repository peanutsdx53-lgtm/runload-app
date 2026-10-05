## APP v2026.10.05.1 — Codebase Cleanup Release

- Removes retired compatibility paths, historical presentation-generation identifiers, stale fixture/workflow references, and temporary audit workflows.
- Separates desktop/mobile runtime assets and platform styles while keeping shared assets explicit.
- Centralizes repeated runtime helpers and adds cleanup acceptance checks for ownership, reachability, PWA assets, and architectural boundaries.
- Keeps current record/storage contracts and scientific calculation behavior unchanged; the complete regression suite remains the release gate.

## APP v2026.09.30.26 — Mobile Upgrade Final Candidate

- Preserves the editable/reorderable launcher Home as the primary mobile page.
- Keeps the single adjacent record-overview page introduced by the design rebaseline.
- Adds mobile achievements/trophies for records, rest, plans, reflection, distance and supported GPS energy estimates.
- Adds a one-time result reward card for newly unlocked achievements.
- Centralizes optional mobile tools under More without removing their Home edit/catalog availability.
- Applies a final mobile touch-target, focus, reduced-motion and small-screen quality pass.
- PC/thesis model and numeric research logic remain unchanged.

## APP v2026.09.30.25 — Mobile Design Rebaseline

- Restored the existing smartphone Home as the primary surface; editable app placement, dock, and Home editing remain intact.
- Removed the Phase 1 candidate persistent five-tab smartphone navigation and restored the Current header-based smartphone navigation policy.
- Added one adjacent, read-only Home overview page with concrete labels: weekly record, next plan, latest record, and distance change.
- The overview page does not participate in Home editing and defaults back to the existing app Home.
- Phase 2 onboarding, terms, and privacy flow remain in place.
- Phase 4 achievements/trophies are not implemented in this build.

## APP v2026.09.30.23 — Mobile First-Use Experience 2
- スマホ初回起動を4ステップのオンボーディングへ更新。
- 利用規約 v1 を追加し、初回同意を端末内設定へ保存。
- プライバシー導線と利用規約を「その他」「設定」から再確認可能にした。
- 設定からチュートリアルを再表示可能にした。
- 既存PC初回ガイド・研究計算ロジックは変更していない。

# RunLoad Mobile Release History

## APP v2026.09.30.22 — Mobile Upgrade Foundation 1
- Legacy Start screen removed from routing, rendering, help, PWA precache, and screen source files; application entry is Home.
- Smartphone primary navigation foundation is separated from PC navigation: Home / Record / Measure / History / More.
- PC primary navigation remains Home / Record / Result / History / More.
- Shared smartphone typography roles establish a 12 px minimum for mobile/shared UI layers; former micro-type declarations are normalized to the shared label role.
- Standard PWA shell colors are aligned with the approved blue theme.
- Achievement semantic color tokens are added for the later trophy phase.
- A mobile-foundation GitHub Actions regression workflow is added so browser-flow verification can run after publication.
- Scientific models, Reference-100 calculation contracts, ROF-J handling, and WALK/JOGGING/MIXED numeric boundaries are unchanged.

## APP v2026.09.30.17 — PC Course Refinement 1
- PC course editor: uses the available width for a compact two-column slope/surface workspace.
- PC course editor: reduces duplicate explanatory copy and demotes GPX to the course-library assist route.
- PC surface percentage input: shows the eight surface types in a compact two-column grid.
- PC course library: presents saved courses in a two-column browser with compact actions.
- PC GPX input: reduces decorative copy and keeps analysis results visually primary.
- Smartphone course presentation and scientific calculation contracts are intentionally unchanged.

## APP v2026.09.30.16 — Screenshot-guided Course Refinement 1
- Smartphone course editor: removes the duplicate GPX entry route and reduces explanatory text.
- Smartphone slope input: separates knowledge state (unknown / flat / hills) from input method (simple / sections).
- Smartphone surface input: compacts percentage entry and increases surface-name readability.
- Smartphone course summary: updates live while the user edits instead of showing stale initial values.
- Smartphone course library and GPX input: reduce vertical travel and remove decorative English headings.
- PC rendering and scientific calculation contracts are intentionally unchanged.

## APP v2026.09.30.15 — Screenshot-guided Record Refinement 1
- Smartphone record input: moves the before/after fatigue entry out of the required first card and into the collapsed optional reflection stage.
- Smartphone record input: keeps the initial path focused on activity type, date, distance, and actual duration.
- Smartphone record input: strengthens the visual distinction between selected and unselected Run / Rest choices.
- Smartphone fatigue entry: uses a compact optional wellbeing block and hides it for rest records.
- PC presentation and scientific calculation contracts are intentionally unchanged.

## APP v2026.09.30.14 — Mobile Phase 7
- Smartphone GPS active view: keeps one dominant goal metric while moving automatic step/energy estimates into a secondary disclosure.
- Smartphone GPS active view: adds a collapsible route map and a compact GPS quality badge.
- Smartphone GPS active view: keeps pause and finish controls reachable with a sticky bottom action surface.
- Smartphone post-run view: separates primary time/distance results from automatically organized supplemental facts.
- Smartphone post-run view: shows before/after fatigue values together when both are selected and clarifies the final record-completion action.
- PC presentation and scientific calculation contracts are intentionally unchanged.

## APP v2026.09.30.13 — Mobile Phase 6
- Smartphone plan: separates editing from the save-review step so the confirmation panel opens only when requested.
- Smartphone plan: makes run/rest selection larger and easier to distinguish.
- Smartphone plan: keeps the carried next-run check visible near the top of the flow.
- Smartphone plan: after saving a run plan, shows a primary action to start GPS measurement with that saved plan.
- Smartphone plan: rest plans return to Home instead of showing a measurement action.
- PC presentation and scientific calculation contracts are intentionally unchanged.

## APP v2026.09.29.12 — Mobile Phase 5
- Smartphone result: body-map touch targets are widened without changing the visible body-map geometry.
- Smartphone result: the body-map hint states that 100 is each region's own reference, not a score or ranking.
- Smartphone body-region detail: the current value is paired with difference from reference 100, previous value, and difference from the previous comparable record.
- Smartphone body-region detail: tapping a trend point reveals the selected saved record's date, region value, distance, and duration context.
- Smartphone body-region detail: duplicated comparison text is reduced so the locator, current value, and comparison cards remain easy to scan.
- PC presentation and scientific calculation contracts are intentionally unchanged.

## APP v2026.09.29.11 — Mobile Phase 4
- Smartphone condition comparison: starts from a four-choice selector for distance, time, course, or running style.
- Smartphone condition comparison: only the selected condition editor is shown at one time.
- Smartphone condition comparison: unchanged state hides the long result preview until a condition is changed.
- Smartphone condition comparison: warns when multiple conditions are changed so differences can be checked one at a time.
- Smartphone condition comparison: long changed-region groups initially show three regions and expand on demand.
- PC presentation and scientific calculation contracts are intentionally unchanged.

## APP v2026.09.29.10 — Mobile Phase 3
- Smartphone interpretation room: a three-step path clarifies recorded facts → current interpretation → one next-run check.
- Smartphone interpretation room: next-check creation/editing is directly available from the next-comparison rail.
- Smartphone record input: interpretation deep-links open the “次回” stage and focus the next-check field.
- After saving from that mobile flow, the app returns to the interpretation room.
- PC presentation and scientific calculation contracts are intentionally unchanged.

## APP v2026.09.29.9 — Mobile Phase 2
- Smartphone home: Today widget adapts to first use, draft, saved run, saved rest, and prior-history states.
- Smartphone home: next-check widget wording and source clarity improved.
- Smartphone record input: four-stage progress navigation added.
- Smartphone record input: optional-stage completion states shown in the progress strip.
- Smartphone GPS-to-record flow: transferred distance/time are explicitly marked.
- PC presentation and scientific calculation contracts are intentionally unchanged.

## APP v2026.09.29.8 — Mobile Phase 1 baseline
- Baseline before explicit mobile release-history tracking.
