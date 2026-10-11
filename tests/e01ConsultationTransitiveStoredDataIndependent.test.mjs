import test from 'node:test';
import assert from 'node:assert/strict';
import { renderConsultationScreen } from '../screens/consultationScreen.js';

const payloads = Object.freeze([
  '<img src="https://mal.invalid/collect" onerror="window.__xss=1">',
  '<svg onload="window.__xss=1"></svg>',
  '\"><iframe srcdoc="<script>alert(1)</script>"></iframe>',
  '" onmouseover="window.__xss=1',
]);

function fixture(attack) {
  const current = { record: { id: 'r1', date: '2026-10-11', activityType: 'run',
    distanceKm: 5, durationMinutes: 31, course: {name: attack} } };
  const previous = {record:{id:'r0',date:'2026-10-09',activityType:'run',distanceKm:5,
    durationMinutes:31,course:{name:'before'}}};
  const report = { date: '2026-10-11', recent: [], exactBodyObservations: [
    { label: attack, intensity: 3, sensation: attack, lateralityLabel: attack }],
    subjectiveParts: [{label:attack, fatigue:3, discomfort:0}]};
  const services = {
    workflows: {records: {loadAllExperiences: () => [previous,current], loadExperience:() => current,
      loadLatestExperience:() => current}},
    storage: { plans: {loadAll:()=>[{id:'p',scheduledDate:'2026-10-12',planType:'run',
      plannedSession:{activityType:'run',course:{name:attack},distanceKm:5}}]},
      profile: {load:()=>({ runningStartDateOrBand:attack,experienceSelfAssessment:attack,
        runningGoalTags:[attack]})},
      selfUnderstandingThreads:{findById:()=>null}},
    consultation: {buildDeterministicConsultation:()=>({regionOptions:[],regionId:'',regional:{}}),
      buildConsultationReport:()=>report},
    fatigue:{summarizeRun:()=>({pre:2,post:5})},
  };
  return { services, context:{ parameters:new URLSearchParams('recordId=r1') }};
}

test('E01: stored records, reports, plan, profile and history remain literal in delegated consultation HTML',()=>{
  for(const attack of payloads){
    const markup=renderConsultationScreen(fixture(attack));
    assert.ok(markup.includes('&lt;') || markup.includes('&quot;'), 'Potential attacker text remains displayable');
    assert.doesNotMatch(markup, /<img\s|<svg\s+onload|<iframe\s|<script\b/i,
      'No attack-created elements or executable attributes may enter the HTML parser');
    assert.ok(markup.includes('&lt;img') || markup.includes('&lt;svg') ||
      markup.includes('&lt;iframe') || markup.includes('&quot;'), 'Visible content is safely encoded');
  }
});
