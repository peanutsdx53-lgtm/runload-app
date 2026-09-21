# Stage 8C — Guided Visual Integration Audit

Date: 2026-09-21
Status: COMPLETE — PASS

## Purpose

Stage 8C integrates the Stage 8 visual patterns into the Stage 7 deterministic dialogue without turning the Interpretation Room into a dashboard.

## Dialogue order

The ordinary sequence remains:

1. Entry: one primary interpretation + two intent choices;
2. Understand: up to three representation choices;
3. user chooses `図で確認`;
4. Visual explanation: one main visual stack;
5. one understanding sentence;
6. two downstream choices:
   - Evidence;
   - self-management narrowing.

The Entry and Understand steps do not render the body visual or Stage 8 visual patterns.

## Implementation

Visual explanation root now carries:

- `data-guided-stage="understand-visual"`;
- `data-reveal-step="visual"`;
- explanation note: `data-reveal-step="explanation"`;
- downstream choices: `data-reveal-step="choices"`.

No route was redesigned.

## Sequential reveal

The main visual retains the existing Stage 8A focus/arrow motion.

Additional reveal order:

- explanation note: 160 ms fade/4 px settle after 420 ms;
- choices: 160 ms fade/4 px settle after 540 ms.

The total staged sequence remains short and non-looping.

No scientific magnitude changes animation speed or intensity.

## Reduced Motion

Under the existing reduced-motion class or `prefers-reduced-motion: reduce`:

- explanation animation: none;
- choices animation: none;
- opacity: 1;
- transform: none;
- the complete visual state is immediately available.

## Verification

Focused Stage 8C checks:

- **9/9 PASS**

Verified:

- Entry still has exactly two choices and no visual;
- Understand offers `図で確認` but does not render the visual yet;
- visual explanation carries the guided-stage marker;
- exactly one main visual stack is rendered;
- explanation note is downstream of the visual;
- follow-up remains exactly two choices;
- follow-up routes only to Evidence and management narrowing;
- Simple representation is not incorrectly marked as the visual guided stage;
- reveal timing is one-shot and short;
- Reduced Motion exposes the complete static state.

Dedicated regression file:

- `tests/interpretationStage8CGuidedVisualIntegration.test.mjs`

## Runtime hashes

- `ui/interpretationRoomPresentation.js`: `84038a007b810bdbf72391ac21f8f74c66acf57f4d751e33a006253441feb4d7`
- `styles/interpretation-room.css`: `d4b0890e6307fa8a2b58ce5919330cbd44167d39161a0638cd36714670e64c0e`
- `service-worker.js`: `0463e3b47218ac675e345d5241c4d382f7c862c5f7ccc0732d25d6dd0540e052`

Runtime manifest and PWA hash expectations were aligned.

## Visual review boundary

Stage 8C changes timing/order, not the 390 px geometry of the Stage 8B cards.

The five 390 px targeted Stage 8B layouts therefore remain the geometry baseline.

A production-browser animation/timing audit across mobile, desktop, themes, dark mode and Reduced Motion remains mandatory in Stage 8E.

## Responsibility/scientific boundary

Stage 8C does not add:

- free text;
- AI chat;
- new routes;
- new persistent state;
- new downstream-function implementation;
- diagnosis;
- risk;
- safety/danger inference;
- causal inference;
- run/rest permission;
- prescription.

## Release state

- PR #49 remains Draft.
- main remains untouched.
- formal Current remains untouched.

## Next stage

Stage 8D — strengthen understanding → self-management continuation.

The next batch must remain descriptive:

- summarize what was understood;
- state what is still unknown;
- identify one thing the user can check next;
- bridge to an existing function;
- do not prescribe training changes.
