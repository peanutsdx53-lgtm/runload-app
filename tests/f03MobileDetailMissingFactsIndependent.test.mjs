import test from 'node:test';
import assert from 'node:assert/strict';
import { renderBodyPartDetailScreen } from '../screens/mobile/bodyPartDetailScreen.js';
import { PRIMARY_REGIONAL_V2_MODEL_VERSION } from '../core/appCore.js';
const REGION='BA-DISP-023';
function html(distanceKm,durationMinutes) {
 const id='missing-fact';
 const row={regionId:REGION, primaryRegionId:'R07',regionName:'下腿後面',value:104};
 const current={record:{id,date:'2026-10-11',activityType:'run',distanceKm,durationMinutes},regionalV2Result:{regions:[row]},regionalV2ResultRecord:{record_id:id, model_version:PRIMARY_REGIONAL_V2_MODEL_VERSION,result:{regions:[row]}, comparison_signatures:{[REGION]:{regionId:REGION,modelVersion:PRIMARY_REGIONAL_V2_MODEL_VERSION, outputSemanticVersion:'runload-primary-regional-reference100-output-v3.1', constructId:'X', referenceId:'Y'}}}};
 const services={workflows:{records:{loadExperience:()=>current,loadAllExperiences:()=>[current]}}};
 return renderBodyPartDetailScreen({services,context:{parameters:new URLSearchParams(`recordId=${id}&regionId=${REGION}`)}});
}
test('F03: absent distance/duration do not masquerade as present details',()=>{
 for(const missing of [null,undefined,'',false]) {
  const output=html(missing,missing);
  assert.match(output,/data-trend-detail-facts>距離なし<\/p>/);
  assert.doesNotMatch(output,/— km|—分|0 km・/);
 }
});
test('F03: actual numeric zero stays a recorded value',()=>{
 const output=html(0,0);
 assert.match(output,/data-trend-detail-facts>0\.00 km ・ 0分<\/p>/);
});
