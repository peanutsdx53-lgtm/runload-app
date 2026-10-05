import assert from 'node:assert/strict';
import { createApplicationServices, createMemoryStorage } from '../core/appCore.js';
import { renderPlanScreen as renderDesktop } from '../screens/desktop/planScreen.js';
import { renderPlanScreen as renderMobile } from '../screens/mobile/planScreen.js';

const results=[];
async function test(id,fn){try{await fn();results.push({id,status:'PASS'});}catch(error){results.push({id,status:'FAIL',message:error?.stack||String(error)});}}
const context=(query='')=>({parameters:new URLSearchParams(query)});

function servicesWithPreviousCheck(){
  const services=createApplicationServices({storage:createMemoryStorage()});
  const record={
    id:'run-prev',date:'2026-10-04',createdAt:'2026-10-04T08:00:00Z',activityType:'run',
    distanceKm:5,durationMinutes:30,runningFormat:'CONTINUOUS_RUN',stepsProvenance:'UNKNOWN',
    course:{name:'基準コース',gradeKnowledge:'UNKNOWN',modelSurfaceClass:'UNKNOWN'},
    reflectionContext:{nextCheckPoint:'序盤のペースを確認'},
  };
  const feedback={checkStatus:'deferred',bodyAreaObservations:[],safetyFlags:{}};
  const saved=services.workflows.records.saveRecordAndFeedback(record,feedback);
  assert.equal(saved.ok,true,JSON.stringify(saved));
  return services;
}

await test('PC-RESTORES-BASELINE-PREVIOUS-CHECK-DISPLAY-WITHOUT-OLD-LOGIC',()=>{
  const services=servicesWithPreviousCheck();
  const html=renderDesktop({services,context:context('sourceRecordId=run-prev')});
  assert.match(html,/今回の記録から引き継いだ内容/);
  assert.match(html,/以前に残した確認メモ/);
  assert.match(html,/序盤のペースを確認/);
  assert.doesNotMatch(html,/plan-mobile-review-button|plan-mobile-edit-button|plan-mobile-saved-success/);
});

await test('MOBILE-KEEPS-BASELINE-REVIEW-FLOW-AND-PREVIOUS-CHECK-DISPLAY',()=>{
  const services=servicesWithPreviousCheck();
  const html=renderMobile({services,context:context('sourceRecordId=run-prev')});
  assert.match(html,/以前に残した確認メモ/);
  assert.match(html,/序盤のペースを確認/);
  assert.match(html,/plan-mobile-review-button/);
  assert.match(html,/data-action="plan-review"/);
  assert.match(html,/plan-mobile-edit-button/);
  assert.match(html,/data-plan-confirm/);
});

await test('NEW-SELF-UNDERSTANDING-THREAD-UI-REMAINS-SEPARATE-FROM-PREVIOUS-NOTE',()=>{
  const services=servicesWithPreviousCheck();
  const html=renderDesktop({services,context:context('sourceRecordId=run-prev')});
  assert.doesNotMatch(html,/USER_DEFINED_LEGACY|legacyOrigin/);
  assert.match(html,/入力後に変更できます。自動提案ではありません。/);
});

const failed=results.filter((row)=>row.status==='FAIL');
console.log(JSON.stringify({suite:'Plan Baseline Parity',total:results.length,passed:results.length-failed.length,failed:failed.length,status:failed.length?'FAIL':'PASS',results},null,2));
if(failed.length)process.exitCode=1;
