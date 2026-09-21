# RunLoad Guided Interpretation Dialogue — Design Authority

Date: 2026-09-21
Status: IMPLEMENTATION AUTHORITY FOR GUIDED DIALOGUE
Parent baseline: Interpretation Experience

## 1. Purpose

RunLoad is primarily a self-management application.

The Interpretation Room therefore must not behave as an information dashboard. Its role is to help the user narrow one question at a time:

**record → meaning → what the user wants to understand → minimum explanation → bridge to the next self-management function**

The default interaction is progressive disclosure.

## 2. Core interaction rule

At any ordinary dialogue step:
- show one RunLoad message;
- show at most three next choices;
- normally prefer two;
- do not display unrelated facts;
- do not expose all available tools at once.

If the user still does not understand, change representation before adding information.

## 3. Guided-dialogue model

This is chat-like in interaction order, but deterministic.

Allowed:
- RunLoad prompt;
- user-selectable fixed response choices;
- sequential turns;
- simple / visual / difference explanation representations;
- explicit bridge to existing functions.

Not introduced:
- free-text AI chat;
- generated medical or training advice;
- typing simulation;
- AI avatar/persona;
- persistent conversation history;
- external API.

URL state is sufficient.

## 4. Entry dialogue

The first screen shows:
1. one primary RunLoad interpretation;
2. one compact scientific boundary;
3. the question: `今、確認したいことはどちらですか？`

Ordinary choices:
- `この結果を理解したい`
- `次にどう活かすか考えたい`

Do not show four explanation modes on entry.
Do not show History / Simulation / Plan / Reading / Consultation together on entry.
Do not show the full 12-region table on entry.

Existing support/safety precedence overrides this ordinary dialogue.

## 5. Interpretation-support branch

Topic: `understand`

Purpose:
- answer the user's "what does this mean?" question.

Show one short prompt and up to three representation choices according to available data:
- `違いを確認` → Difference representation;
- `図で確認` → Visual representation;
- `もっと簡単に` → Simple representation.

If a mode is unavailable, omit it instead of replacing it with unrelated information.

Evidence is not a top-level competing choice. From an explanation result, the user may choose:
- `なぜこの解釈なのか確認` → Evidence.

Full 12-region values remain Detail and are secondary.

## 6. Self-management branch

Topic: `manage`

Purpose:
- clarify what the user wants to do next;
- bridge to an existing RunLoad function.

Maximum three choices:
- `過去にも同じことがあるか確認` → History, only when compatible history exists;
- `条件を変えて比べる` → Simulation, only when enabled;
- `次回に活かす` → second guided step.

The Interpretation Room does not recreate History graphs or Simulation controls.

## 7. Next-use branch

Topic: `next-use`

Purpose:
- choose the appropriate existing self-management function.

Maximum three choices:
- `次の予定に反映` → Plan;
- `誰かに共有する内容を整理` → Consultation;
- `関連する背景を確認` → Reading.

Interpretation Room does not:
- prescribe the plan;
- send the consultation automatically;
- reproduce the Reading library.

## 8. Responsibility boundaries

### Interpretation Room
Owns:
- meaning framing;
- question narrowing;
- explanation representation;
- bridge selection.

Does not own:
- history exploration;
- hypothetical condition editing;
- schedule/plan entry;
- share-document composition;
- background literature browsing;
- support/safety logic.

### History
Owns:
- past-record exploration and trends.

### Simulation
Owns:
- user-selected hypothetical condition comparison.

### Plan
Owns:
- user-entered next run/rest planning.

### Consultation
Owns:
- user-selected share preparation.

### Reading
Owns:
- related general research/background.

### Support
Owns:
- existing support/safety guidance and precedence.

## 9. State

Canonical route remains `#/interpretation-room`.

Add:
- `view=dialogue`
- `topic=understand|manage|next-use`

Existing explanation routes remain compatible:
- `view=explain&mode=simple|visual|difference`
- `view=evidence`
- `view=detail`
- `view=next` retained for backward compatibility for this guided-dialogue update.

No new persistence.

## 10. Information-load acceptance criteria

Ordinary entry:
- one primary meaning;
- one short boundary;
- exactly two ordinary choices.

Dialogue step:
- at most three choices.

No ordinary step simultaneously displays:
- explanation modes and functional bridges;
- all five downstream functions;
- full 12-region table and primary meaning.

## 11. Scientific boundaries

Unchanged:
- no diagnosis;
- no injury probability;
- no danger/safety inference from regional/ROF values;
- no run/no-run recommendation;
- no causal inference from condition/result co-change;
- no cross-region physical ranking;
- ROF-J remains separate;
- strict compatible-history comparison remains;
- existing Support precedence remains.

## 12. Implementation sequence

### Dialogue routing and intent narrowing
- add deterministic dialogue view/topic routing;
- replace entry four-mode menu with two-way intent narrowing.

### Interpretation-support dialogue
- interpretation-support dialogue;
- evidence as downstream explanation;
- keep Detail secondary.

### Self-management bridge dialogue
- self-management bridge dialogue;
- History / Simulation / next-use separation;
- next-use → Plan / Consultation / Reading.

### Regression and boundary audit
- regression;
- information-load contract tests;
- 390 px / desktop visual audit;
- scientific/responsibility-boundary audit.

## 13. Release rule

This guided-dialogue update does not authorize merge or Current promotion.

PR #49 remains Draft until explicit later acceptance.
