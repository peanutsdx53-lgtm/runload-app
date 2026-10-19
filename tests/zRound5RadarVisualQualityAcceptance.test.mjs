import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { renderMobileRunningRadar } from '../ui/mobileRunningRadar.js';
import { VIEWS, bodyMap } from '../screens/resultScreen.js';
import { ANATOMY_UNDERPAINT, ANATOMY_MARKINGS } from '../ui/anatomicalBodySvg.js';

const makeRun=(id,date,pace=30)=>({id,date,createdAt:`${date}T08:00:00.000Z`,distanceKm:5,durationMinutes:pace,activityType:'run',runningFormat:'CONTINUOUS_RUN'});
const current=makeRun('record-3','2026-10-19');
const older=makeRun('record-2','2026-10-17',33);
const oldest=makeRun('record-1','2026-10-14',36);
const fatigue={pre:3,post:5};
const m={stepEstimate:{modelId:'device-motion-peak-v1',cadenceSpm:160},courseAnalysis:{gradeKnowledge:'KNOWN_PROFILE',elevationCoverage:.98,distanceKm:5,elevationGainM:33}};
const html=()=>renderMobileRunningRadar({record:current,measurement:m,fatigue,allExperiences:[{record:older},{record:oldest}],findMeasurement:()=>m,services:{fatigue:{summarizeRun:()=>({available:true,...fatigue})}}});

test('Round5 six axis explorer offers exactly six real metric buttons and three pre-rendered comparison values',()=>{
  const markup=html();
  assert.equal((markup.match(/data-running-radar-axis="[0-5]"/g)||[]).length,6);
  assert.equal((markup.match(/data-running-radar-axis-panel="[0-5]"/g)||[]).length,6);
  assert.equal((markup.match(/class="running-radar__compare-value/g)||[]).length,18);
  assert.match(markup,/data-running-radar-history-value-slot>8\.3 km\/h/); // 5km in 36 minutes
  assert.match(markup,/data-running-radar-select/);
  assert.doesNotMatch(markup,/record-1<\/option>|record-2<\/option>/); // no internal record IDs in visible labels
});

test('Round5 visual stays in mobile module; unchanged six-axis values and missing-value handling',()=>{
  const mobile=fs.readFileSync(new URL('../ui/mobileRunningRadar.js', import.meta.url),'utf8');
  const binder=fs.readFileSync(new URL('../ui/interactions/mobileResultInteractions.js',import.meta.url),'utf8');
  const shared=fs.readFileSync(new URL('../styles/result-screen-base.css',import.meta.url),'utf8');
  const style=fs.readFileSync(new URL('../styles/mobile-run-lab.css',import.meta.url),'utf8');
  assert.match(binder,/syncAxisPanel/);
  assert.match(binder,/aria-pressed/);
  assert.match(binder,/layer\.removeAttribute\("hidden"\)/);
  assert.match(binder,/layer\.setAttribute\("hidden", "hidden"\)/);
  assert.doesNotMatch(binder,/layer\.hidden\s*=/);
  assert.match(mobile,/raw\[axis\.id\]/);
  assert.match(mobile,/profileSvgPath/);
  assert.match(shared,/anatomy-underpaint/);
  assert.match(style,/\.running-radar__axis-panel\[hidden\]/);
  assert.match(style,/\.body-view\[data-view="sole"\]/);
  assert.doesNotMatch(mobile,/Math\.random/);
});

test('Round5 shared anatomical upgrade includes underpaint and landmark details but protects exactly twelve hotspots',()=>{
  assert.deepEqual(VIEWS.map(v=>v.paths.length),[5,4,3]);
  for(const view of VIEWS){
    assert.equal(view.underpaint,ANATOMY_UNDERPAINT[view.key]);
    assert.equal(view.markings,ANATOMY_MARKINGS[view.key]);
    assert.match(view.underpaint,/anatomy-underpaint/);
    assert.match(view.markings,/anatomy-highlight/);
  }
  const ids=VIEWS.flatMap(v=>v.paths.map(([id])=>id));
  assert.equal(new Set(ids).size,12);
  const markup=bodyMap({record_id:'r3'},ids.map(regionId=>({row:{regionId,value:100}})),'test');
  assert.equal((markup.match(/class="region-link"/g)||[]).length,12);
  assert.equal((markup.match(/class="anatomy-underpaint"/g)||[]).length,3);
  assert.equal((markup.match(/class="anatomy-detail"/g)||[]).length,3);
});
