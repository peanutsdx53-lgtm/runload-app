# RunLoad Record Free-Text Semantic Audit — Prototype V0.8

Status: UI/UX prototype decision only. Formal Current/App is unchanged.

## Evidence used
Current active-input catalog V1.1:
- shoe id/name: KEEP, reusable within-user comparison fact;
- personal free note: KEEP_OPTIONAL, flexible context;
- post-run reflection: MERGE_MAIN_REFLECTION;
- perceived difference: KEEP_HIGH_VALUE;
- reflection key point: MERGE_WITH_MAIN_REFLECTION;
- next check point: KEEP_HIGH_VALUE.

## Prototype decision
1. Keep shoe selection as a factual reusable input.
2. Remove "気づきメモ" from the shoe entry surface.
3. Merge overlapping post-run reflection / reflection-key-point presentation into one field:
   - 今回の気づき
4. Keep perceived difference as a distinct field:
   - いつもとの違い
5. Keep next-check point as a distinct field:
   - 次回確認したいこと
6. Remove the generic catch-all memo from this prototype entry surface because it duplicates the three fields above.

## Production integration caution
The Current catalog still lists personal free note as KEEP_OPTIONAL.
Therefore production adoption must not silently discard old stored values.
Before implementation into Current:
- define backward display/migration behavior for existing personal-free-note data;
- decide whether old personal free notes are shown under "今回の気づき" or retained in legacy/detail view;
- preserve restore compatibility;
- do not overwrite historical values merely because the new entry surface is simpler.

No calculation semantics are changed by this prototype.
