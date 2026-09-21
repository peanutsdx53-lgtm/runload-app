# RunLoad Understanding-Focused Visual Interpretation — Work Plan

Date: 2026-09-21
Status: APPROVED FUTURE WORK DIRECTION
Parent baseline: guided-dialogue baseline Guided Interpretation Dialogue
Branch: `feature/runload-interpretation-room-v1`

## 1. Purpose

RunLoad is primarily a self-management application.

The Result screen and the Interpretation engine must therefore have clearly different responsibilities.

### Result screen
Purpose:
- display the two RunLoad information layers;
- preserve the recorded values and facts;
- let users inspect the result directly.

The Result screen may show:
- regional Reference-100 output;
- ROF-J subjective fatigue information;
- related factual run information.

It does **not** need to teach the user how to read all of those outputs.

### Interpretation engine
Purpose:
- support users who cannot sufficiently understand the Result screen by themselves;
- narrow attention;
- transform the same stored information into a more understandable representation;
- explain what can and cannot be understood;
- bridge the resulting understanding into the next self-management action.

The Interpretation engine must therefore go several steps deeper than the Result screen.

It must not become a second Result screen.

## 2. Core product distinction

The Result screen answers:

**What was recorded / displayed?**

The Interpretation engine answers:

**What should I look at, how should I read it, what does this record help me understand, and what should I check next?**

This distinction is mandatory for future implementation.

A understanding-focused visual interpretation change must be rejected if it mainly:
- repeats the same numerical cards;
- repeats the same tables;
- restates the Result screen with longer prose;
- adds decoration without improving understanding.

## 3. Progressive understanding sequence

Interpretation should normally progress through the following sequence.

### Step A — Focus
Show one primary RunLoad interpretation and identify one thing to look at first.

Examples:
- one focus body region;
- one previous/current difference;
- one subjective-fatigue change;
- one condition/result co-change that cannot yet be separated.

Do not show every potentially interesting item.

### Step B — Visualize
Transform the selected fact into a visual representation.

Examples:
- body-region locator;
- previous → current comparison;
- Reference-100 → current position;
- ROF-J pre → post;
- condition fact shown alongside, not causally connected.

### Step C — Explain
State:
- what the visual shows;
- what it means for self-understanding;
- what the record alone cannot determine.

### Step D — Continue
Ask one next question or bridge to one relevant existing function.

The user may stop at any step.

## 4. Information-load rule

guided-dialogue baseline progressive-disclosure rules remain active.

At one ordinary step:
- one main interpretation;
- one main visual;
- normally two choices;
- never more than three ordinary choices;
- no unrelated secondary data.

Detailed tables remain secondary destinations.

Do not place:
- full 12-region table;
- ROF-J detail;
- condition list;
- evidence list;
- all downstream functions

on the same primary interpretation step.

## 5. Visual grammar

understanding-focused visual interpretation introduces a small, consistent visual grammar.

### 5.1 Focus highlight

Purpose:
- immediately show where the user should look.

Preferred implementation:
- reuse `ui/prototypeBodyRegionVisuals.js`;
- render the selected focus region with the standard accent color;
- mute non-focus regions/silhouette;
- optional one-time soft glow on entry.

Rules:
- focus selection comes from Meaning Core / deterministic dialogue context;
- never choose a region because its number is largest;
- glow means "look here", not "danger";
- do not use danger/attention red simply to make a region noticeable.

### 5.2 Direction arrow

Purpose:
- make change direction understandable before the user reads numbers.

Preferred implementation:
- SVG line/arrow;
- previous → current;
- or Reference-100 → current when no compatible previous exists;
- keep numeric labels visible;
- local comparison within one body region only.

Motion:
- arrow draws/grows once from origin to destination;
- recommended duration: approximately 220–360 ms;
- no looping;
- no bouncing.

Possible implementation:
- SVG `stroke-dasharray/stroke-dashoffset`;
- or a transform-based line growth;
- use existing motion preparation instead of a new animation library.

### 5.3 Target emphasis

Purpose:
- show the endpoint that should be interpreted.

Preferred implementation:
- one-time accent glow/ring;
- short fade/scale emphasis;
- static highlighted end state after animation.

Rules:
- no flashing;
- no continuous pulse;
- no emergency-looking red;
- no emphasis based on magnitude.

### 5.4 Sequential reveal

Purpose:
- prevent the user from seeing explanation, evidence, and next actions at once.

Preferred order:
1. focus appears;
2. arrow/position visual appears;
3. one explanation sentence appears;
4. choices appear.

The entire sequence should remain short.

Do not turn Interpretation into a cinematic sequence.

## 6. Two information layers must remain separate

The Result screen contains two major information layers. Interpretation may connect them conceptually, but must not merge their scales.

### Regional Reference-100
Visual rules:
- selected one region at a time;
- Reference-100 is explicit;
- previous/current comparison only under strict compatibility;
- no cross-region bar ranking.

### ROF-J
Visual rules:
- separate 0–10 scale;
- PRE → POST;
- labelled as subjective information;
- never draw it on the Reference-100 axis.

If both change:
- present as two separate visual lanes/cards;
- optionally reveal them sequentially;
- use wording such as "both contain a difference";
- do not draw a causal arrow between regional output and ROF-J.

## 7. Result-to-Interpretation transformation patterns

understanding-focused visual interpretation should implement reusable transformation patterns instead of screen-specific ad-hoc graphics.

### Pattern 1 — Locate
Result:
- regional numeric output.

Interpretation:
- body silhouette;
- one focus region highlighted;
- short label explaining why it is being looked at.

### Pattern 2 — Compare
Result:
- previous/current values.

Interpretation:
- previous → current arrow;
- Reference-100 marker;
- short directional explanation.

### Pattern 3 — Separate layers
Result:
- regional output + ROF-J.

Interpretation:
- two independent visual lanes;
- one sentence stating that both changed;
- one sentence stating that they remain separate information.

### Pattern 4 — Condition uncertainty
Result:
- condition difference + result difference.

Interpretation:
- two adjacent cards/lane groups:
  - changed condition;
  - changed regional result;
- no connecting causal arrow;
- explicit "cannot isolate which condition is related from this comparison" boundary.

### Pattern 5 — Repeated observation
Result:
- repeated compatible records.

Interpretation:
- current point plus a compact count/sequence visualization;
- use explicit record counts;
- no "tendency", "trait", "prone to" wording.

### Pattern 6 — Next observation
Interpretation:
- current understanding → next thing to confirm;
- then bridge to History / Simulation / Plan as appropriate.

This is a self-management bridge, not a prescription.

## 8. Motion semantics

Motion must convey meaning.

Allowed examples:
- arrow grows to show direction;
- focus region fades from muted to accent;
- reference/current marker appears in sequence;
- selected next-step card receives a short focus transition.

Not allowed:
- decorative floating;
- constant glow;
- attention-grabbing motion unrelated to information;
- movement implying urgency when Safety has not triggered;
- speed/size of animation based on scientific magnitude.

## 9. Accessibility and user control

Existing `ui/uiMotion.js` already contains:
- `prefers-reduced-motion: reduce` handling;
- reduced-motion class synchronization.

understanding-focused visual interpretation must reuse this behavior.

When reduced motion is requested:
- render the final state immediately;
- no arrow drawing animation;
- no glow pulse;
- no information may depend on motion alone.

All meaning-bearing visual states need:
- text labels;
- sufficient contrast;
- non-color cue where practical.

Dark mode and color themes must use existing CSS tokens.

## 10. Color semantics

Use:
- normal accent color for focus;
- muted colors for non-focus information;
- stable semantic Safety colors only when Safety semantics actually apply.

Do not use:
- danger red to indicate a high Reference-100 number;
- success green to imply that a lower/higher result is "good";
- heatmap coloring that implies cross-region danger ranking.

The visual hierarchy may be strong without introducing risk semantics.

## 11. Reuse of existing implementation assets

Prefer existing assets:
- `ui/prototypeBodyRegionVisuals.js` for body-region location/highlight;
- `ui/uiMotion.js` for motion lifecycle and reduced-motion handling;
- `styles/tokens.css` for theme/accent/focus colors;
- existing Interpretation SVG comparison line as the base for arrow-oriented comparison.

Avoid:
- new animation libraries;
- canvas/WebGL solely for explanation;
- external image dependencies;
- new network APIs.

## 12. Responsibility boundaries remain unchanged

Interpretation may visually explain why History/Simulation/Plan is relevant.

It must not recreate:
- History charts;
- Simulation editors;
- Plan entry;
- Consultation report composition;
- Reading library.

The visual explanation ends where the downstream function begins.

## 13. Proposed implementation stages

### Visual semantics foundation
Implement reusable, deterministic visual primitives:
- focus region locator;
- local comparison arrow;
- Reference-100/current markers;
- ROF-J pre/post lane;
- reduced-motion equivalents.

No major route redesign in 8A.

### Meaning-driven reveal sequence
Connect Meaning Core primary codes to one visual pattern.

Examples:
- `CURRENT_SHIFT_WITH_HISTORY` → Locate + Compare;
- `CONDITION_AND_RESULT_CHANGED` → Locate + Compare + separated condition card;
- `MULTI_LAYER_CHANGE` → regional lane + ROF-J lane;
- `REPEATED_OBSERVATION` → Locate + repeated-observation count visual;
- `CURRENT_REFERENCE_PATTERN` → Locate + Reference-100/current line.

### Guided-dialogue integration
Integrate visuals into the guided-dialogue baseline dialogue.

Rules:
- no more than one main visual per step;
- show visuals only after the user's question is narrowed;
- explanation follow-up remains limited to two or three choices;
- evidence/detail remain downstream.

### Self-management continuation
Upgrade the final explanation-to-function bridge.

Show:
- what was understood;
- what is still unknown;
- one suggested thing to check next;
- relevant existing function.

Do not prescribe training changes.

### Visual/motion audit
Audit:
- 390 px mobile;
- desktop;
- light/dark;
- standard and alternate color themes;
- reduced-motion mode;
- overflow;
- label collision;
- motion timing;
- no false danger/goodness cues.

Then run full regression and runtime-integrity checks.

## 14. Implementation acceptance criteria

understanding-focused visual interpretation is acceptable only if:

1. a user can identify the main point without reading the Result table again;
2. the Interpretation view is visually and functionally distinguishable from Result;
3. each primary step contains one main visual focus;
4. motion has a defined explanatory meaning;
5. reduced-motion users receive the same information;
6. visual emphasis does not imply danger, safety, improvement, or deterioration;
7. Reference-100 and ROF-J remain separate scales;
8. no cross-region physical ranking is introduced;
9. no downstream feature is duplicated;
10. ordinary choice count stays within guided-dialogue baseline limits;
11. protected scientific cores remain byte-identical;
12. full regression, PWA/runtime, scientific-boundary, and visual audits pass.

## 15. Work-order rule

Before implementing a understanding-focused visual interpretation batch:
1. identify the Meaning Core code/context being improved;
2. state what the user currently fails to understand;
3. choose one visual transformation pattern;
4. define the exact motion meaning;
5. define the reduced-motion final state;
6. implement;
7. run regression;
8. perform visual review;
9. record findings before the next batch.

Do not batch many visual ideas together without reviewing comprehension after each one.

## 16. Release rule

This work plan does not authorize:
- PR #49 merge;
- main modification;
- formal Current promotion.

understanding-focused visual interpretation should be developed on the existing feature branch and reviewed incrementally.
