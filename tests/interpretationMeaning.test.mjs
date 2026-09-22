import assert from 'node:assert/strict';
import { buildMeaningFrame } from '../core/interpretationBase.js';

const results=[];
async function test(id,fn){try{await fn();results.push({id,status:'PASS'});}catch(error){results.push({id,status:'FAIL',message:error?.stack||String(error)});}}

function region(regionId, value, referenceDirection, formalOrder=0, label=regionId){
  return {regionId,value,referenceDirection,formalOrder,label};
}
function comparison({prev=false,delta=null,direction='NONE',history=0,above=0,near=0,below=0}={}){
  return {
    comparablePreviousRecordId:prev?'p1':'',
    comparablePreviousDate:prev?'2026-09-19':'',
    previousValue:prev && Number.isFinite(delta)?100:null,
    delta,
    previousDirection:direction,
    historyComparableCount:history,
    historyReferenceDirectionCounts:{above,near,below},
  };
}
function args(overrides={}){
  const currentRegions=overrides.currentRegions ?? [region('R1',104,'ABOVE_REFERENCE',0,'部位A')];
  const regionalById=overrides.regionalById ?? {R1:comparison()};
  return {
    targetExperience:overrides.targetExperience ?? {record:{id:'r1',activityType:'run'},regionalSemanticState:'REFERENCE100_V3'},
    currentRegions,
    regionalById,
    conditionSummary:overrides.conditionSummary ?? {differences:[],previousRecordId:'',previousDate:''},
    rof:overrides.rof ?? {pre:null,post:null,delta:null,direction:''},
    safety:overrides.safety ?? {route:'normal'},
    availability:overrides.availability ?? {regional:true,persistedEvidence:true},
    selectedRegionId:overrides.selectedRegionId ?? '',
  };
}

await test('NO-TARGET-HAS-NO-EXPLANATION-MODES',()=>{
  const out=buildMeaningFrame();
  assert.equal(out.primaryCode,'NO_TARGET_RECORD');
  assert.deepEqual(out.availableModes,[]);
});

await test('SUPPORT-PRIORITY-OVERRIDES-ORDINARY-MEANING',()=>{
  const out=buildMeaningFrame(args({
    regionalById:{R1:comparison({prev:true,delta:8,direction:'UP',history:3,above:3})},
    conditionSummary:{differences:[{labelToken:'GRADE'}]},
    rof:{pre:3,post:7,delta:4,direction:'UP'},
    safety:{route:'urgent'},
  }));
  assert.equal(out.primaryCode,'SUPPORT_PRIORITY');
});

await test('LEGACY-OUTPUT-IS-LIMITED-NOT-REINTERPRETED',()=>{
  const out=buildMeaningFrame(args({targetExperience:{record:{id:'r1',activityType:'run'},regionalSemanticState:'LEGACY_V2_RESTORED_NOT_REINTERPRETED'}}));
  assert.equal(out.primaryCode,'LIMITED_RESULT');
});

await test('REPEATED-OBSERVATION-HAS-HIGHEST-ORDINARY-PRIORITY',()=>{
  const out=buildMeaningFrame(args({
    regionalById:{R1:comparison({prev:true,delta:4,direction:'UP',history:4,above:3,near:1})},
    conditionSummary:{differences:[{labelToken:'GRADE'}],previousRecordId:'p1',previousDate:'2026-09-19'},
    rof:{pre:3,post:6,delta:3,direction:'UP'},
  }));
  assert.equal(out.primaryCode,'REPEATED_OBSERVATION');
  const repeated=out.factsUsed.find(x=>x.type==='REGION_REPEATED_DIRECTION');
  assert.equal(repeated.pastMatchingCount,3);
  assert.equal(repeated.pastComparableCount,4);
});

await test('CONDITION-AND-RESULT-CHANGE-PRECEDES-MULTI-LAYER',()=>{
  const out=buildMeaningFrame(args({
    regionalById:{R1:comparison({prev:true,delta:4,direction:'UP',history:1,above:0})},
    conditionSummary:{differences:[{labelToken:'DISTANCE'},{labelToken:'GRADE'}],previousRecordId:'p1',previousDate:'2026-09-19'},
    rof:{pre:3,post:6,delta:3,direction:'UP'},
  }));
  assert.equal(out.primaryCode,'CONDITION_AND_RESULT_CHANGED');
  assert.ok(out.secondaryCodes.includes('MULTI_LAYER_CHANGE'));
  assert.ok(out.boundaryCodes.includes('NO_CAUSAL_INFERENCE'));
});

await test('MULTI-LAYER-PRECEDES-SIMPLE-PREVIOUS-SHIFT',()=>{
  const out=buildMeaningFrame(args({
    regionalById:{R1:comparison({prev:true,delta:-3,direction:'DOWN',history:1})},
    rof:{pre:6,post:3,delta:-3,direction:'DOWN'},
  }));
  assert.equal(out.primaryCode,'MULTI_LAYER_CHANGE');
  assert.ok(out.secondaryCodes.includes('CURRENT_SHIFT_WITH_HISTORY'));
  assert.ok(out.boundaryCodes.includes('ROF_SEPARATE_SUBJECTIVE_LAYER'));
});

await test('PREVIOUS-SHIFT-IS-MEANING-WHEN-NO-INTEGRATED-CHANGE',()=>{
  const out=buildMeaningFrame(args({regionalById:{R1:comparison({prev:true,delta:2,direction:'UP',history:1})}}));
  assert.equal(out.primaryCode,'CURRENT_SHIFT_WITH_HISTORY');
});

await test('CURRENT-REFERENCE-PATTERN-WORKS-WITHOUT-COMPATIBLE-HISTORY',()=>{
  const out=buildMeaningFrame(args());
  assert.equal(out.primaryCode,'CURRENT_REFERENCE_PATTERN');
  assert.deepEqual(out.focusRegionIds,['R1']);
});

await test('REFERENCE-VICINITY-ONLY-BECOMES-COMPARISON-BASELINE',()=>{
  const out=buildMeaningFrame(args({currentRegions:[region('R1',100,'REFERENCE_VICINITY',0,'部位A')]}));
  assert.equal(out.primaryCode,'COMPARISON_BASELINE');
});

await test('FOCUS-USES-FIXED-ORDER-NOT-MAGNITUDE',()=>{
  const out=buildMeaningFrame(args({
    currentRegions:[region('R1',102,'ABOVE_REFERENCE',0,'部位A'),region('R2',180,'ABOVE_REFERENCE',1,'部位B')],
    regionalById:{R1:comparison({prev:true,delta:2,direction:'UP',history:1}),R2:comparison({prev:true,delta:80,direction:'UP',history:1})},
  }));
  assert.deepEqual(out.focusRegionIds,['R1']);
});

await test('EXPLICIT-REGION-SELECTION-OVERRIDES-AUTOMATIC-FOCUS',()=>{
  const out=buildMeaningFrame(args({
    currentRegions:[region('R1',104,'ABOVE_REFERENCE',0,'部位A'),region('R2',96,'BELOW_REFERENCE',1,'部位B')],
    regionalById:{R1:comparison(),R2:comparison()},
    selectedRegionId:'R2',
  }));
  assert.deepEqual(out.focusRegionIds,['R2']);
});

await test('AVAILABLE-MODES-REFLECT-ACTUAL-DATA',()=>{
  const out=buildMeaningFrame(args({
    regionalById:{R1:comparison({prev:true,delta:2,direction:'UP',history:1})},
    conditionSummary:{differences:[{labelToken:'PACE'}],previousRecordId:'p1',previousDate:'2026-09-19'},
  }));
  assert.deepEqual(out.availableModes,['simple','visual','difference','evidence']);
});

await test('MEANING-FACTS-ARE-STRUCTURED-NOT-PROSE-CONCLUSIONS',()=>{
  const out=buildMeaningFrame(args({
    regionalById:{R1:comparison({prev:true,delta:2,direction:'UP',history:1})},
    rof:{pre:4,post:6,delta:2,direction:'UP'},
    conditionSummary:{differences:[{labelToken:'PACE'}],previousRecordId:'p1',previousDate:'2026-09-19'},
  }));
  assert.ok(out.factsUsed.some(x=>x.type==='REGION_CURRENT_REFERENCE'));
  assert.ok(out.factsUsed.some(x=>x.type==='REGION_PREVIOUS_DIFFERENCE'));
  assert.ok(out.factsUsed.some(x=>x.type==='ROF_PRE_POST'));
  assert.ok(out.factsUsed.some(x=>x.type==='CONDITION_DIFFERENCES'));
  assert.equal(Object.values(out).some(v=>typeof v==='string' && /危険|原因は|休むべき/.test(v)),false);
});

const failed=results.filter(x=>x.status==='FAIL');
console.log(JSON.stringify({suite:'Interpretation Meaning',total:results.length,passed:results.length-failed.length,failed:failed.length,status:failed.length?'FAIL':'PASS',results},null,2));
if(failed.length)process.exitCode=1;
