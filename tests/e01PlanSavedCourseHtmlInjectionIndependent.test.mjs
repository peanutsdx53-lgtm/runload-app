import test from 'node:test';
import assert from 'node:assert/strict';
import { renderPlanScreen as mobile } from '../screens/mobile/planScreen.js';
import { renderPlanScreen as desktop } from '../screens/desktop/planScreen.js';

const payloads = [
  '<img src=x onerror=alert(1)>',
  '<svg onload=alert(1)>',
  '</span><a href="javascript:alert(1)">attack</a>',
  '" tabindex="0" autofocus onfocus="alert(1)',
];
function fakeServices(name) {
  const plan = {id:'saved-plan',scheduledDate:'2026-10-12',planType:'run',
    plannedSession:{activityType:'run',distanceKm:5,durationMinutes:30,
      course:{name,gradeKnowledge:'UNKNOWN',modelSurfaceClass:'UNKNOWN'}}};
  return {storage:{
    plans:{findById:id=>id===plan.id?plan:null,loadAll:()=>[plan]},
    records:{loadAll:()=>[],findById:()=>null},
    selfUnderstandingThreads:{loadAll:()=>[],findById:()=>null},
  },workflows:{records:{loadAllExperiences:()=>[]}}};
}
for (const [label,render] of [['mobile',mobile],['desktop',desktop]]) {
  test(`E01 ${label}: saved plan summary must encode course names in every branch`,()=>{
    for (const payload of payloads) {
      const markup = render({services:fakeServices(payload),context:{parameters:new URLSearchParams('planId=saved-plan')}});
      const excerpt=markup.match(/<span data-plan-summary-line>([\s\S]*?)<\/span>/)?.[1];
      assert.ok(excerpt, 'planned summary exists');
      assert.ok(!excerpt.includes('<img')&&!excerpt.includes('<svg')&&!excerpt.includes('</span')&&!excerpt.includes('<a href='), 'HTML not parsed from stored plan');
      assert.ok(excerpt.includes('&lt;') || payload.startsWith('"'), `course name escaped: ${payload}`);
      assert.ok(markup.includes('data-plan-summary-course'), 'normal plan fields remain present');
    }
  });
}
