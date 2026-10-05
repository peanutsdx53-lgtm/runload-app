import assert from 'node:assert/strict';
import { createApplicationServices, createMemoryStorage } from '../core/appCore.js';
import { renderHistoryScreen as renderDesktop } from '../screens/desktop/historyScreen.js';
import { renderHistoryScreen as renderMobile } from '../screens/mobile/historyScreen.js';

const results=[];
async function test(id,fn){try{await fn();results.push({id,status:'PASS'});}catch(error){results.push({id,status:'FAIL',message:error?.stack||String(error)});}}
const context=(query='')=>({parameters:new URLSearchParams(query)});

function servicesWithRecords(){
  const services=createApplicationServices({storage:createMemoryStorage()});
  const save=(id,date,speedMps,courseName)=>{
    const distanceKm=5;
    const record={
      id,date,createdAt:`${date}T08:00:00Z`,activityType:'run',distanceKm,
      durationMinutes:distanceKm*1000/(speedMps*60),runningFormat:'CONTINUOUS_RUN',stepsProvenance:'UNKNOWN',
      course:{name:courseName,gradeKnowledge:'UNKNOWN',modelSurfaceClass:'UNKNOWN'},
    };
    const feedback={checkStatus:'deferred',bodyAreaObservations:[],safetyFlags:{}};
    const saved=services.workflows.records.saveRecordAndFeedback(record,feedback);
    assert.equal(saved.ok,true,JSON.stringify(saved));
  };
  save('sat','2026-10-03',2.5,'土曜コース');
  save('sun','2026-10-04',3.0,'日曜コース');
  return services;
}

await test('EMPTY-STATES-KEEP-PC-AND-MOBILE-DESIGN-DIFFERENCE',()=>{
  const services=createApplicationServices({storage:createMemoryStorage()});
  const pc=renderDesktop({services,context:context()});
  const mobile=renderMobile({services,context:context()});
  assert.match(pc,/保存した記録はまだありません/);
  assert.doesNotMatch(pc,/mobile-history-empty/);
  assert.match(mobile,/最初の記録を残すと、ここで変化を見返せます/);
  assert.match(mobile,/mobile-history-empty__preview/);
});

await test('RECORDS-VIEW-KEEPS-DEVICE-SPECIFIC-NAVIGATION-AND-TITLES',()=>{
  const services=servicesWithRecords();
  const pc=renderDesktop({services,context:context('view=records')});
  const mobile=renderMobile({services,context:context('view=records')});
  assert.match(pc,/desktop-history-mode/);
  assert.match(pc,/>保存記録<\/a>/);
  assert.match(pc,/>確認中<\/a>/);
  assert.doesNotMatch(pc,/mobile-history-mode/);
  assert.match(pc,/<h2>保存記録<\/h2>/);
  assert.match(mobile,/mobile-history-mode/);
  assert.match(mobile,/>記録<\/a>/);
  assert.match(mobile,/>推移<\/a>/);
  assert.match(mobile,/>確認中<\/a>/);
  assert.doesNotMatch(mobile,/desktop-history-mode/);
  assert.match(mobile,/<h2>保存記録を探す<\/h2>/);
  for(const html of [pc,mobile]){
    assert.match(html,/土曜コース/);
    assert.match(html,/日曜コース/);
    assert.match(html,/date-weekend--sat/);
    assert.match(html,/date-weekend--sun/);
    assert.match(html,/data-action="delete-history-record"/);
  }
});

await test('MOBILE-TRENDS-KEEP-BASELINE-COMPARISON-CONTROLS',()=>{
  const services=servicesWithRecords();
  const mobile=renderMobile({services,context:context('view=trends&regionId=BA-DISP-014&display=ratio')});
  assert.match(mobile,/history-view--compare/);
  assert.match(mobile,/同じ部位を比べる/);
  assert.match(mobile,/基準との比率/);
  assert.match(mobile,/基準からの差/);
  assert.match(mobile,/比較できる記録/);
  assert.match(mobile,/chart-svg/);
  assert.match(mobile,/date-weekend--sat/);
  assert.match(mobile,/date-weekend--sun/);
  assert.match(mobile,/data-action="open-history-region-picker"/);
});

await test('PC-DIRECT-TRENDS-QUERY-STILL-NORMALIZES-TO-RECORDS',()=>{
  const services=servicesWithRecords();
  const pc=renderDesktop({services,context:context('view=trends&regionId=BA-DISP-014')});
  assert.match(pc,/history-view--records/);
  assert.doesNotMatch(pc,/history-view--compare/);
});

await test('CHECKS-VIEW-RENDERS-ON-BOTH-LAYOUTS',()=>{
  const services=servicesWithRecords();
  for(const render of [renderDesktop,renderMobile]){
    const html=render({services,context:context('view=checks&checkState=watching')});
    assert.match(html,/自分について確認してきたこと/);
    assert.match(html,/確認中/);
    assert.match(html,/休止中/);
    assert.match(html,/終了したもの/);
  }
});

const failed=results.filter((row)=>row.status==='FAIL');
console.log(JSON.stringify({suite:'History Baseline Parity',total:results.length,passed:results.length-failed.length,failed:failed.length,status:failed.length?'FAIL':'PASS',results},null,2));
if(failed.length)process.exitCode=1;
