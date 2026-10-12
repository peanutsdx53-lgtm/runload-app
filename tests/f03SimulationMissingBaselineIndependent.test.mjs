import test from 'node:test';
import assert from 'node:assert/strict';
import { renderSimulationScreenWithPresentation } from '../screens/simulationScreen.js';
import { changedConditionItems } from '../ui/interactions/simulationInteractions.js';

function sourceFrom(record) {
  const services = {
    storage: { records: { loadAll: () => [record], findById: () => record } },
    workflows: { records: { loadExperience: () => null } },
  };
  const html = renderSimulationScreenWithPresentation({ services, context: { parameters: new URLSearchParams() } });
  const match = html.match(/name="sourceConditionJson" value="([^"]*)"/);
  assert.ok(match, 'hidden source baseline is present');
  return { html, source: JSON.parse(match[1].replaceAll('&quot;', '"').replaceAll('&amp;', '&')) };
}
function dataOf(source, partial = {}) {
  const data = new FormData();
  for (const [key, value] of Object.entries({
    distanceKm: '5', durationMinutes: '32', runningFormat: 'CONTINUOUS_RUN', courseJson: '{}', ...partial,
  })) data.set(key, value);
  data.set('sourceConditionJson', JSON.stringify(source));
  return data;
}
const base = { id: 'f03-record', activityType: 'run', date: '2026-10-12', course: {} };
test('F03 four absent stored measurements remain null, not invented zeros', () => {
  const { source, html } = sourceFrom({ ...base,
    distanceKm: null, durationMinutes: null, runningDistanceKm: null, runningDurationMinutes: null });
  for (const key of ['distanceKm','durationMinutes','runningDistanceKm','runningDurationMinutes'])
    assert.equal(source[key], null, key);
  assert.match(html, /— km・—分/);
});
test('F03 genuine recorded zero remains distinguishable from missing', () => {
  const { source } = sourceFrom({ ...base,
    distanceKm: 0, durationMinutes: 0, runningDistanceKm: 0, runningDurationMinutes: 0 });
  for (const key of ['distanceKm','durationMinutes','runningDistanceKm','runningDurationMinutes'])
    assert.equal(source[key], 0, key);
});
test('F03 malformed and empty stored measurements do not become zero', () => {
  const { source } = sourceFrom({ ...base,
    distanceKm: 'invalid', durationMinutes: '', runningDistanceKm: false, runningDurationMinutes: undefined });
  for (const key of ['distanceKm','durationMinutes','runningDistanceKm','runningDurationMinutes'])
    assert.equal(source[key], null, key);
});
test('F03 original missing distance/time produce missing labels', () => {
  const rows = changedConditionItems(dataOf({
    distanceKm: null, durationMinutes: null, runningFormat: 'CONTINUOUS_RUN', course: {} }));
  assert.deepEqual(rows.filter(x => ['distanceKm','durationMinutes'].includes(x.id)).map(x => x.label),
    ['距離 — → 5.0 km','時間 — → 32分']);
});
test('F03 genuine zero retains visible zero in original distance/time labels', () => {
  const rows = changedConditionItems(dataOf({
    distanceKm: 0, durationMinutes: 0, runningFormat: 'CONTINUOUS_RUN', course: {} }));
  assert.deepEqual(rows.filter(x => ['distanceKm','durationMinutes'].includes(x.id)).map(x => x.label),
    ['距離 0.0 → 5.0 km','時間 0 → 32分']);
});
test('F03 RUN_WALK missing baseline stays missing for both run-only fields', () => {
  const rows = changedConditionItems(dataOf({
    distanceKm: 5, durationMinutes: 32, runningFormat: 'RUN_WALK',
    runningDistanceKm: null, runningDurationMinutes: null, course: {},
  }, { runningFormat: 'RUN_WALK', runningDistanceKm: '3', runningDurationMinutes: '20' }));
  assert.deepEqual(rows.filter(x => ['runningDistanceKm','runningDurationMinutes'].includes(x.id)).map(x => x.label),
    ['走行区間距離 — → 3.0 km','走行区間時間 — → 20分']);
});
