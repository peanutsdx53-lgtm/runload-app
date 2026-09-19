# RunLoad Prototype Parity Gap Register

Date: 2026-09-19
Status: ACTIVE / UI PARITY AUTHORITY
Branch: ui-parity/full-reproduction

## Purpose

The immediate objective is to reproduce the frozen UI/UX prototype as faithfully as practical in the regular pre-release application.

The frozen prototype remains the presentation and interaction authority for this phase.
The current regular app remains the implementation, storage, routing and calculation authority.

Current-app features that do not exist in the frozen prototype MUST NOT be silently deleted, redesigned, or inserted into the prototype layout.
They are recorded here as decision items for later review by the user and ChatGPT.

## Frozen prototype authority

Freeze commit:
c67d2a6f25acb964f960d42e11c8ba8a2a2ab5ea

Adopted 15 screens:
- Home V0.13
- Record V0.16
- Result V0.21
- History V0.14
- Plan V0.09
- Simulation V0.15
- Course Settings / Editor V0.16
- GPX V0.17
- Result Use V0.07
- Consultation V0.03
- Public Support V0.03
- Reading V0.02
- Privacy V0.03
- More V0.06
- Settings V0.06

## Fixed implementation boundaries

These are not UI decision items and must not be changed during parity work:
- Reference-100 remains within-region self-understanding only.
- Distance remains a separate run fact.
- Missing/unsupported values are not converted to zero or fake q=1.
- ROF-J remains separate from Reference-100 and is not readiness/recovery/safety/risk.
- session-RPE remains deferred / not implemented.
- Notebook remains removed.
- No legacy-record migration or reinterpretation.
- No diagnosis, injury-risk/readiness/safety score, integrated score, or automatic run/no-run decision.
- Accepted Formal calculation authority must not be modified to achieve visual parity.

## Gap classifications

### P — Prototype parity required
The function exists in both versions, but the regular app does not reproduce the frozen prototype presentation or interaction closely enough.
Action: reproduce prototype first. No separate product decision is required.

### C — Current-app-only function
The regular app contains a function, setting, explanation, control, or state that the frozen prototype does not contain.
Action: preserve the information and implementation, but do not force it into the prototype layout during parity work. Record it for later user/assistant review.

### M — Prototype mock / incomplete connection
The frozen prototype visually contains an interaction, but its production implementation was absent or simulated.
Action: reproduce the visual interaction and connect it to the accepted regular-app service only when that connection does not change the frozen semantics. Otherwise record for review.

### X — Semantic conflict
A prototype element would conflict with fixed Formal/research boundaries if reproduced literally.
Action: do not reproduce the conflicting behavior. Preserve the visual intent where possible and record the conflict for explicit review.

### Q — New decision opportunity
A useful improvement becomes apparent only after prototype parity is restored.
Action: do not implement during parity work. Record for later review.

## Decision states

- UNREVIEWED
- KEEP_CURRENT_ONLY
- ADOPT_IN_UI
- ADAPT_TO_PROTOTYPE
- DEFER
- REMOVE
- REJECT_SEMANTIC_CONFLICT

Only the user/assistant review phase changes an item from UNREVIEWED to a product decision state.

## Initial known decision items

| ID | Class | Area | Item | Current treatment | Decision |
|---|---|---|---|---|---|
| GAP-001 | C | Settings | Multiple selectable color themes beyond the prototype's simple theme | Preserve implementation; prototype simple palette remains reproducible and selectable | UNREVIEWED |
| GAP-002 | C | Settings | Appearance modes including system/light/dark | Preserve; do not allow appearance controls to change prototype layout geometry | UNREVIEWED |
| GAP-003 | C | Settings | Result initial-view and previous-comparison settings exposed in the regular app | Preserve implementation outside parity-critical layout until reviewed | UNREVIEWED |
| GAP-004 | C | Settings | External-link display preference | Preserve implementation; review placement after Settings V0.06 parity | UNREVIEWED |
| GAP-005 | C | PWA | In-app application-update notice/action | Preserve as required regular-app behavior; integrate without covering prototype navigation or content | UNREVIEWED |
| GAP-006 | M | All screens | Prototype used mock/static data in places where regular app uses live saved data | Reproduce the same visual structure with real data through existing services | UNREVIEWED |
| GAP-007 | C | Global shell | Regular app application guide/tutorial infrastructure exceeds the frozen screen prototype | Preserve functionality outside the core prototype geometry; final placement to review | UNREVIEWED |
| GAP-008 | C | Accessibility | Regular app contains accessibility/focus handling not visibly represented in prototype | Preserve unless it changes visible layout; accessibility is not removed for visual parity | KEEP_CURRENT_ONLY |
| GAP-009 | C | PWA | Service-worker/cache/version behavior has no prototype equivalent | Preserve as infrastructure; must not alter visible prototype layout except necessary update notice | KEEP_CURRENT_ONLY |
| GAP-010 | C | Runtime | Formal validation/error states may have no prototype mock equivalent | Preserve semantics; design their presentation only after base prototype state is reproduced | UNREVIEWED |

## Per-screen parity checklist

For each of the 15 screens, compare and record:
1. DOM/content hierarchy
2. top bar / contextual back behavior
3. page heading
4. section order
5. card grouping
6. field grouping
7. spacing and widths
8. typography hierarchy
9. fixed/sticky elements
10. bottom navigation interaction
11. mobile breakpoints
12. desktop frame behavior
13. empty/loading/error/update states
14. current-only functions
15. prototype-only mocks or placeholders

## Working rule

During this phase:
1. Reproduce the frozen prototype first.
2. Keep production data/calculation/storage underneath it.
3. Do not redesign the prototype while reproducing it.
4. Do not delete current-only capabilities merely because the prototype lacks them.
5. Log all current-only or ambiguous items here.
6. Review logged items with the user only after a stable parity baseline exists, unless an item blocks safe implementation.
