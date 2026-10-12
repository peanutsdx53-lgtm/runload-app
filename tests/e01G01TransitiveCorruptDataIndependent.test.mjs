import test from 'node:test';
import assert from 'node:assert/strict';
import { collectMobileFatigueHistory, renderMobileFatigueTrend } from '../ui/mobileInsights.js';
import { renderBodyPartDetailScreen } from '../screens/desktop/bodyPartDetailScreen.js';
import { renderConsultationScreen } from '../screens/consultationScreen.js';

const ATTACK = '<img src="https://audit.invalid/collect" onerror="window.__runload=1">';
function renderFixture(report) {
  const current = { record: { id: 'record-1', date: '2026-10-12', activityType: 'run', distanceKm: 0, durationMinutes: 0, course: { name: ATTACK } } };
  const services = {
    workflows: { records: { loadAllExperiences: () => [current], loadLatestExperience: () => current, loadExperience: () => current } },
    storage: { plans: { loadAll: () => [] }, profile: { load: () => ({}) }, selfUnderstandingThreads: { findById: () => null } },
    consultation: { buildDeterministicConsultation: () => ({ regionId: '', regionOptions: [], regional: {} }), buildConsultationReport: () => report },
    fatigue: { summarizeRun: () => ({ available: false }) },
  };
  return renderConsultationScreen({ services, context: { parameters: new URLSearchParams('recordId=record-1') } });
}
function assertLiteral(html) {
  assert.ok(html.includes('&lt;img'), 'Saved user text should be encoded, not lost');
  assert.doesNotMatch(html, /<img\s+src="https:\/\/audit\.invalid|onerror="window\.__runload/i);
}
test('E01/G01: malformed saved fatigue record collection cannot crash mobile history', () => {
  const services = { storage: { records: { loadAll: () => { return { value: ATTACK }; } } }, fatigue: { summarizeRun: () => null } };
  assert.deepEqual([...collectMobileFatigueHistory(services)], []);
  assert.equal(renderMobileFatigueTrend(services), '');
});
test('E01/G01: malformed regional array entry cannot crash desktop body-part detail', () => {
  const stored = { record: { id: 'r', date: '2026-10-12', activityType: 'run' }, regionalV2Result: { regions: [null, ATTACK] }, regionalV2ResultRecord: { model_version: 'v3.1' } };
  const html = renderBodyPartDetailScreen({
    services: { workflows: { records: { loadExperience: () => stored, loadAllExperiences: () => [stored] } } },
    context: { parameters: new URLSearchParams('recordId=r&regionId=BA-DISP-019') },
  });
  assert.match(html, /この部位の数値を表示できません/);
  assert.doesNotMatch(html, /<img\s+src="https:\/\/audit\.invalid/i);
});
test('E01/G01: malformed consultation observation collections and null entries remain safe', () => {
  for (const observations of [{}, 'bad', [null, { label: ATTACK, sensation: ATTACK }]]) {
    for (const subjective of [false, { label: ATTACK }, [null, { label: ATTACK, fatigue: 0 }]]) {
      const html = renderFixture({ recent: [], exactBodyObservations: observations, subjectiveParts: subjective });
      assertLiteral(html);
    }
  }
});
test('E01/G01: malformed consultation trend history is ignored rather than crashing', () => {
  for (const recent of [{ message: ATTACK }, 'corrupt', [null, {date:'2026-10-12', regionalDirectComparable:true, regionalValue: 102 }]]) {
    const html = renderFixture({ recent, exactBodyObservations: [], subjectiveParts: [] });
    assertLiteral(html);
  }
});
