# RunLoad Interpretation Experience Upgrade — Stage 6 Design Delta

Date: 2026-09-21
Status: IMPLEMENTATION AUTHORITY FOR STAGE 6
Parent design: RunLoad Interpretation Room Design Authority V1.1 Candidate
Branch: `feature/runload-interpretation-room-v1`

## 1. Reason for this delta

The Stage 5 implementation successfully connects RunLoad results, history, ROF-J, evidence, and existing feature routes in an independent Interpretation Room.

However, the first-pass presentation is still too close to result reorganization:
- it repeats regional counts and values;
- it describes what is already visible on the Result screen;
- it does not sufficiently answer the user's implicit question: **"What should I understand from this record?"**

Stage 6 changes the Interpretation Room from a result-summary surface into a deterministic explanation surface.

## 2. Updated product role

The Interpretation Room must follow this order:

**stored result → RunLoad meaning → alternative explanation form → supporting facts/evidence**

It must not follow:

**stored result → restated values → longer restatement**

The primary output is therefore a **meaning frame**, not a numeric summary.

## 3. Meaning-frame contract

The Interpretation Core adds a structured `meaning` object. It must contain codes/tokens, not unrestricted prose.

Candidate shape:

```js
meaning: {
  primaryCode,
  secondaryCodes,
  focusRegionIds,
  availableModes,
  factsUsed,
  boundaryCodes
}
```

Presentation text remains outside the scientific calculation core.

### Primary meaning codes

The first matching code wins in deterministic priority order:

1. `SUPPORT_PRIORITY`
   - existing support/safety route is not normal;
   - interpretation does not compete with support handling.

2. `LIMITED_RESULT`
   - no usable regional result or only limited/legacy output;
   - meaning is about what cannot yet be compared.

3. `REPEATED_OBSERVATION`
   - a selected region has the same reference direction in multiple compatible past records;
   - wording must use explicit record counts;
   - do not label it as a personal trait/tendency.

4. `CONDITION_AND_RESULT_CHANGED`
   - regional difference and factual running-condition difference coexist;
   - meaning is that cause cannot be isolated from this comparison;
   - user can separate conditions in a later comparison.

5. `MULTI_LAYER_CHANGE`
   - regional difference and ROF-J pre/post difference are both available;
   - meaning is that objective-model output and subjective fatigue both changed in this record;
   - no causal connection.

6. `CURRENT_SHIFT_WITH_HISTORY`
   - compatible previous record exists and one or more focus regions changed by >=1 point;
   - meaning is "this run differs from the comparable previous run", not "it got better/worse".

7. `CURRENT_REFERENCE_PATTERN`
   - current regional values are available but compatible history is insufficient;
   - meaning is how this run sits relative to each region's own Reference-100;
   - current record can serve as a future comparison point.

8. `COMPARISON_BASELINE`
   - usable result exists but no stronger meaning code applies;
   - current record is framed as a comparison point for later records.

The code priority must never be based on danger, injury importance, or cross-region numeric ranking.

## 4. Default Summary presentation

The first visible interpretation must have three semantic blocks:

### A. 今回の読み方
One concise RunLoad meaning statement.

This is the main answer. It should not lead with regional counts.

### B. そう読める理由
At most three supporting observations:
- compatible previous difference;
- repeated compatible historical observation count;
- ROF-J pre/post difference;
- factual condition difference.

These are supporting facts, not the interpretation itself.

### C. この記録だけでは決められないこと
Only boundaries relevant to the current meaning:
- no cause;
- no diagnosis;
- no danger/safety;
- no run/no-run;
- no cross-region ranking.

Do not show every possible boundary sentence if it is not relevant to the displayed meaning.

## 5. "分かりにくい" response model

The system must change **representation**, not merely add more prose.

Summary provides a section:

**別の見方で確認**

Maximum four routes:

1. **簡単に見る**
   - three short blocks:
     - 今回わかること
     - 前回と違うこと
     - ここからは判断できないこと
   - no table.

2. **図で見る**
   - visualizes one focus region at a time;
   - shows `previous / Reference-100 / current` on one local line;
   - never uses bar length to compare different body regions;
   - if no compatible previous exists, show `Reference-100 / current`;
   - separate ROF-J mini visual below if available.

3. **違いだけ見る**
   - shows only changed observations:
     - focus region difference;
     - ROF-J pre/post difference;
     - running-condition differences;
   - condition and regional changes are visually separated;
   - explicit non-causal boundary when both exist.

4. **根拠を見る**
   - existing Evidence view.

The first three are alternative explanations of the same interpretation, not new scientific calculations.

## 6. Deterministic visual rules

### Regional local comparison line

For one region:
- always include Reference-100;
- include current value if available;
- include previous only if strict comparison signature matches;
- compute display domain from these points with deterministic padding;
- clamp only visual position, never displayed value;
- label values explicitly;
- add text: `この図は選択した1部位の中だけで比較します。`

If another region is selected, render a separate line. Never place multiple region bars in a way that invites cross-region ranking.

### ROF-J visual

- pre and post values shown on the ROF-J 0–10 scale;
- clearly labeled as subjective fatigue;
- never mix the regional Reference-100 axis and ROF-J axis.

## 7. Information reduction rules

Default Summary:
- one primary meaning;
- maximum three supporting observations;
- maximum one focus region in the main interpretation;
- no 12-row table;
- no list of all regional counts in the opening paragraph.

Detail remains available for users who want all values.

## 8. User-facing wording principles

Prefer:
- `今回の記録は、前回と同じ条件の繰り返しとしてではなく、違いを確認する記録として読めます。`
- `比較可能な過去4件のうち3件で、この部位は基準100より上に表示されています。今回だけの表示ではありません。`
- `部位別結果と走行条件の両方が変わっています。この比較だけでは、どの条件が結果の違いに関係したかは分けられません。`
- `部位別結果と疲労感の両方に違いがあります。2つは別の情報として確認します。`

Avoid:
- `負担が大きい`
- `悪化した`
- `危険`
- `疲れているので休むべき`
- `坂が原因`
- `あなたはこの部位に負担がかかりやすい`
- raw result restatements as the main answer.

## 9. Routing delta

Canonical route remains:
`#/interpretation-room`

Add:
- `view=explain`
- `mode=simple|visual|difference`

Existing:
- `view=summary|detail|evidence|next`
- remains compatible.

No new bottom-navigation destination.

## 10. Persistence

No new storage.

Explanation mode is URL state only.
No interpretation prose is persisted.
No user model or generated chat history is persisted.

## 11. Implementation sequence

### Stage 6A — Meaning Core
- add structured meaning frame;
- deterministic rule priority;
- unit tests.

### Stage 6B — Explanation modes
- Simple;
- Visual;
- Difference;
- Evidence route reuse.

### Stage 6C — Summary redesign
- replace result-count-first copy with meaning-first copy;
- reduce opening information;
- add alternative-view choices.

### Stage 6D — visual/mobile regression
- 390 px and desktop render;
- no page overflow;
- visual labels remain legible;
- existing 333 baseline retained or intentionally updated with explicit test-contract changes.

## 12. Protected boundaries

Stage 6 must not modify:
- protected Primary calculation core;
- protected ROF-J calculation core;
- Reference-100 scientific semantics;
- strict comparison signature contract;
- existing support/safety escalation semantics;
- Current / main until final acceptance.

## 13. Acceptance criteria

Stage 6 is acceptable only if:

1. opening Summary answers a meaning question rather than restating the Result screen;
2. the primary interpretation is understandable without opening the 12-row detail table;
3. "分かりにくい" can be answered by changing representation;
4. Simple/Visual/Difference modes are deterministic and derived from the same stored facts;
5. no mode introduces diagnosis, causality, risk, safety, or run/no-run inference;
6. no cross-region ranking is introduced by visual design;
7. existing Safety precedence remains intact;
8. no new persistent datastore or external API is added;
9. protected cores remain byte-identical;
10. regression and mobile-layout audits pass.
