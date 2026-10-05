import assert from 'node:assert/strict';
import { renderInterpretationRoom } from '../ui/interpretationRoomPresentation.js';
import {
  buildInterpretationContextCandidate,
  selectInterpretationReferenceKnowledge,
} from '../ui/interpretationReferenceKnowledge.js';
import {
  buildSelfUnderstandingView,
  normalizeSelfUnderstandingThread,
} from '../core/selfUnderstandingCore.js';
import { buildBaseInterpretation } from '../core/interpretationBase.js';

function output({ body = true, fatigue = true, conditions = true, reflection = false, temperature = null } = {}) {
  return {
    target: { recordId: 'r2', date: '2026-10-02', origin: 'result', selectedRegionId: '' },
    state: { targetAvailable: true, regional: 'AVAILABLE', history: 'AVAILABLE', subjective: fatigue ? 'PAIR' : 'UNAVAILABLE', support: 'NORMAL' },
    runFacts: { postRunReflection: reflection ? '後半の感じ方を次も見たい' : '', environment: { temperatureC: temperature, environmentNote: temperature != null ? '暑く感じた' : '' } },
    overview: { attention: { counts: { conditionDifferences: conditions ? 1 : 0 }, groups: [] } },
    selectedRegion: null,
    subjectiveContext: fatigue
      ? { state: 'PAIR', pre: { available: true, value: 3 }, post: { available: true, value: 6 }, difference: { eligible: true, value: 3 } }
      : { state: 'UNAVAILABLE', pre: { available: false }, post: { available: false }, difference: { eligible: false } },
    conditions: { differences: conditions ? [{ id: 'distanceKm', previous: 5, current: 6, delta: 1, relationship: 'USED_IN_CURRENT_ROUTE' }] : [] },
    next: { primaryAction: null, otherActions: [] },
    advanced: { evidence: { regions: {} } },
  };
}

function bodyCandidate() {
  return {
    primaryCandidate: {
      kind: 'BODY_OBSERVATION_PAIR',
      threadType: 'REGION_OBSERVATION_PAIR',
      subject: { regionId: 'BA-DISP-014', bodyAreaId: 'BFR-200-COX' },
      observation: { label: '股関節部の外側', sensationType: 'TIGHTNESS', intensity: 2, noticedTiming: 'DURING' },
      row: { regionId: 'BA-DISP-014', regionName: '股関節部', value: 101.9, referenceDirection: 'ABOVE_REFERENCE' },
    },
    activeThread: null,
    threads: [],
    counts: { watching: 0, paused: 0, newThreadCount: 0 },
    targetContext: {},
  };
}

const checks = [];
async function check(id, fn) {
  try { await fn(); checks.push({ id, status: 'PASS' }); }
  catch (error) { checks.push({ id, status: 'FAIL', message: error?.stack || String(error) }); }
}

await check('BODY-EXPERIENCE-STAYS-PRIMARY-AND-REFERENCE100-IS-SECONDARY', () => {
  const html = renderInterpretationRoom({ output: output(), selfUnderstanding: bodyCandidate(), mobileLayout: false });
  assert.match(html, /あなたの身体の記録/);
  assert.match(html, /v54-model-secondary/);
  assert.match(html, /考える材料・RunLoadの部位表示/);
  assert.match(html, /この値は身体の感覚そのものではありません/);
  assert.match(html, /次の走行では、股関節部の外側を自分がどう感じたか確認する/);
  assert.doesNotMatch(html, /次の走行でも、股関節部の外側について自分の記録と部位表示を見比べる/);
});

await check('REFERENCE-KNOWLEDGE-FOLLOWS-THE-USER-FOCUS', () => {
  const bodyRef = selectInterpretationReferenceKnowledge(output(), { bodyPair: true });
  assert.equal(bodyRef?.id, 'context-not-single-cause');
  assert.equal(bodyRef?.evidenceGovernance?.sourceIntegrity?.status, 'PASS');
  const context = buildInterpretationContextCandidate(output({ body: false }));
  assert.equal(context?.focusKey, 'POST_RUN_FATIGUE_CONTEXT');
  assert.equal(context?.reference?.id, 'context-not-single-cause');
  assert.match(context?.question || '', /疲労感とその日の走行条件/);
});

await check('REFERENCE-IS-A-SEPARATE-NON-PERSONALIZED-LAYER', () => {
  const html = renderInterpretationRoom({ output: output(), selfUnderstanding: bodyCandidate(), mobileLayout: true });
  assert.equal((html.match(/class="v54-reference"/g) || []).length, 1);
  assert.match(html, /参考情報・あなたへの判定ではありません/);
  assert.match(html, /根拠と全文を見る/);
  assert.match(html, /#\/reading\?articleId=context-not-single-cause/);
  assert.doesNotMatch(html, /あなたの原因は|あなたは危険|この数値なら休むべき/);
});

await check('NO-BODY-OBSERVATION-HAS-A-SAFE-ALTERNATE-ENTRY', () => {
  const html = renderInterpretationRoom({ output: output(), selfUnderstanding: { ...bodyCandidate(), primaryCandidate: null }, mobileLayout: true });
  assert.match(html, /身体の部位記録がなくても/);
  assert.match(html, /今回、自分で残した疲労感/);
  assert.match(html, /一般情報は答えではありません/);
  assert.match(html, /data-thread-type="CONTEXT_QUESTION"/);
  assert.match(html, /次の走行でも、走行後の疲労感とその日の走行条件を一緒に確認する/);
});

await check('ENVIRONMENT-FACT-REACHES-INTERPRETATION-WITHOUT-BECOMING-A-SCORE', () => {
  const base = buildBaseInterpretation({
    targetExperience: {
      record: {
        id: 'env-r1', date: '2026-10-02', createdAt: '2026-10-02T09:00:00+09:00', activityType: 'run',
        distanceKm: 5, durationMinutes: 30, environmentContext: { temperatureC: 29, environmentNote: '暑く感じた' },
        reflectionContext: {}, course: {},
      },
      regionalV2ResultRecord: null, regionalSemanticState: 'NONE',
    },
    allExperiences: [],
  });
  assert.equal(base.current.facts.environment.temperatureC, 29);
  assert.equal(base.current.facts.environment.environmentNote, '暑く感じた');
  const serialized = JSON.stringify(base.current.facts.environment);
  assert.doesNotMatch(serialized, /risk|safe|danger|score|readiness/i);
});

await check('GENERAL-KNOWLEDGE-CAN-USE-PUBLIC-GUIDANCE-NOT-ONLY-RESEARCH-PAPERS', () => {
  const warm = output({ body: false, temperature: 29 });
  const ref = selectInterpretationReferenceKnowledge(warm, { bodyPair: false });
  assert.equal(ref?.id, 'heat-not-temperature-only');
  assert.ok(ref?.sourceKinds?.includes('公的資料'));
  assert.equal(ref?.evidenceGovernance?.sourceIntegrity?.status, 'PASS');
  const context = buildInterpretationContextCandidate(warm);
  assert.equal(context?.focusKey, 'POST_RUN_FATIGUE_ENVIRONMENT_CONTEXT');
  assert.match(context?.question || '', /疲労感と気温などの環境/);
  const html = renderInterpretationRoom({ output: warm, selfUnderstanding: { ...bodyCandidate(), primaryCandidate: null }, mobileLayout: true });
  assert.match(html, /暑い日の走りは、気温だけで判断しない/);
  assert.match(html, /公的資料/);
  assert.doesNotMatch(html, /29℃だから危険|走るべきではない/);
});

await check('ZERO-MATERIAL-REMAINS-A-NORMAL-ZERO-CANDIDATE-STATE', () => {
  const empty = output({ body: false, fatigue: false, conditions: false, reflection: false });
  const html = renderInterpretationRoom({ output: empty, selfUnderstanding: { ...bodyCandidate(), primaryCandidate: null }, mobileLayout: true });
  assert.match(html, /今回は、続けて確かめる問いはまだありません/);
  assert.doesNotMatch(html, /data-thread-type="CONTEXT_QUESTION"/);
  assert.doesNotMatch(html, /class="v54-reference"/);
});

await check('CONTEXT-THREAD-STORES-AGENCY-NOT-SCIENTIFIC-VALUES', () => {
  const thread = normalizeSelfUnderstandingThread({
    id: 'ctx-1',
    type: 'CONTEXT_QUESTION',
    subject: { focusKey: 'POST_RUN_FATIGUE_CONTEXT', prompt: '次の走行では、走行後の疲労感とその日の走行条件を一緒に確認する', articleId: 'context-not-single-cause' },
    createdAt: '2026-10-01T09:00:00+09:00',
    createdFromRecordId: 'r1',
    createdFromStableRecordKey: '2026-10-01|2026-10-01T09:00:00+09:00|r1',
    userState: 'WATCHING',
    updatedAt: '2026-10-01T09:00:00+09:00',
    factTokens: [{ value: 101.9 }],
    copiedRofJ: 8,
  });
  assert.equal(thread?.type, 'CONTEXT_QUESTION');
  assert.equal(thread?.subject?.articleId, 'context-not-single-cause');
  const serialized = JSON.stringify(thread);
  assert.doesNotMatch(serialized, /101\.9|copiedRofJ|factTokens/);
});

await check('CONTEXT-THREAD-RESURFACES-ONLY-WHEN-ITS-OWN-MATERIAL-EXISTS', () => {
  const thread = normalizeSelfUnderstandingThread({
    id: 'ctx-2', type: 'CONTEXT_QUESTION',
    subject: { focusKey: 'POST_RUN_FATIGUE_CONTEXT', prompt: '疲労感と条件を見る', articleId: 'context-not-single-cause' },
    createdAt: '2026-10-01T09:00:00+09:00', createdFromRecordId: 'r1',
    createdFromStableRecordKey: '2026-10-01|2026-10-01T09:00:00+09:00|r1', userState: 'WATCHING',
    updatedAt: '2026-10-01T09:00:00+09:00',
  });
  const source = { record: { id: 'r1', date: '2026-10-01', createdAt: '2026-10-01T09:00:00+09:00', activityType: 'run', distanceKm: 5, durationMinutes: 30 } };
  const target = { record: { id: 'r2', date: '2026-10-02', createdAt: '2026-10-02T09:00:00+09:00', activityType: 'run', distanceKm: 5, durationMinutes: 30 } };
  const withoutFatigue = buildSelfUnderstandingView({ targetExperience: target, allExperiences: [source, target], threads: [thread], rofSummariesByRecordId: new Map() });
  assert.equal(withoutFatigue.activeThread, null);
  const rof = new Map([['r1', { post: 5 }], ['r2', { post: 6 }]]);
  const withFatigue = buildSelfUnderstandingView({ targetExperience: target, allExperiences: [source, target], threads: [thread], rofSummariesByRecordId: rof });
  assert.equal(withFatigue.activeThread?.id, 'ctx-2');
  assert.equal(withFatigue.activeThread?.newEpisodes?.[0]?.postRofJ, 6);
  assert.equal(withFatigue.activeThread?.newEpisodes?.[0]?.runContext?.distanceKm, 5);
});

await check('SUPPLEMENTAL-MATERIALS-STAY-HIDDEN-UNTIL-COMPARE', () => {
  const html = renderInterpretationRoom({ output: output(), selfUnderstanding: bodyCandidate(), mobileLayout: true });
  assert.match(html, /v54-secondary-materials" data-v53-reveal="compare"/);
  assert.match(html, /補足の材料を見る/);
});

const failed = checks.filter((item) => item.status === 'FAIL');
console.log(JSON.stringify({ suite: 'Interpretation Context Flow', total: checks.length, passed: checks.length - failed.length, failed: failed.length, status: failed.length ? 'FAIL' : 'PASS', checks }, null, 2));
if (failed.length) process.exitCode = 1;