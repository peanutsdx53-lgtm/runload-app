import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { renderMobileRunningRadar } from '../ui/mobileRunningRadar.js';

const record=(id,day)=>({id,date:day,createdAt:day+'T08:00:00Z',distanceKm:5,durationMinutes:30,activityType:'run',runningFormat:'CONTINUOUS_RUN'});
const current=record('now','2026-10-19');
const older=record('last','2026-10-18');
const oldest=record('old','2026-10-16');
const measurement={stepEstimate:{cadenceSpm:167},courseAnalysis:{gradeKnowledge:'KNOWN_PROFILE',elevationCoverage:.99,elevationGainM:31,distanceKm:5}};
const services={fatigue:{summarizeRun:()=>({available:true,pre:2,post:4})}};
const markup=()=>renderMobileRunningRadar({record:current,measurement,fatigue:{pre:2,post:4},allExperiences:[{record:older},{record:oldest}],findMeasurement:()=>measurement,services});

test('Round6 compact preview contains 3-colour radar and initially collapsed six-axis inspector',()=>{
 const html=markup();
 assert.match(html,/<svg class="running-radar__svg"/);
 assert.match(html,/<details class="running-radar__explore"><summary>/);
 assert.doesNotMatch(html,/<details class="running-radar__explore"[^>]*\bopen\b/);
 assert.equal((html.match(/data-running-radar-axis="[0-5]"/g)||[]).length,6);
 assert.equal((html.match(/class="running-radar__compare-value/g)||[]).length,18);
 assert.match(html,/data-running-radar-select/);
 const css=fs.readFileSync(new URL('../styles/mobile-run-lab.css',import.meta.url),'utf8');
 assert.match(css,/\.running-radar__explore>summary/);
 assert.match(css,/\.running-radar__svg\{width:min\(calc\(100% - 12px\),306px\)/);
});

test('Round6 no fake polygon and no inspector when manual-only input cannot form a radar',()=>{
 const html=renderMobileRunningRadar({record:current,allExperiences:[]});
 assert.doesNotMatch(html,/class="running-radar__svg"/);
 assert.doesNotMatch(html,/class="running-radar__explore"/);
 assert.match(html,/2\/6軸/);
});
