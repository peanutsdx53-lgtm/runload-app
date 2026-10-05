import assert from 'node:assert/strict';
import { renderInterpretationRoomScreen as renderDesktop } from '../screens/desktop/interpretationRoomScreen.js';
import { renderInterpretationRoomScreen as renderMobile } from '../screens/mobile/interpretationRoomScreen.js';

const results=[];
async function test(id,fn){try{await fn();results.push({id,status:'PASS'});}catch(error){results.push({id,status:'FAIL',message:error?.stack||String(error)});}}

function runExperience(){
  const signature={regionId:'BA-DISP-023',primaryRegionId:'R07',modelVersion:'M1',outputSemanticVersion:'S1',constructId:'C1',referenceId:'R1'};
  return {
    record:{id:'run-1',date:'2026-10-01',createdAt:'2026-10-01T12:00:00Z',activityType:'run',distanceKm:5,durationMinutes:30,runningFormat:'CONTINUOUS_RUN',course:{gradeKnowledge:'UNKNOWN'}},
    feedback:{checkStatus:'deferred',bodyAreaObservations:[{areaId:'BFR-240-POST',modelRegionId:'R07',intensity:3,laterality:'BILATERAL',sensationType:'TIGHTNESS',noticedTiming:'DURING'}],safetyFlags:{}},
    regionalV2ResultRecord:{
      id:'result-run-1',model_version:'M1',output_semantic_version:'S1',engine_build_version:'B1',authority_version:'A1',
      comparison_signatures:{'BA-DISP-023':signature},source_registry:{},
      result:{regions:[{regionId:'BA-DISP-023',primaryRegionId:'R07',regionName:'下腿後面',value:104,calculationState:'CALCULATED',evidenceState:'DIRECT',evidenceStates:['DIRECT'],construct:'下腿後面の部位内Reference-100',constructId:'C1',referenceId:'R1',sourceIds:[],coverageProportion:1,unsupportedDistanceKm:0,axisEstimates:[]}]},
    },
    regionalSemanticState:'REFERENCE100_V3',regionalV2Recovery:null,
    supportDecision:{route:'normal',reasons:[],blocks:[],nextActions:[]},
  };
}
function restExperience(){
  return {
    record:{id:'rest-1',date:'2026-10-02',createdAt:'2026-10-02T12:00:00Z',activityType:'rest'},
    feedback:{checkStatus:'deferred',bodyAreaObservations:[],safetyFlags:{}},
    regionalV2ResultRecord:null,regionalSemanticState:null,regionalV2Recovery:null,
    supportDecision:{route:'normal',reasons:[],blocks:[],nextActions:[]},
  };
}
function servicesFor(experiences){
  const byId=new Map(experiences.map((experience)=>[experience.record.id,experience]));
  return {
    workflows:{records:{
      loadExperience:(id)=>byId.get(String(id))||null,
      loadLatestExperience:()=>experiences.at(-1)||null,
      loadAllExperiences:()=>[...experiences],
    }},
    fatigue:{summarizeRun:()=>null,recentReference:()=>null},
    storage:{selfUnderstandingThreads:{loadAll:()=>[]},selfInterpretations:{findByRecordId:()=>null}},
  };
}
function context(query){return {parameters:new URLSearchParams(query)};}

await test('PC-AND-MOBILE-WRAPPERS-RENDER-THE-CURRENT-RUN-WITH-SEPARATE-LAYOUTS',()=>{
  const experience=runExperience();
  const services=servicesFor([experience]);
  const pc=renderDesktop({services,context:context('recordId=run-1&origin=result')});
  const mobile=renderMobile({services,context:context('recordId=run-1&origin=result')});
  assert.match(pc,/interpretation-flow-room--wide/);
  assert.doesNotMatch(pc,/interpretation-flow-room--compact/);
  assert.match(mobile,/interpretation-flow-room--compact/);
  assert.doesNotMatch(mobile,/interpretation-flow-room--wide/);
  assert.match(pc,/今回、まず見るところ/);
  assert.match(mobile,/今回、まず見るところ/);
  assert.match(pc,/下腿後面/);
  assert.match(mobile,/下腿後面/);
});

await test('PC-KEEPS-BASELINE-DEFAULT-REGION-SELECTION-WHILE-MOBILE-WAITS-FOR-TAP',()=>{
  const experience=runExperience();
  const services=servicesFor([experience]);
  const pc=renderDesktop({services,context:context('recordId=run-1&origin=result')});
  const mobile=renderMobile({services,context:context('recordId=run-1&origin=result')});
  assert.match(pc,/href="#\/plan\?[^\"]*regionId=BA-DISP-023/);
  assert.match(pc,/href="#\/simulation\?[^\"]*regionId=BA-DISP-023/);
  assert.doesNotMatch(mobile,/href="#\/plan\?[^\"]*regionId=BA-DISP-023/);
  assert.doesNotMatch(mobile,/href="#\/simulation\?[^\"]*regionId=BA-DISP-023/);
  assert.match(mobile,/href="#\/interpretation-room\?recordId=run-1&amp;origin=result&amp;regionId=BA-DISP-023"/);
});

await test('EXPLICIT-REGION-DEEP-LINK-RENDERS-ON-BOTH-LAYOUTS',()=>{
  const experience=runExperience();
  const services=servicesFor([experience]);
  const query='recordId=run-1&origin=body-part-detail&regionId=BA-DISP-023';
  for(const render of [renderDesktop,renderMobile]){
    const html=render({services,context:context(query)});
    assert.match(html,/data-origin="body-part-detail"/);
    assert.match(html,/href="#\/plan\?[^\"]*regionId=BA-DISP-023/);
  }
});

await test('REST-AND-MISSING-TARGET-STATES-DO-NOT-CRASH-EITHER-LAYOUT',()=>{
  const rest=restExperience();
  const services=servicesFor([rest]);
  for(const render of [renderDesktop,renderMobile]){
    const restHtml=render({services,context:context('recordId=rest-1&origin=history')});
    assert.match(restHtml,/data-origin="history"/);
    assert.match(restHtml,/休養/);
    const missingHtml=render({services,context:context('recordId=missing&origin=invalid-origin')});
    assert.match(missingHtml,/data-origin="result"/);
    assert.match(missingHtml,/記録/);
  }
});

const failed=results.filter((row)=>row.status==='FAIL');
console.log(JSON.stringify({suite:'Interpretation Room Baseline Parity',total:results.length,passed:results.length-failed.length,failed:failed.length,status:failed.length?'FAIL':'PASS',results},null,2));
if(failed.length)process.exitCode=1;
