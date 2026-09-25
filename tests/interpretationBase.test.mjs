import assert from 'node:assert/strict';
import { createApplicationServices, createMemoryStorage } from '../core/appCore.js';
import {
  INTERPRETATION_BASE_VERSION,
  INTERPRETATION_BASE_SCHEMA_VERSION,
  buildBaseInterpretation,
  buildConditionDifferenceSummary,
  buildRofJInterpretation,
  referenceDirection,
  previousDeltaDirection,
  signaturesComparable,
  stableRecordKey,
} from '../core/interpretationBase.js';

const results=[];
async function test(id,fn){try{await fn();results.push({id,status:'PASS'});}catch(error){results.push({id,status:'FAIL',message:error?.stack||String(error)});}}

function minimalFeedback(overrides={}){
  return {checkStatus:'deferred',bodyAreaObservations:[],safetyFlags:{},...overrides};
}
function runRecord(id,date,{createdAt=`${date}T08:00:00Z`,distanceKm=5,speedMps=2.5,course={},runningFormat='CONTINUOUS_RUN'}={}){
  return {
    id,date,createdAt,activityType:'run',distanceKm,
    durationMinutes:distanceKm*1000/(speedMps*60),
    runningFormat,stepsProvenance:'UNKNOWN',
    course:{gradeKnowledge:'UNKNOWN',modelSurfaceClass:'UNKNOWN',...course},
  };
}
function save(services,record,feedback=minimalFeedback()){
  const out=services.workflows.records.saveRecordAndFeedback(record,feedback);
  assert.equal(out.ok,true,JSON.stringify(out));
  return out.experience;
}
function setupRealPair(){
  const services=createApplicationServices({storage:createMemoryStorage()});
  save(services,runRecord('prior','2026-09-19',{speedMps:2.5}));
  save(services,runRecord('target','2026-09-20',{speedMps:3.5,distanceKm:6,course:{gradeKnowledge:'KNOWN_FLAT',name:'Flat'}}));
  return {services,target:services.workflows.records.loadExperience('target'),all:services.workflows.records.loadAllExperiences()};
}

function fakeSignature(regionId='BA-DISP-014',suffix='A'){
  return {regionId,modelVersion:'M1',outputSemanticVersion:'S1',constructId:`C-${suffix}`,referenceId:`R-${suffix}`};
}
function fakeRow(regionId='BA-DISP-014',value=100,{sourceIds=['SRC-1'],evidenceState='DIRECT'}={}){
  return {regionId,primaryRegionId:'R01',regionName:'股関節部',value,calculationState:'CALCULATED',evidenceState,evidenceStates:[evidenceState],construct:'股関節の機械的仕事に基づく部位内Reference-100',constructId:'C-A',referenceId:'R-A',sourceIds,coverageProportion:1,unsupportedDistanceKm:0,axisEstimates:[]};
}
function fakeExperience({id,date='2026-09-20',createdAt=`${date}T08:00:00Z`,value=100,signature=fakeSignature(),activityType='run',supportDecision={route:'normal',reasons:[],blocks:[],nextActions:[]},distanceKm=5,durationMinutes=30,course={gradeKnowledge:'UNKNOWN'},regionalSemanticState='REFERENCE100_V3'}={}){
  const regionId=signature.regionId;
  return {
    record:{id,date,createdAt,activityType,distanceKm,durationMinutes,runningFormat:'CONTINUOUS_RUN',course},
    regionalV2ResultRecord:{
      id:`result-${id}`,model_version:'M1',output_semantic_version:'S1',engine_build_version:'B1',authority_version:'A1',
      comparison_signatures:{[regionId]:signature},source_registry:{'SRC-1':{label:'Source One',role:'baseline'}},
      result:{regions:[fakeRow(regionId,value)]},
    },
    regionalSemanticState,
    regionalV2Recovery:null,
    supportDecision,
  };
}

await test('CORE-VERSION-AND-SCHEMA',()=>{
  assert.equal(INTERPRETATION_BASE_VERSION,'interpretation-base-v1.1');
  const out=buildBaseInterpretation();
  assert.equal(out.schemaVersion,INTERPRETATION_BASE_SCHEMA_VERSION);
  assert.equal(out.interpretation.summaryCodes[0],'NO_TARGET_RECORD');
  assert.equal(out.actions[0].destination,'record-input');
});

await test('REFERENCE-DIRECTION-BOUNDARIES',()=>{
  assert.equal(referenceDirection(101),'ABOVE_REFERENCE');
  assert.equal(referenceDirection(100),'REFERENCE_VICINITY');
  assert.equal(referenceDirection(99),'BELOW_REFERENCE');
  assert.equal(referenceDirection(null),'UNAVAILABLE');
});

await test('PREVIOUS-DIRECTION-BOUNDARIES',()=>{
  assert.equal(previousDeltaDirection(1),'UP');
  assert.equal(previousDeltaDirection(0.9),'LESS_THAN_ONE_POINT');
  assert.equal(previousDeltaDirection(-1),'DOWN');
  assert.equal(previousDeltaDirection(null),'NONE');
});

await test('SIGNATURE-COMPARISON-STRICT',()=>{
  const a=fakeSignature();
  assert.equal(signaturesComparable(a,{...a}),true);
  assert.equal(signaturesComparable(a,{...a,constructId:'OTHER'}),false);
});

await test('STABLE-KEY-USES-CREATEDAT-BEFORE-ID',()=>{
  const early={id:'z',date:'2026-09-20',createdAt:'2026-09-20T08:00:00Z'};
  const late={id:'a',date:'2026-09-20',createdAt:'2026-09-20T09:00:00Z'};
  assert.ok(stableRecordKey(early)<stableRecordKey(late));
});

await test('REAL-CURRENT-REGIONAL-OUTPUT-IS-CONSUMED-NOT-RECALCULATED',()=>{
  const {target,all}=setupRealPair();
  const before=JSON.stringify(target.regionalV2ResultRecord);
  const out=buildBaseInterpretation({targetExperience:target,allExperiences:all,origin:'result'});
  assert.equal(out.current.regions.length,12);
  assert.equal(out.targetRecordId,'target');
  assert.equal(out.generatedFrom.resultRecordId,target.regionalV2ResultRecord.id);
  assert.equal(JSON.stringify(target.regionalV2ResultRecord),before);
});

await test('REAL-PREVIOUS-COMPARISON-USES-STORED-SIGNATURE',()=>{
  const {target,all}=setupRealPair();
  const out=buildBaseInterpretation({targetExperience:target,allExperiences:all});
  const regionId=target.regionalV2ResultRecord.result.regions[0].regionId;
  const comparison=out.comparison.regionalById[regionId];
  assert.equal(comparison.comparablePreviousRecordId,'prior');
  assert.equal(comparison.historyComparableCount,1);
  assert.ok(Number.isFinite(comparison.delta));
});

await test('INCOMPATIBLE-HISTORY-IS-EXCLUDED',()=>{
  const target=fakeExperience({id:'target',value:110});
  const prior=fakeExperience({id:'prior',date:'2026-09-19',value:120,signature:fakeSignature('BA-DISP-014','B')});
  const out=buildBaseInterpretation({targetExperience:target,allExperiences:[prior,target]});
  assert.equal(out.comparison.regionalById['BA-DISP-014'].historyComparableCount,0);
  assert.equal(out.comparison.regionalById['BA-DISP-014'].previousValue,null);
});

await test('FUTURE-RECORD-IS-EXCLUDED-FROM-PAST',()=>{
  const target=fakeExperience({id:'target',date:'2026-09-20',value:110});
  const future=fakeExperience({id:'future',date:'2026-09-21',value:120});
  const out=buildBaseInterpretation({targetExperience:target,allExperiences:[target,future]});
  assert.equal(out.comparison.regionalById['BA-DISP-014'].historyComparableCount,0);
});

await test('LATEST-FIVE-HISTORY-IS-CAPPED',()=>{
  const target=fakeExperience({id:'target',date:'2026-09-20',value:110});
  const past=Array.from({length:7},(_,i)=>fakeExperience({id:`p${i+1}`,date:`2026-09-${String(10+i).padStart(2,'0')}`,value:100+i}));
  const out=buildBaseInterpretation({targetExperience:target,allExperiences:[...past,target]});
  const cmp=out.comparison.regionalById['BA-DISP-014'];
  assert.equal(cmp.historyComparableCount,7);
  assert.equal(cmp.historyLastFive.length,5);
  assert.deepEqual(cmp.historyLastFive.map(x=>x.recordId),['p3','p4','p5','p6','p7']);
});

await test('SELECTED-REGION-TAKES-COMPACT-SUMMARY-PRECEDENCE',()=>{
  const target=fakeExperience({id:'target',value:110});
  const out=buildBaseInterpretation({targetExperience:target,allExperiences:[target],selectedRegionId:'BA-DISP-014'});
  assert.deepEqual(out.interpretation.selectedRegionIds,['BA-DISP-014']);
});

await test('COMPACT-SELECTION-USES-FIXED-ORDER-NOT-MAGNITUDE',()=>{
  const sigA=fakeSignature('BA-DISP-014');
  const sigB={...fakeSignature('BA-DISP-015'),constructId:'C-A',referenceId:'R-A'};
  const target=fakeExperience({id:'target',value:102,signature:sigA});
  target.regionalV2ResultRecord.result.regions.push({...fakeRow('BA-DISP-015',180),primaryRegionId:'R02',regionName:'殿部'});
  target.regionalV2ResultRecord.comparison_signatures['BA-DISP-015']=sigB;
  const prior=fakeExperience({id:'prior',date:'2026-09-19',value:100,signature:sigA});
  prior.regionalV2ResultRecord.result.regions.push({...fakeRow('BA-DISP-015',100),primaryRegionId:'R02',regionName:'殿部'});
  prior.regionalV2ResultRecord.comparison_signatures['BA-DISP-015']=sigB;
  const out=buildBaseInterpretation({targetExperience:target,allExperiences:[prior,target]});
  assert.deepEqual(out.interpretation.selectedRegionIds,['BA-DISP-014','BA-DISP-015']);
});

await test('ROF-J-VALUES-AND-RECENT-REFERENCE-ARE-PASSED-THROUGH',()=>{
  const rof=buildRofJInterpretation({available:true,pre:4,post:6,delta:2,direction:'UP',directionLabel:'上昇',preEligibility:{eligible:true},postEligibility:{eligible:true}},{delta:{label:'直近5有効記録',n:5,median:1,currentMinusMedian:1}});
  assert.equal(rof.pre,4);assert.equal(rof.post,6);assert.equal(rof.delta,2);
  assert.equal(rof.recentReferences.delta.median,1);
});

await test('CONDITION-DIFFERENCE-IS-DESCRIPTIVE',()=>{
  const prior=fakeExperience({id:'prior',date:'2026-09-19',distanceKm:5,durationMinutes:30,course:{gradeKnowledge:'UNKNOWN',name:'A'}});
  const target=fakeExperience({id:'target',distanceKm:6,durationMinutes:31,course:{gradeKnowledge:'KNOWN_FLAT',name:'B'}});
  const summary=buildConditionDifferenceSummary(target,[prior,target]);
  assert.equal(summary.previousRecordId,'prior');
  assert.ok(summary.differences.some(x=>x.id==='distance'));
  assert.ok(summary.differences.some(x=>x.id==='course'));
  assert.ok(summary.differences.some(x=>x.id==='grade'));
});

await test('CURRENT-COURSE-SCHEMA-DETECTS-GRADE-AND-SURFACE-DIFFERENCES',()=>{
  const prior=fakeExperience({id:'prior',date:'2026-09-19',course:{
    gradeKnowledge:'KNOWN_PROFILE',upPercent:10,downPercent:0,upGradePercent:3,downGradePercent:0,
    pavedPercent:100,trailPercent:0,
  }});
  const target=fakeExperience({id:'target',course:{
    gradeKnowledge:'KNOWN_PROFILE',upPercent:30,downPercent:10,upGradePercent:5,downGradePercent:2,
    pavedPercent:60,trailPercent:40,
  }});
  const summary=buildConditionDifferenceSummary(target,[prior,target]);
  const grade=summary.differences.find(x=>x.id==='grade');
  const surface=summary.differences.find(x=>x.id==='surface');
  assert.ok(grade);
  assert.equal(grade.previous.uphillSharePercent,10);
  assert.equal(grade.current.uphillSharePercent,30);
  assert.equal(grade.current.downhillSharePercent,10);
  assert.ok(surface);
  assert.deepEqual(surface.previous,[{category:'pavedPercent',sharePercent:100}]);
  assert.deepEqual(surface.current,[
    {category:'pavedPercent',sharePercent:60},
    {category:'trailPercent',sharePercent:40},
  ]);
});

await test('COEXISTING-CONDITION-AND-REGIONAL-DIFFERENCE-REQUIRES-NONCAUSAL-BOUNDARY',()=>{
  const prior=fakeExperience({id:'prior',date:'2026-09-19',value:100,distanceKm:5});
  const target=fakeExperience({id:'target',value:110,distanceKm:7});
  const out=buildBaseInterpretation({targetExperience:target,allExperiences:[prior,target]});
  assert.ok(out.interpretation.summaryCodes.includes('CONDITION_DIFFERENCES_AVAILABLE'));
  assert.ok(out.interpretation.summaryCodes.includes('NON_CAUSAL_BOUNDARY_REQUIRED'));
});

await test('EVIDENCE-USES-PERSISTED-SOURCES-AND-NEVER-CLAIMS-COMPLETE-TRACE',()=>{
  const target=fakeExperience({id:'target',value:110});
  const out=buildBaseInterpretation({targetExperience:target,allExperiences:[target]});
  const evidence=out.evidence.regions['BA-DISP-014'];
  assert.equal(evidence.sources[0].label,'Source One');
  assert.equal(out.evidence.completeness.completePerContributionTrace,false);
  assert.equal(out.evidence.completeness.wordingCode,'DO_NOT_CLAIM_FULL_BIBLIOGRAPHY');
});

await test('URGENT-SAFETY-PRECEDENCE-DOES-NOT-COME-FROM-REGIONAL-VALUE',()=>{
  const urgent={route:'urgent',reasons:['safety_chest_pain_reported'],blocks:['normal_plan_suggestions'],nextActions:['check_official_help']};
  const target=fakeExperience({id:'target',value:250,supportDecision:urgent});
  const out=buildBaseInterpretation({targetExperience:target,allExperiences:[target]});
  assert.equal(out.safety.route,'urgent');
  assert.equal(out.actions[0].destination,'support-guidance');
  assert.equal(out.actions.find(x=>x.actionId==='simulation').enabled,false);
  assert.equal(out.actions.find(x=>x.actionId==='plan').enabled,false);
});

await test('HIGH-REGIONAL-VALUE-ALONE-DOES-NOT-ESCALATE-SAFETY',()=>{
  const target=fakeExperience({id:'target',value:999,supportDecision:{route:'normal',reasons:[],blocks:[],nextActions:[]}});
  const out=buildBaseInterpretation({targetExperience:target,allExperiences:[target],rofSummary:{available:true,pre:10,post:10,delta:0,direction:'SAME',directionLabel:'変化なし'}});
  assert.equal(out.safety.route,'normal');
  assert.equal(out.actions.find(x=>x.actionId==='simulation').enabled,true);
});

await test('LEGACY-SEMANTIC-IS-BOUNDARY-ONLY',()=>{
  const target=fakeExperience({id:'target',value:110,regionalSemanticState:'LEGACY_V2_RESTORED_NOT_REINTERPRETED'});
  const out=buildBaseInterpretation({targetExperience:target,allExperiences:[target]});
  assert.ok(out.interpretation.summaryCodes.includes('LEGACY_REGIONAL_BOUNDARY'));
  assert.ok(out.interpretation.limitationCodes.includes('LEGACY_NOT_REINTERPRETED_AS_CURRENT'));
});

await test('TRANSIENT-RECOVERY-IS-EXPOSED-AS-METADATA',()=>{
  const target=fakeExperience({id:'target',value:110});
  target.regionalV2Recovery={status:'RECOVERED',sourceResultId:'old-result',issueCodes:['BODY_MAP_INVALID']};
  const out=buildBaseInterpretation({targetExperience:target,allExperiences:[target]});
  assert.equal(out.context.regionalRecoveryStatus,'RECOVERED');
  assert.ok(out.interpretation.summaryCodes.includes('REGIONAL_TRANSIENT_RECOVERY'));
});

await test('CONSULT-SUPPORT-PRIORITIZES-SHARE-AND-BLOCKS-NORMAL-PLAN',()=>{
  const consult={route:'consult',reasons:['safety_severe_pain_reported'],blocks:['normal_plan_suggestions'],nextActions:['open_consultation_memo']};
  const target=fakeExperience({id:'target',value:110,supportDecision:consult});
  const out=buildBaseInterpretation({targetExperience:target,allExperiences:[target]});
  assert.equal(out.actions[0].actionId,'share');
  assert.equal(out.actions.find(x=>x.actionId==='simulation').enabled,false);
  assert.equal(out.actions.find(x=>x.actionId==='plan').enabled,false);
});

await test('REST-RECORD-DOES-NOT-FABRICATE-REGIONAL-NUMBERS',()=>{
  const services=createApplicationServices({storage:createMemoryStorage()});
  const rest={id:'rest',date:'2026-09-20',createdAt:'2026-09-20T08:00:00Z',activityType:'rest'};
  save(services,rest);
  const target=services.workflows.records.loadExperience('rest');
  const out=buildBaseInterpretation({targetExperience:target,allExperiences:[target]});
  assert.ok(out.interpretation.summaryCodes.includes('REST_RECORD'));
  assert.equal(out.current.regions.length,0);
  assert.equal(out.availability.regional,false);
  assert.equal(out.actions.some(x=>x.actionId==='simulation'),false);
});

await test('EXISTING-NEXT-CHECK-IS-READ-WITHOUT-NEW-STORAGE',()=>{
  const target=fakeExperience({id:'target',value:110});
  target.record.reflectionContext={nextCheckPoint:'坂の少ない条件で確認'};
  const out=buildBaseInterpretation({targetExperience:target,allExperiences:[target]});
  assert.equal(out.current.facts.nextCheckPoint,'坂の少ない条件で確認');
});

await test('BUILD-IS-READ-ONLY',()=>{
  const prior=fakeExperience({id:'prior',date:'2026-09-19',value:100});
  const target=fakeExperience({id:'target',value:110});
  const input=[prior,target];
  const before=JSON.stringify(input);
  buildBaseInterpretation({targetExperience:target,allExperiences:input,rofSummary:{available:true,pre:4,post:6,delta:2,direction:'UP',directionLabel:'上昇'}});
  assert.equal(JSON.stringify(input),before);
});

const failed=results.filter(x=>x.status==='FAIL');
console.log(JSON.stringify({suite:'Interpretation Base',total:results.length,passed:results.length-failed.length,failed:failed.length,status:failed.length?'FAIL':'PASS',results},null,2));
if(failed.length)process.exitCode=1;
