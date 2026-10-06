import assert from 'node:assert/strict';
import { renderInterpretationRoom } from '../ui/interpretationRoomPresentation.js';
import {
  buildInterpretationContextCandidate,
  getInterpretationReferenceKnowledgeById,
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
  assert.match(html, /interpretation-context-model-secondary/);
  assert.match(html, /考える材料・部位ごとの参考表示/);
  assert.match(html, /この値は身体の感覚そのものではありません/);
  assert.match(html, /次の走行では、股関節部の外側を自分がどう感じたか確認する/);
  assert.doesNotMatch(html, /次の走行でも、股関節部の外側について自分の記録と部位表示を見比べる/);
});

await check('REFERENCE-KNOWLEDGE-FOLLOWS-THE-USER-FOCUS', () => {
  const bodyRef = selectInterpretationReferenceKnowledge(output(), { bodyPair: true });
  assert.equal(bodyRef?.id, 'regional-six-eight-28');
  assert.equal(bodyRef?.evidenceGovernance?.sourceIntegrity?.status, 'PASS');
  const context = buildInterpretationContextCandidate(output({ body: false }));
  assert.equal(context?.focusKey, 'POST_RUN_FATIGUE_CONTEXT');
  assert.equal(context?.reference?.id, 'rof-j-how-to-read');
  assert.match(context?.question || '', /疲労感とその日の走行条件/);
});

await check('REFERENCE-IS-A-SEPARATE-NON-PERSONALIZED-LAYER', () => {
  const html = renderInterpretationRoom({ output: output(), selfUnderstanding: bodyCandidate(), mobileLayout: true });
  assert.equal((html.match(/class="interpretation-context-reference"/g) || []).length, 1);
  assert.match(html, /参考情報・あなたへの判定ではありません/);
  assert.match(html, /根拠と全文を見る/);
  assert.match(html, /#\/reading\?articleId=regional-six-eight-28/);
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

await check('ENVIRONMENT-FACT-DOES-NOT-INFER-HEAT-BUT-HEAT-GUIDANCE-REMAINS-AVAILABLE', () => {
  const environmentOnly = output({ body: false, fatigue: false, conditions: false, temperature: 29 });
  const ref = selectInterpretationReferenceKnowledge(environmentOnly, { bodyPair: false });
  assert.equal(ref?.id, 'context-not-single-cause');
  assert.equal(ref?.signalKey, 'environment');
  const context = buildInterpretationContextCandidate(environmentOnly);
  assert.equal(context?.focusKey, 'ENVIRONMENT_CONTEXT');
  assert.match(context?.question || '', /環境とほかの走行条件/);
  const heat = getInterpretationReferenceKnowledgeById('heat-not-temperature-only');
  assert.ok(heat?.sourceKinds?.includes('公的資料'));
  assert.equal(heat?.evidenceGovernance?.sourceIntegrity?.status, 'PASS');
  const html = renderInterpretationRoom({ output: environmentOnly, selfUnderstanding: { ...bodyCandidate(), primaryCandidate: null }, mobileLayout: true });
  assert.match(html, /走った日の背景を、一つの原因に決めない/);
  assert.doesNotMatch(html, /29℃だから危険|走るべきではない/);
});

await check('REGIONAL-ONLY-KEEPS-ZERO-CANDIDATE-WHILE-BASIC-REFERENCE-REMAINS-AVAILABLE', () => {
  const regionalOnly = output({ body: false, fatigue: false, conditions: false, reflection: false });
  const reference = selectInterpretationReferenceKnowledge(regionalOnly, { bodyPair: false });
  assert.equal(reference?.id, 'regional-three-views');
  const html = renderInterpretationRoom({ output: regionalOnly, selfUnderstanding: { ...bodyCandidate(), primaryCandidate: null }, mobileLayout: true });
  assert.match(html, /今回は、続けて確かめる問いはまだありません/);
  assert.doesNotMatch(html, /data-thread-type="CONTEXT_QUESTION"/);
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
  assert.match(html, /interpretation-context-secondary-materials" data-interpretation-flow-reveal="compare"/);
  assert.match(html, /補足の材料を見る/);
});


await check('REFERENCE-PRIORITY-MATCHES-READING-MASTER-V1-1', () => {
  const noFatigueHot = output({ body: false, fatigue: false, conditions: false, temperature: 29 });
  assert.equal(selectInterpretationReferenceKnowledge(noFatigueHot)?.id, 'context-not-single-cause');

  const multiple = output({ body: false, fatigue: false, conditions: false, temperature: null });
  multiple.state.regional = 'AVAILABLE';
  multiple.conditions.differences = [
    { id: 'distanceKm', previous: 5, current: 6 },
    { id: 'paceSecondsPerKm', previous: 360, current: 330 },
  ];
  assert.equal(selectInterpretationReferenceKnowledge(multiple)?.id, 'context-not-single-cause');

  const gradeOnly = output({ body: false, fatigue: false, conditions: false, temperature: null });
  gradeOnly.conditions.differences = [{ id: 'grade', previous: 0, current: 3 }];
  assert.equal(selectInterpretationReferenceKnowledge(gradeOnly)?.id, 'grade-and-coverage');

  const surfaceOnly = output({ body: false, fatigue: false, conditions: false, temperature: null });
  surfaceOnly.conditions.differences = [{ id: 'surface', previous: 'ROAD', current: 'TRAIL' }];
  assert.equal(selectInterpretationReferenceKnowledge(surfaceOnly)?.id, 'surface-missingness');

  const urgent = output({ body: false, fatigue: true, conditions: true, temperature: 30 });
  urgent.safety = { route: 'urgent' };
  urgent.state.support = 'URGENT';
  assert.equal(selectInterpretationReferenceKnowledge(urgent), null);
});

const failed = checks.filter((item) => item.status === 'FAIL');
console.log(JSON.stringify({ suite: 'Interpretation Context Flow', total: checks.length, passed: checks.length - failed.length, failed: failed.length, status: failed.length ? 'FAIL' : 'PASS', checks }, null, 2));
if (failed.length) process.exitCode = 1;