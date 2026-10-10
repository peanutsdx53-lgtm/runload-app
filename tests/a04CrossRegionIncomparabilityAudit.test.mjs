import test from 'node:test';
import assert from 'node:assert/strict';
import { createApplicationServices, createMemoryStorage } from '../core/appCore.js';
import { internalModules } from '../core/internal/modules.js';

const { comparePrimaryRegionalV2Signatures } = internalModules.primaryRegionalResultService;
const svc = createApplicationServices({ storage: createMemoryStorage() });
const record = { id: 'a04-identity', date:'2026-10-10', createdAt:'2026-10-10T00:00:00.000Z', activityType:'run', distanceKm:5, durationMinutes:32, runningFormat:'CONTINUOUS_RUN', stepsProvenance:'UNKNOWN', course:{gradeKnowledge:'UNKNOWN',modelSurfaceClass:'UNKNOWN'}};
const feedback = {checkStatus:'deferred',bodyAreaObservations:[],safetyFlags:{}};
const save=svc.workflows.records.saveRecordAndFeedback(record,feedback);
assert.equal(save.ok,true,JSON.stringify(save));
const result=svc.workflows.records.loadExperience(record.id).regionalV2ResultRecord;
assert.ok(result?.result?.regions?.length===12);
const entries=Object.entries(result.comparison_signatures);

// The 12 numerical constructs are *not* a single common physical unit.
// Only same-region, same-model, same-output-semantic, same-construct, same-reference deltas are eligible.
test('A-04: 12 independent same-region comparisons work',()=>{
 assert.equal(entries.length,12);
 assert.equal(new Set(entries.map(([,s])=>s.constructId)).size,12);
 assert.equal(new Set(entries.map(([,s])=>s.referenceId)).size,12);
 for(const [id,a] of entries){
   const cmp=comparePrimaryRegionalV2Signatures(a,a);
   assert.equal(cmp.directDeltaAllowed,true,id);
   assert.equal(cmp.status,'COMPARABLE',id);
 }
});

test('A-04: every pair of *different* regions rejects direct numeric difference (132 directions)',()=>{
 let count=0;
 for(const [aid,a] of entries)for(const [bid,b] of entries){
  if(aid===bid)continue;
  const cmp=comparePrimaryRegionalV2Signatures(a,b);
  assert.equal(cmp.directDeltaAllowed,false,`${aid} to ${bid}`);
  assert.equal(cmp.status,'INCOMPATIBLE',`${aid} to ${bid}`);
  count++;
 }
 assert.equal(count,132);
});

test('A-04: model/version/reference/construct spoofing all blocks deltas (48 counterexamples)',()=>{
 let count=0;
 for(const [id,a] of entries){
  for(const mutation of [
    {modelVersion:'runload-primary-regional-reference100-v3.0'},
    {outputSemanticVersion:'runload-primary-regional-reference100-output-v3.0'},
    {referenceId:`${a.referenceId}-OTHER`},
    {constructId:`${a.constructId}-OTHER`},
  ]){
   const cmp=comparePrimaryRegionalV2Signatures(a,{...a,...mutation});
   assert.equal(cmp.directDeltaAllowed,false,`${id}: ${Object.keys(mutation)[0]}`);
   count++;
  }
 }
 assert.equal(count,48);
});

test('A-04: unquantified or unavailable region values are not substituted with a zero',()=>{
 const rows=result.result.regions;
 for(const row of rows){
  if(row.calculationState==='NOT_CALCULABLE' || row.calculationState==='PARTIAL'){
    assert.equal(row.value,null,row.regionId);
  }
 }
});
