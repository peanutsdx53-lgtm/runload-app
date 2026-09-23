import assert from 'node:assert/strict';
import {
  INTERPRETATION_CORE_VERSION,
  INTERPRETATION_OUTPUT_SCHEMA_VERSION,
  buildRofValueMeaning,
  buildRunLoadInterpretation,
} from '../core/interpretationCore.js';

const results=[];
async function test(id,fn){try{await fn();results.push({id,status:'PASS'});}catch(error){results.push({id,status:'FAIL',message:error?.stack||String(error)});}}

const DISPLAY_BY_PRIMARY=Object.freeze({
  R01:'BA-DISP-014',R02:'BA-DISP-015',R03:'BA-DISP-016',R04:'BA-DISP-018',
  R05:'BA-DISP-019',R06:'BA-DISP-021',R07:'BA-DISP-023',R08:'BA-DISP-024',
  R09:'BA-DISP-025',R10:'BA-DISP-027',R11:'BA-DISP-028',R12:'BA-DISP-029',
});
const LABEL_BY_PRIMARY=Object.freeze({
  R01:'股関節部',R02:'殿部',R03:'大腿前面',R04:'大腿後面',R05:'膝蓋大腿関節部',R06:'脛骨部',
  R07:'下腿後面',R08:'足関節部',R09:'アキレス腱部',R10:'後足部',R11:'足底中部・内側縦足弓',R12:'前足部',
});

function signature(primary='R01'){
  const regionId=DISPLAY_BY_PRIMARY[primary];
  return {regionId,modelVersion:'runload-primary-regional-reference100-v3.0',outputSemanticVersion:'runload-primary-regional-reference100-output-v3.0',constructId:`C-${primary}`,referenceId:`REF-${primary}`};
}
function row(primary='R01',value=112,{calculationState='CALCULATED'}={}){
  const regionId=DISPLAY_BY_PRIMARY[primary];
  return {
    regionId,primaryRegionId:primary,regionName:LABEL_BY_PRIMARY[primary],value,calculationState,
    evidenceState:'DIRECT',evidenceStates:['DIRECT'],construct:`construct-${primary}`,constructId:`C-${primary}`,referenceId:`REF-${primary}`,
    sourceIds:['SRC'],coverageProportion:value==null?0:1,unsupportedDistanceKm:value==null?5:0,axisEstimates:[],projectCompositeFlag:['R11','R12'].includes(primary),
  };
}
function engineInput(overrides={}){
  return {
    runningFormat:'RUN',distanceKm:5,durationMinutes:30,runningDistanceKm:null,runningDurationMinutes:null,
    averageCadenceSpm:null,personalHabitualCadenceSpm:null,segments:null,uphillSharePercent:0,downhillSharePercent:0,
    uphillGradePercent:0,downhillGradePercent:0,surfaceComponents:[],runSetting:'OUTDOOR_ROUTE',footStrikeObservation:null,
    ...overrides,
  };
}
function fakeExperience({
  id='target',date='2026-09-20',createdAt=`${date}T08:00:00Z`,primary='R01',value=112,
  distanceKm=5,durationMinutes=30,runningFormat='CONTINUOUS_RUN',course={gradeKnowledge:'KNOWN_FLAT'},
  engine=engineInput(),semantic='REFERENCE100_V3',supportDecision={route:'normal',reasons:[],blocks:[],nextActions:[]},
  calculationState='CALCULATED',activityType='run',
}={}){
  if(activityType==='rest'){
    return {
      record:{id,date,createdAt,activityType:'rest'},
      regionalV2ResultRecord:{id:`result-${id}`,record_id:id,model_version:'runload-primary-regional-reference100-v3.0',output_semantic_version:'runload-primary-regional-reference100-output-v3.0',result:null,comparison_signatures:{},source_registry:{}},
      regionalSemanticState:semantic,supportDecision,
    };
  }
  const display=DISPLAY_BY_PRIMARY[primary];
  const rr=row(primary,value,{calculationState});
  return {
    record:{id,date,createdAt,activityType:'run',distanceKm,durationMinutes,runningFormat,course},
    regionalV2ResultRecord:{
      id:`result-${id}`,record_id:id,model_version:'runload-primary-regional-reference100-v3.0',output_semantic_version:'runload-primary-regional-reference100-output-v3.0',engine_build_version:'B',authority_version:'A',
      engine_input_snapshot:engine,
      result:{state:'OK',courseState:Array.isArray(engine.segments)&&engine.segments.length?'SEGMENTED_COLOCATED':'WHOLE_RUN_ONLY',exposure:{distanceKm:engine.runningFormat==='RUN_WALK'?engine.runningDistanceKm:engine.distanceKm,durationMinutes:engine.runningFormat==='RUN_WALK'?engine.runningDurationMinutes:engine.durationMinutes,speedMps:3},regions:[rr]},
      comparison_signatures:{[display]:signature(primary)},source_registry:{SRC:{label:'Source',role:'baseline'}},
    },
    regionalSemanticState:semantic,supportDecision,
  };
}
function build(opts={}){
  const target=opts.target||fakeExperience(opts);
  const all=opts.all||[target];
  return buildRunLoadInterpretation({targetExperience:target,allExperiences:all,selectedRegionId:opts.selectedRegionId||'',origin:opts.origin||'result',rofSummary:opts.rofSummary||null,rofRecentReferences:opts.rofRecentReferences||{},supportDecision:opts.supportDecision||target.supportDecision});
}

await test('OUTPUT-SCHEMA-AND-READONLY-PROVENANCE',()=>{
  const out=buildRunLoadInterpretation();
  assert.equal(INTERPRETATION_CORE_VERSION,'runload-interpretation-core-v4.0');
  assert.equal(out.schemaVersion,INTERPRETATION_OUTPUT_SCHEMA_VERSION);
  assert.equal(out.state.targetAvailable,false);
  assert.equal(out.provenance.primaryRecalculated,false);
  assert.equal(out.provenance.rofRecalculated,false);
});

await test('GENERAL-ENTRY-USES-REASON-GROUPS-WITHOUT-AUTO-SELECTING-REGION',()=>{
  const out=build();
  assert.equal(out.overview.selectionMode,'REASON_GROUPS');
  assert.equal(out.selectedRegion,null);
  assert.equal(out.next.selectionRequired,false);
  assert.equal(out.next.primaryAction.actionId,'plan');
  assert.ok(out.overview.attention.counts.available>=1);
  assert.ok(Array.isArray(out.overview.attention.groups));
});

await test('EXPLICIT-REGION-GETS-REFERENCE-CONTEXT',()=>{
  const out=build({selectedRegionId:'BA-DISP-014'});
  assert.equal(out.selectedRegion.value,112);
  assert.equal(out.selectedRegion.referenceComparison.reference,100);
  assert.equal(out.selectedRegion.referenceComparison.difference,12);
  assert.equal(out.selectedRegion.referenceComparison.direction,'ABOVE_REFERENCE');
});

await test('COMPATIBLE-PREVIOUS-RECORD-IS-EXPOSED-AS-CONTEXT',()=>{
  const prior=fakeExperience({id:'prior',date:'2026-09-19',value:106});
  const target=fakeExperience({id:'target',date:'2026-09-20',value:112});
  const out=build({target,all:[prior,target],selectedRegionId:'BA-DISP-014'});
  assert.equal(out.selectedRegion.previousComparison.available,true);
  assert.equal(out.selectedRegion.previousComparison.previousValue,106);
  assert.equal(out.selectedRegion.previousComparison.currentValue,112);
  assert.equal(out.selectedRegion.previousComparison.difference,6);
  assert.equal(out.selectedRegion.personalHistory.comparableCount,1);
});

await test('ROF-EXACT-DESCRIPTOR-IS-PRESERVED',()=>{
  const m=buildRofValueMeaning(6);
  assert.equal(m.descriptorType,'EXACT');
  assert.equal(m.descriptor,'中程度に疲れている');
});

await test('ROF-UNLABELED-VALUE-USES-ANCHORS-NOT-INVENTED-DESCRIPTOR',()=>{
  const m=buildRofValueMeaning(3);
  assert.equal(m.descriptorType,'BETWEEN_ANCHORS');
  assert.equal(m.descriptor,'');
  assert.equal(m.lowerAnchor.value,2);
  assert.equal(m.upperAnchor.value,4);
});

await test('ROF-LOW-END-VALUE-USES-POSITION-ONLY',()=>{
  const m=buildRofValueMeaning(0);
  assert.equal(m.descriptorType,'POSITION_ONLY');
  assert.equal(m.descriptor,'');
  assert.equal(m.lowerAnchor,null);
  assert.equal(m.upperAnchor.value,2);
});

await test('ROF-PAIR-IS-SEPARATE-SUBJECTIVE-CONTEXT',()=>{
  const out=build({rofSummary:{available:true,pre:4,post:6,delta:2,direction:'UP',directionLabel:'上昇'}});
  assert.equal(out.state.subjective,'PAIR');
  assert.equal(out.subjectiveContext.pre.descriptor,'少し疲れている');
  assert.equal(out.subjectiveContext.post.descriptor,'中程度に疲れている');
  assert.ok(out.subjectiveContext.boundaryTokens.includes('ROF_SEPARATE_FROM_REFERENCE100'));
});

await test('SPEED-ONLY-REGION-HAS-EXACT-SPEED-PATH',()=>{
  const target=fakeExperience({primary:'R01',engine:engineInput()});
  const out=build({target,selectedRegionId:'BA-DISP-014'});
  const path=out.selectedRegion.calculationPath;
  assert.equal(path.resolutionStatus,'EXACT');
  assert.equal(path.activeRoute,'SPEED');
  assert.deepEqual(path.activeInputs.map(x=>x.id),['DISTANCE','DURATION','SPEED']);
});

await test('SPEED-ONLY-REGION-SEPARATES-RECORDED-NONACTIVE-CONTEXT',()=>{
  const target=fakeExperience({primary:'R01',engine:engineInput({averageCadenceSpm:172,uphillSharePercent:20,uphillGradePercent:5,surfaceComponents:[{category:'ASPHALT',sharePercent:100}],footStrikeObservation:{value:'RFS',provenance:'SELF_REPORTED'}})});
  const out=build({target,selectedRegionId:'BA-DISP-014'});
  const path=out.selectedRegion.calculationPath;
  assert.equal(path.resolutionStatus,'EXACT');
  const ids=path.contextOnlyInputs.map(x=>x.id);
  for(const id of ['CADENCE','GRADE','SURFACE','FOOT_STRIKE']) assert.ok(ids.includes(id));
  assert.equal(path.conditionalInputs.length,0);
});

await test('R05-WITHOUT-CONDITIONAL-INPUTS-IS-EXACT-SPEED',()=>{
  const target=fakeExperience({primary:'R05',engine:engineInput()});
  const out=build({target,selectedRegionId:'BA-DISP-019'});
  assert.equal(out.selectedRegion.calculationPath.resolutionStatus,'EXACT');
  assert.equal(out.selectedRegion.calculationPath.activeRoute,'SPEED');
});

await test('R05-CADENCE-RECORDED-IS-CONSERVATIVELY-PARTIAL',()=>{
  const target=fakeExperience({primary:'R05',engine:engineInput({averageCadenceSpm:172,personalHabitualCadenceSpm:168})});
  const out=build({target,selectedRegionId:'BA-DISP-019'});
  const path=out.selectedRegion.calculationPath;
  assert.equal(path.resolutionStatus,'PARTIAL');
  assert.ok(path.conditionalInputs.some(x=>x.id==='CADENCE'));
  assert.ok(path.explanationTokens.includes('DO_NOT_CLAIM_CONDITIONAL_INPUT_WAS_APPLIED'));
});

await test('R06-GRADE-RECORDED-IS-CONSERVATIVELY-PARTIAL',()=>{
  const target=fakeExperience({primary:'R06',engine:engineInput({uphillSharePercent:20,uphillGradePercent:5})});
  const out=build({target,selectedRegionId:'BA-DISP-021'});
  assert.equal(out.selectedRegion.calculationPath.resolutionStatus,'PARTIAL');
  assert.ok(out.selectedRegion.calculationPath.conditionalInputs.some(x=>x.id==='GRADE'));
});

await test('R09-CADENCE-RECORDED-IS-CONSERVATIVELY-PARTIAL',()=>{
  const target=fakeExperience({primary:'R09',engine:engineInput({averageCadenceSpm:172,personalHabitualCadenceSpm:168})});
  const out=build({target,selectedRegionId:'BA-DISP-025'});
  assert.equal(out.selectedRegion.calculationPath.resolutionStatus,'PARTIAL');
});

await test('R10-GRADE-RECORDED-IS-CONSERVATIVELY-PARTIAL',()=>{
  const target=fakeExperience({primary:'R10',engine:engineInput({uphillSharePercent:30,uphillGradePercent:5})});
  const out=build({target,selectedRegionId:'BA-DISP-027'});
  assert.equal(out.selectedRegion.calculationPath.resolutionStatus,'PARTIAL');
});

await test('SEGMENTED-ROUTE-DOES-NOT-CLAIM-PER-SEGMENT-DETAIL',()=>{
  const target=fakeExperience({primary:'R01',engine:engineInput({segments:[{distanceKm:2.5,speedMps:2.8,gradePercent:0},{distanceKm:2.5,speedMps:3.2,gradePercent:4}]})});
  const out=build({target,selectedRegionId:'BA-DISP-014'});
  const path=out.selectedRegion.calculationPath;
  assert.equal(path.resolutionStatus,'PARTIAL');
  assert.equal(path.activeRoute,'SECTION_COMPOSED');
  assert.ok(path.explanationTokens.includes('DO_NOT_CLAIM_EXACT_PER_SEGMENT_ROUTE'));
});

await test('RUN-WALK-USES-RUNNING-PHASE-FACTS',()=>{
  const target=fakeExperience({primary:'R01',runningFormat:'RUN_WALK',engine:engineInput({runningFormat:'RUN_WALK',distanceKm:5,durationMinutes:40,runningDistanceKm:3.8,runningDurationMinutes:24})});
  const out=build({target,selectedRegionId:'BA-DISP-014'});
  const path=out.selectedRegion.calculationPath;
  assert.equal(path.resolutionStatus,'EXACT');
  assert.equal(path.exposure.type,'RUNNING_PHASE');
  assert.equal(path.exposure.distanceKm,3.8);
  assert.equal(path.exposure.durationMinutes,24);
  assert.deepEqual(path.activeInputs.slice(0,2).map(x=>x.id),['RUNNING_DISTANCE','RUNNING_DURATION']);
});

await test('REST-RECORD-DOES-NOT-CREATE-REGIONAL-INTERPRETATION',()=>{
  const target=fakeExperience({activityType:'rest'});
  const out=build({target});
  assert.equal(out.state.regional,'REST');
  assert.equal(out.overview.regions.length,0);
  assert.equal(out.selectedRegion,null);
});

await test('LEGACY-RESULT-IS-NOT-REINTERPRETED-AS-CURRENT-CALCULATION-PATH',()=>{
  const target=fakeExperience({semantic:'LEGACY_V2_RESTORED_NOT_REINTERPRETED'});
  const out=build({target,selectedRegionId:'BA-DISP-014'});
  assert.equal(out.state.legacy,true);
  assert.equal(out.selectedRegion.calculationPath.resolutionStatus,'UNAVAILABLE');
  assert.ok(out.selectedRegion.calculationPath.explanationTokens.includes('LEGACY_RESULT_NOT_REINTERPRETED'));
});

await test('SUPPORT-ROUTE-TAKES-NEXT-ACTION-PRECEDENCE',()=>{
  const supportDecision={route:'urgent',reasons:['safety_chest_pain_reported'],blocks:['normal_plan_suggestions'],nextActions:['check_official_help']};
  const target=fakeExperience({supportDecision});
  const out=build({target,selectedRegionId:'BA-DISP-014',supportDecision});
  assert.equal(out.state.support,'URGENT');
  assert.equal(out.next.primaryAction.actionId,'official-help');
});

await test('SELECTED-REGION-WITH-CONDITION-DIFFERENCE-PREFERS-CONDITION-CHECK-ACTION',()=>{
  const prior=fakeExperience({id:'prior',date:'2026-09-19',distanceKm:5,durationMinutes:30,course:{gradeKnowledge:'KNOWN_FLAT',name:'A'}});
  const target=fakeExperience({id:'target',date:'2026-09-20',distanceKm:6,durationMinutes:31,course:{gradeKnowledge:'KNOWN_FLAT',name:'B'}});
  const out=build({target,all:[prior,target],selectedRegionId:'BA-DISP-014'});
  assert.equal(out.next.primaryAction.actionId,'simulation');
});

await test('SELECTED-REGION-WITH-HISTORY-AND-NO-CONDITION-DIFFERENCE-PREFERS-NEXT-RECORD',()=>{
  const prior=fakeExperience({id:'prior',date:'2026-09-19',value:106});
  const target=fakeExperience({id:'target',date:'2026-09-20',value:112});
  const out=build({target,all:[prior,target],selectedRegionId:'BA-DISP-014'});
  assert.equal(out.next.primaryAction.actionId,'plan');
  assert.equal(out.next.selectionRequired,false);
});

await test('SELECTED-REGION-WITHOUT-HISTORY-PREFERS-PLAN',()=>{
  const out=build({selectedRegionId:'BA-DISP-014'});
  assert.equal(out.next.primaryAction.actionId,'plan');
});

await test('CONDITION-PROJECTION-EXPLAINS-SELECTED-REGION-RELATIONSHIP',()=>{
  const prior=fakeExperience({id:'prior',date:'2026-09-19',distanceKm:5,durationMinutes:30});
  const target=fakeExperience({id:'target',date:'2026-09-20',distanceKm:6,durationMinutes:31});
  const out=build({target,all:[prior,target],selectedRegionId:'BA-DISP-014'});
  const distance=out.conditions.differences.find(x=>x.id==='distance');
  const duration=out.conditions.differences.find(x=>x.id==='duration');
  assert.equal(distance.relationship,'USED_IN_CURRENT_ROUTE');
  assert.equal(duration.relationship,'USED_IN_CURRENT_ROUTE');
  assert.ok(out.conditions.boundaryCodes.includes('NO_CAUSAL_INFERENCE'));
});

await test('RUN-WALK-WHOLE-RUN-DISTANCE-IS-NOT-MISLABELED-AS-DIRECT-REGION-INPUT',()=>{
  const prior=fakeExperience({id:'prior',date:'2026-09-19',distanceKm:5,durationMinutes:30});
  const target=fakeExperience({
    id:'target',date:'2026-09-20',distanceKm:6,durationMinutes:36,runningFormat:'RUN_WALK',
    engine:engineInput({runningFormat:'RUN_WALK',distanceKm:6,durationMinutes:36,runningDistanceKm:4,runningDurationMinutes:24}),
  });
  const out=build({target,all:[prior,target],selectedRegionId:'BA-DISP-014'});
  const distance=out.conditions.differences.find(x=>x.id==='distance');
  const format=out.conditions.differences.find(x=>x.id==='running-format');
  assert.equal(out.selectedRegion.calculationPath.exposure.type,'RUNNING_PHASE');
  assert.equal(distance.relationship,'RECORDED_CONTEXT');
  assert.equal(format.relationship,'DEFINES_EXPOSURE');
});

await test('NEXT-CHECK-PRESERVES-USER-RECORDED-NEXT-POINT',()=>{
  const target=fakeExperience();
  target.record.reflectionContext={nextCheckPoint:'同じコースで確認する'};
  const out=build({target,selectedRegionId:'BA-DISP-014'});
  assert.equal(out.nextCheck.userRecorded,'同じコースで確認する');
});

await test('NEXT-CHECK-IS-STRUCTURED-AND-NON-DIAGNOSTIC',()=>{
  const out=build({selectedRegionId:'BA-DISP-014'});
  assert.equal(out.nextCheck.code,'ADD_COMPARABLE_RECORD');
  assert.equal(out.nextCheck.regionId,'BA-DISP-014');
  assert.equal(typeof out.nextCheck.code,'string');
});

await test('V3-BUILD-DOES-NOT-MUTATE-INPUT',()=>{
  const target=fakeExperience({primary:'R01'});
  const before=JSON.stringify(target);
  build({target,selectedRegionId:'BA-DISP-014'});
  assert.equal(JSON.stringify(target),before);
});

const failed=results.filter(x=>x.status==='FAIL');
console.log(JSON.stringify({suite:'Interpretation Output Contract',total:results.length,passed:results.length-failed.length,failed:failed.length,status:failed.length?'FAIL':'PASS',results},null,2));
if(failed.length)process.exitCode=1;
