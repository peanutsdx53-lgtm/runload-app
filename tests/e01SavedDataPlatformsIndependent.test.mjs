import test from 'node:test';
import assert from 'node:assert/strict';
import { renderHistoryScreen as desktopHistory } from '../screens/desktop/historyScreen.js';
import { renderHistoryScreen as mobileHistory } from '../screens/mobile/historyScreen.js';
import { renderSettingsScreen as desktopSettings } from '../screens/desktop/settingsScreen.js';
import { renderSettingsScreen as mobileSettings } from '../screens/mobile/settingsScreen.js';
import { renderCourseLibraryScreen as desktopCourses } from '../screens/desktop/courseLibraryScreen.js';
import { renderCourseLibraryScreen as mobileCourses } from '../screens/mobile/courseLibraryScreen.js';

// Intentional, direct renderer-level adversarial tests of all six platform
// delegates; no mock of the HTML escaping helper or replacement renderer.
const attacks=[
  '<img src=x onerror=alert(1)>',
  '\"><svg onload=alert(1)>',
  '<iframe srcdoc="<script>alert(1)</script>"></iframe>',
  '" autofocus onfocus="alert(1)',
  '</a><a href="javascript:alert(1)">bad</a>',
];
function servicesFor(payload) {
 const record={id:`record-${payload}`,date:'2026-10-11',createdAt:'2026-10-11T10:00:00Z',activityType:'run',
  distanceKm:5,durationMinutes:30,course:{name:payload},reflectionContext:{postRunReflection:payload}};
 const experience={record,feedback:{subjectiveStatus:'deferred'},regionalV2ResultRecord:null};
 return {
  workflows:{records:{loadAllExperiences:()=>[experience]},history:{loadUndoEntry:()=>null}},
  storage:{
   modelResultsRegionalV2:{latestByRecord:()=>new Map()},
   plans:{loadAll:()=>[]},selfUnderstandingThreads:{loadAll:()=>[]},
   settings:{load:()=>({savedShoes:[{id:`shoe-${payload}`,label:payload}]})},
   profile:{load:()=>({runningStartDateOrBand:payload,experienceSelfAssessment:payload,heightCm:payload,
     weightKg:payload,ageBand:payload,runningGoalTags:[payload]})},
   records:{loadAll:()=>[record]},courses:{loadAll:()=>[{id:`course-${payload}`,name:payload,course:{name:payload}}]},
   draft:{load:()=>null},
  },fatigue:{summarizeRun:()=>null},
 };
}
function check(html, payload, label) {
 assert.ok(html.length>500,`${label} renderer returned meaningful markup`);
 assert.ok(html.includes('&lt;')||html.includes('%3C')||html.includes('&quot;')||html.includes('%22'),`${label}: encoded taint present`);
 assert.ok(!html.includes(payload),`${label}: raw payload must not enter markup`);
 assert.doesNotMatch(html,/<img\s+src=x\s+onerror=/i);
 assert.doesNotMatch(html,/<iframe\s+srcdoc=/i);
 assert.doesNotMatch(html,/<a\s+href="javascript:/i);
}
for(const [label,history,settings,courses] of [
 ['desktop',desktopHistory,desktopSettings,desktopCourses],
 ['mobile',mobileHistory,mobileSettings,mobileCourses],
]) {
 test(`E01 ${label}: saved run, course, memo and query cannot become history HTML`,()=>{
  for(const attack of attacks){
   const services=servicesFor(attack);
   const context={parameters:new URLSearchParams(`view=records&period=28&anchorDate=2026-10-11&query=${encodeURIComponent(attack)}`)};
   const html=history({services,context});
   check(html,attack,'history');
   assert.match(html,/data-action="delete-history-record"/);
  }
 });
 test(`E01 ${label}: saved profile and shoes cannot become settings HTML or attributes`,()=>{
  for(const attack of attacks){
   const html=settings({services:servicesFor(attack),context:{parameters:new URLSearchParams('section=data')}});
   check(html,attack,'settings');
   assert.match(html,/data-shoe-id=/);
  }
 });
 test(`E01 ${label}: restored course and route hash cannot become course-list HTML or attributes`,()=>{
  for(const attack of attacks){
   const context={parameters:new URLSearchParams(`returnTo=${encodeURIComponent('#/plan?memo='+attack)}`)};
   const html=courses({services:servicesFor(attack),context});
   check(html,attack,'courses');
   assert.match(html,/data-course-id=/);
  }
 });
}
