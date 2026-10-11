import test from 'node:test';
import assert from 'node:assert/strict';
import { buildSelfUnderstandingView } from '../core/selfUnderstandingCore.js';
const signature={regionId:'BA-DISP-023',primaryRegionId:'R07',modelVersion:'MODEL-X',outputSemanticVersion:'SEM-X',constructId:'C-X',referenceId:'REF-X'};
function experience(value) {
 return {record:{id:'r-1',date:'2026-10-11',createdAt:'2026-10-11T12:00:00.000Z',activityType:'run',course:{id:'c-1',name:'コースA'}},
 feedback:{bodyAreaObservations:[{areaId:'BFR-240-POST',modelRegionId:'R07',intensity:3,laterality:'BILATERAL',sensationType:'TIGHTNESS',noticedTiming:'DURING'}]},
 regionalV2ResultRecord:{result:{regions:[{regionId:'BA-DISP-023',primaryRegionId:'R07',regionName:'下腿後面',value}]},comparison_signatures:{'BA-DISP-023':signature}}};
}
test('F03 missing science values are not numeric regional comparison candidates',()=>{
 for(const value of [null,undefined,'',false]) {
  const current=experience(value);
  assert.equal(buildSelfUnderstandingView({targetExperience:current,allExperiences:[current]}).primaryCandidate,null);
 }
});
test('F03 valid numeric zero remains a number',()=>{
 const current=experience(0);
 assert.equal(buildSelfUnderstandingView({targetExperience:current,allExperiences:[current]}).primaryCandidate?.threadType,'REGION_OBSERVATION_PAIR');
});
