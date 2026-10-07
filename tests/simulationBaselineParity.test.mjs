import assert from 'node:assert/strict';
import { createApplicationServices, createMemoryStorage } from '../core/appCore.js';
import { renderSimulationScreen as renderDesktop } from '../screens/desktop/simulationScreen.js';
import { renderSimulationScreen as renderMobile } from '../screens/mobile/simulationScreen.js';

const results=[];
async function test(id,fn){try{await fn();results.push({id,status:'PASS'});}catch(error){results.push({id,status:'FAIL',message:error?.stack||String(error)});}}
const context=(query='')=>({parameters:new URLSearchParams(query)});
function setup(){
  const services=createApplicationServices({storage:createMemoryStorage()});
  const record={id:'r1',date:'2026-10-04',createdAt:'2026-10-04T08:00:00Z',activityType:'run',distanceKm:5,durationMinutes:30,runningFormat:'CONTINUOUS_RUN',stepsProvenance:'UNKNOWN',course:{name:'河川コース',gradeKnowledge:'UNKNOWN',modelSurfaceClass:'UNKNOWN'},reflectionContext:{nextCheckPoint:'序盤のペースを見る'}};
  const saved=services.workflows.records.saveRecordAndFeedback(record,{checkStatus:'deferred',bodyAreaObservations:[],safetyFlags:{}});
  assert.equal(saved.ok,true,JSON.stringify(saved));
  return services;
}

await test('PC-AND-MOBILE-SHARE-THE-SAME-COMPARISON-CORE',()=>{
  const services=setup();
  for(const render of [renderDesktop,renderMobile]){
    const html=render({services,context:context('recordId=r1&from=interpretation-room&roomOrigin=history')});
    assert.match(html,/保存記録を基準に条件を比べる/);
    assert.match(html,/name="sourceRecordId" value="r1"/);
    assert.match(html,/name="distanceKm"[^>]*value="5\.0"/);
    assert.match(html,/name="durationMinutes"[^>]*value="30"/);
    assert.match(html,/河川コース/);
    assert.match(html,/#\/interpretation-room\?recordId=r1&amp;origin=history/);
    assert.match(html,/data-simulation-condition-section="distance"/);
    assert.match(html,/data-simulation-condition-section="time"/);
    assert.match(html,/data-simulation-condition-section="course"/);
    assert.match(html,/data-simulation-condition-section="format"/);
  }
});

await test('MOBILE-ONLY-CONDITION-PICKER-DOES-NOT-LEAK-INTO-PC',()=>{
  const services=setup();
  const pc=renderDesktop({services,context:context('recordId=r1')});
  const mobile=renderMobile({services,context:context('recordId=r1')});
  assert.doesNotMatch(pc,/mobile-simulation-picker/);
  assert.doesNotMatch(pc,/data-simulation-picker/);
  assert.match(mobile,/mobile-simulation-picker/);
  for(const tab of ['distance','time','course','format']) assert.match(mobile,new RegExp(`data-simulation-picker-tab="${tab}"`));
});

await test('LATEST-RUN-FALLBACK-IS-KEPT-ON-BOTH-LAYOUTS',()=>{
  const services=setup();
  for(const render of [renderDesktop,renderMobile]){
    const html=render({services,context:context()});
    assert.match(html,/直近記録を基準に条件を比べる/);
    assert.match(html,/name="sourceRecordId" value="r1"/);
  }
});

await test('RETIRED-PREVIOUS-CHECK-IS-NOT-RENDERED',()=>{
  const services=setup();
  for(const render of [renderDesktop,renderMobile]){
    const html=render({services,context:context('recordId=r1')});
    assert.doesNotMatch(html,/condition-compare-carry|次に確認したいこと|序盤のペースを見る|nextCheckPoint/);
    assert.doesNotMatch(html,/USER_DEFINED_LEGACY|legacyOrigin/);
  }
});

const failed=results.filter((row)=>row.status==='FAIL');
console.log(JSON.stringify({suite:'Simulation Baseline Parity',total:results.length,passed:results.length-failed.length,failed:failed.length,status:failed.length?'FAIL':'PASS',results},null,2));
if(failed.length)process.exitCode=1;
