from pathlib import Path


def replace_once(path, old, new):
    p = Path(path)
    text = p.read_text()
    if old not in text:
        raise SystemExit(f"expected text not found: {path}: {old[:160]!r}")
    p.write_text(text.replace(old, new, 1))


path = "tests/interpretationOutputContract.test.mjs"

replace_once(
    path,
    """function fakeExperience({
  id='target',date='2026-09-20',createdAt=`${date}T08:00:00Z`,primary='R01',value=112,
  distanceKm=5,durationMinutes=30,runningFormat='CONTINUOUS_RUN',course={gradeKnowledge:'KNOWN_FLAT'},
  engine=engineInput(),semantic='REFERENCE100_V3',supportDecision={route:'normal',reasons:[],blocks:[],nextActions:[]},
  calculationState='CALCULATED',activityType='run',
}={}){""",
    """function persistedTrace(engine=engineInput(), {appliedConditions=[],notAppliedConditions=[]}={}){
  const segments=Array.isArray(engine.segments)&&engine.segments.length
    ? engine.segments
    : [{
        distanceKm:engine.runningFormat==='RUN_WALK'?engine.runningDistanceKm:engine.distanceKm,
        speedMps:3,
      }];
  return segments.map((segment,index)=>({
    segmentIndex:index,
    distanceKm:Number(segment?.distanceKm||0),
    speedMps:Number.isFinite(Number(segment?.speedMps))?Number(segment.speedMps):3,
    speedProvenance:'TEST_PERSISTED_TRACE',remainderState:null,calculationState:'CALCULATED',evidenceState:'DIRECT',
    baseline:{axis:'SPEED',sourceId:'SRC'},
    appliedConditions:appliedConditions.map((item)=>({...item})),
    notAppliedConditions:notAppliedConditions.map((item)=>({...item})),
    interactionState:null,
  }));
}
function fakeExperience({
  id='target',date='2026-09-20',createdAt=`${date}T08:00:00Z`,primary='R01',value=112,
  distanceKm=5,durationMinutes=30,runningFormat='CONTINUOUS_RUN',course={gradeKnowledge:'KNOWN_FLAT'},
  engine=engineInput(),semantic='REFERENCE100_V3',supportDecision={route:'normal',reasons:[],blocks:[],nextActions:[]},
  calculationState='CALCULATED',activityType='run',routeTrace=null,
}={}){""",
)

replace_once(
    path,
    """  const display=DISPLAY_BY_PRIMARY[primary];
  const rr=row(primary,value,{calculationState});
  return {""",
    """  const display=DISPLAY_BY_PRIMARY[primary];
  const rr=row(primary,value,{calculationState});
  rr.routeTrace=routeTrace===null?persistedTrace(engine):routeTrace;
  return {""",
)

replace_once(
    path,
    """      id:`result-${id}`,record_id:id,model_version:'runload-primary-regional-reference100-v3.0',output_semantic_version:'runload-primary-regional-reference100-output-v3.0',engine_build_version:'B',authority_version:'A',
      engine_input_snapshot:engine,""",
    """      id:`result-${id}`,record_id:id,model_version:'runload-primary-regional-reference100-v3.0',output_semantic_version:'runload-primary-regional-reference100-output-v3.0',engine_build_version:'B',authority_version:'A',route_trace_version:'primary-regional-route-trace-v1',
      engine_input_snapshot:engine,""",
)

replace_once(
    path,
    """  assert.equal(path.activeRoute,'SPEED');
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
});""",
    """  assert.equal(path.activeRoute,'PERSISTED_ROUTE_TRACE');
  assert.equal(path.resolutionBasis,'PERSISTED_CALCULATION_TRACE');
  assert.deepEqual(path.activeInputs.map(x=>x.id),['DISTANCE','DURATION','SPEED']);
});

await test('MISSING-PERSISTED-ROUTE-TRACE-IS-NOT-RECONSTRUCTED',()=>{
  const target=fakeExperience({primary:'R01',engine:engineInput({averageCadenceSpm:172}),routeTrace:[]});
  const out=build({target,selectedRegionId:'BA-DISP-014'});
  const path=out.selectedRegion.calculationPath;
  assert.equal(path.resolutionStatus,'UNAVAILABLE');
  assert.equal(path.activeRoute,'UNKNOWN');
  assert.ok(path.explanationTokens.includes('PERSISTED_ROUTE_TRACE_REQUIRED'));
  assert.equal(path.activeInputs.length,0);
});

await test('SPEED-ONLY-REGION-SEPARATES-RECORDED-NONACTIVE-CONTEXT',()=>{
  const engine=engineInput({averageCadenceSpm:172,uphillSharePercent:20,uphillGradePercent:5,surfaceComponents:[{category:'ASPHALT',sharePercent:100}],footStrikeObservation:{value:'RFS',provenance:'SELF_REPORTED'}});
  const routeTrace=persistedTrace(engine,{notAppliedConditions:[
    {axis:'CADENCE',state:'EVIDENCE_INSUFFICIENT',reason:'R01_CADENCE_NUMERIC_ROUTE_INACTIVE'},
    {axis:'GRADE',state:'EVIDENCE_INSUFFICIENT',reason:'GRADE_NUMERIC_ROUTE_INACTIVE'},
    {axis:'SURFACE',state:'CONTEXT_ONLY',reason:'NO_ACTIVE_PRIMARY_NUMERIC_SURFACE_ROUTE'},
    {axis:'FOOT_STRIKE',state:'CONTEXT_ONLY',reason:'HORIGUCHI_PUBLIC_NUMERIC_ROUTE_INACTIVE'},
  ]});
  const target=fakeExperience({primary:'R01',engine,routeTrace});
  const out=build({target,selectedRegionId:'BA-DISP-014'});
  const path=out.selectedRegion.calculationPath;
  assert.equal(path.resolutionStatus,'EXACT');
  const contextIds=path.contextOnlyInputs.map(x=>x.id);
  for(const id of ['SURFACE','FOOT_STRIKE']) assert.ok(contextIds.includes(id));
  const unsupportedIds=path.unsupportedInputs.map(x=>x.id);
  for(const id of ['CADENCE','GRADE']) assert.ok(unsupportedIds.includes(id));
  assert.equal(path.conditionalInputs.length,0);
});""",
)

replace_once(
    path,
    """  assert.equal(out.selectedRegion.calculationPath.resolutionStatus,'EXACT');
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
});""",
    """  assert.equal(out.selectedRegion.calculationPath.resolutionStatus,'EXACT');
  assert.equal(out.selectedRegion.calculationPath.activeRoute,'PERSISTED_ROUTE_TRACE');
});

await test('R05-CADENCE-USES-PERSISTED-APPLIED-TRACE',()=>{
  const engine=engineInput({averageCadenceSpm:172,personalHabitualCadenceSpm:168});
  const target=fakeExperience({primary:'R05',engine,routeTrace:persistedTrace(engine,{appliedConditions:[{axis:'CADENCE',evidenceState:'DIRECT'}]})});
  const out=build({target,selectedRegionId:'BA-DISP-019'});
  const path=out.selectedRegion.calculationPath;
  assert.equal(path.resolutionStatus,'EXACT');
  assert.ok(path.activeInputs.some(x=>x.id==='CADENCE'&&x.role==='USED_IN_CURRENT_ROUTE'));
  assert.equal(path.conditionalInputs.length,0);
});

await test('R06-GRADE-USES-PERSISTED-APPLIED-TRACE',()=>{
  const engine=engineInput({uphillSharePercent:20,uphillGradePercent:5});
  const target=fakeExperience({primary:'R06',engine,routeTrace:persistedTrace(engine,{appliedConditions:[{axis:'GRADE',evidenceState:'DIRECT'}]})});
  const out=build({target,selectedRegionId:'BA-DISP-021'});
  const path=out.selectedRegion.calculationPath;
  assert.equal(path.resolutionStatus,'EXACT');
  assert.ok(path.activeInputs.some(x=>x.id==='GRADE'&&x.role==='USED_IN_CURRENT_ROUTE'));
});

await test('R09-CADENCE-USES-PERSISTED-APPLIED-TRACE',()=>{
  const engine=engineInput({averageCadenceSpm:172,personalHabitualCadenceSpm:168});
  const target=fakeExperience({primary:'R09',engine,routeTrace:persistedTrace(engine,{appliedConditions:[{axis:'CADENCE',evidenceState:'DIRECT'}]})});
  const out=build({target,selectedRegionId:'BA-DISP-025'});
  assert.equal(out.selectedRegion.calculationPath.resolutionStatus,'EXACT');
  assert.ok(out.selectedRegion.calculationPath.activeInputs.some(x=>x.id==='CADENCE'));
});

await test('R10-GRADE-USES-PERSISTED-APPLIED-TRACE',()=>{
  const engine=engineInput({uphillSharePercent:30,uphillGradePercent:5});
  const target=fakeExperience({primary:'R10',engine,routeTrace:persistedTrace(engine,{appliedConditions:[{axis:'GRADE',evidenceState:'DIRECT'}]})});
  const out=build({target,selectedRegionId:'BA-DISP-027'});
  assert.equal(out.selectedRegion.calculationPath.resolutionStatus,'EXACT');
  assert.ok(out.selectedRegion.calculationPath.activeInputs.some(x=>x.id==='GRADE'));
});

await test('SEGMENTED-ROUTE-USES-PERSISTED-PER-SEGMENT-TRACE',()=>{
  const engine=engineInput({segments:[{distanceKm:2.5,speedMps:2.8,gradePercent:0},{distanceKm:2.5,speedMps:3.2,gradePercent:4}]});
  const target=fakeExperience({primary:'R01',engine});
  const out=build({target,selectedRegionId:'BA-DISP-014'});
  const path=out.selectedRegion.calculationPath;
  assert.equal(path.resolutionStatus,'EXACT');
  assert.equal(path.activeRoute,'PERSISTED_ROUTE_TRACE');
  assert.equal(path.routeTrace.length,2);
  assert.deepEqual(path.routeTrace.map(x=>x.segmentIndex),[0,1]);
});""",
)

print("Stage 4A interpretation output contract updated for persisted route trace")
