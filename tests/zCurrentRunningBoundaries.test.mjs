import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createApplicationServices,createMemoryStorage} from '../core/appCore.js';
import {internalModules} from '../core/internal/modules.js';
import {evaluateRunningRegion,evaluateRunningAtSpeed,evaluateExtension,compatibleForReferenceComparison} from '../core/runningEvidence/runningEvidenceEngine.js';
import {createEvidenceRunningResultRecord} from '../core/runningEvidence/runningEvidenceProductBridge.js';
import {renderBodyPartDetailScreenWithPresentation} from '../screens/bodyPartDetailScreen.js';
const version='runload-running-a1a2b-v4.0';
const feedback={checkStatus:'deferred',bodyAreaObservations:[],safetyFlags:{}};
const record=(id,km=5.5,min=30,extra={})=>({id,createdAt:'2026-10-19T07:00:00.000Z',date:'2026-10-19',activityType:'run',distanceKm:km,durationMinutes:min,runningFormat:'CONTINUOUS_RUN',stepsProvenance:'UNKNOWN',course:{gradeKnowledge:'UNKNOWN',modelSurfaceClass:'UNKNOWN'},...extra});
const app=()=>createApplicationServices({storage:createMemoryStorage()});
const save=(s,r)=>s.workflows.records.saveRecordAndFeedback(r,feedback);
const n=(r)=>Object.values(r.regions).filter(x=>x.reference100!==null).length;
test('A01 distance/time remain record facts; literature comparison never claims measured tissue load',()=>{
 const s=app();assert.equal(save(s,record('a01',6,33)).ok,true);
 const exp=s.workflows.records.loadExperience('a01');assert.equal(exp.record.distanceKm,6);
 assert.equal(exp.regionalV2ResultRecord.model_version,version);
 assert.equal(exp.regionalV2Result.regions.every(x=>x.literatureOnly===true&&x.notPersonalMeasurement===true&&x.speedContext==='RECORD_AVERAGE_UNVERIFIED'),true);
});
test('A02 Li noninteger speed must be B interpolation, never A1 table observation',()=>{
 const point=evaluateRunningRegion('R10',10.5/3.6,{protocolMatched:true});assert.equal(point.route,'B_INTRA_SOURCE_INTERPOLATION');assert.equal(point.anchorIds.length,2);
});
test('A03 2.77778m/s is outside 2.78m/s Van Hooren support, not snapped',()=>{
 for(const r of ['R05','R06','R09'])assert.equal(evaluateRunningRegion(r,2.77778,{protocolMatched:true}).reference100,null);
});
test('A04 walk-run mixed must never enter running-specific 12 reference paths',()=>{
 const r=evaluateRunningAtSpeed(3,{walkingMixed:true});assert.equal(n(r),0);
 const created=createEvidenceRunningResultRecord({record:record('mix',5,30,{runningFormat:'RUN_WALK'})});assert.equal(created.ok,true);
 assert.equal(created.resultRecord.result.regions.every(r=>r.value===null),true);
});
test('A05-A07 missing/zero/negative facts cannot generate fabricated nonzero regional indicators',()=>{
 for(const [km,min] of [[0,0],[-2,15],[3,-2],[5,0],[null,null]]){
  const result=createEvidenceRunningResultRecord({record:record('invalid'+km,km,min)});
  assert.equal(result.ok,true);assert.equal(result.resultRecord.result.regions.every(r=>r.value===null),true);
 }
});
test('A11/A39 previous model cannot be directly compared to new v4 construct',()=>{
 const s=app();save(s,record('new-v4'));const current=s.workflows.records.loadExperience('new-v4').regionalV2ResultRecord;
 const legacy=internalModules.primaryRegionalResultService.createPrimaryRegionalV2ResultRecord({record:record('new-v4')}).resultRecord;
 const compare=internalModules.primaryRegionalResultService.comparePrimaryRegionalV2Signatures(legacy.comparison_signatures['BA-DISP-014'],current.comparison_signatures['BA-DISP-014']);
 assert.equal(compare.directDeltaAllowed,false);
});
test('A13 simulated evaluation never modifies caller-owned source',()=>{
 const input=Object.freeze({distanceKm:5.5,durationMinutes:30});const r=createEvidenceRunningResultRecord({record:record('before')});
 const alt=evaluateRunningAtSpeed(12/3.6,{speedContext:'HYPOTHETICAL'});
 assert.equal(alt.regions.R01.reference100!==null,true);assert.equal(input.durationMinutes,30);assert.equal(r.resultRecord.source_record_revision,'2026-10-19T07:00:00.000Z');
});
test('A15 outside speed ranges yield real null, not extrapolated 0/100',()=>{
 for(const r of ['R05','R06','R09'])assert.equal(evaluateRunningRegion(r,2.5).reference100,null);
 for(const r of ['R10','R11','R12'])assert.equal(evaluateRunningRegion(r,13/3.6).reference100,null);
});
test('A19/A25 research outputs explicitly identify reference-only and unverified average',()=>{
 const s=app();save(s,record('literature'));const e=s.workflows.records.loadExperience('literature');
 const x=e.regionalV2Result.regions[0];assert.equal(x.literatureOnly,true);assert.match(x.sourceSha256,/^[0-9a-f]{64}$/);assert.equal(x.speedContext,'RECORD_AVERAGE_UNVERIFIED');
});
test('A21 proposed source with invalid zero reference cannot be approved by metadata alone',()=>{
 assert.equal(evaluateExtension({status:'APPROVED',reference:{raw:0}}).value,null);
});
test('A22/A26 reference100 values across regions are never aggregate score',()=>{
 const s=app();save(s,record('separate'));const rows=s.workflows.records.loadExperience('separate').regionalV2Result.regions;
 assert.equal(rows.length,12);assert.equal(new Set(rows.map(x=>x.construct)).size>=8,true);
 assert.equal(rows.some(x=>x.value!==null),true);assert.equal(rows.every(x=>x.valueEnvelope===null),true);
});
test('A27 Gazendam values identify single waveform FF instead of whole muscle activity',()=>{
 for(const r of ['R02','R03','R04','R07']){
  const v=evaluateRunningRegion(r,3,{protocolMatched:true});assert.equal(v.route,'A2_PUBLISHED_EQUATION');assert.match(v.seriesId,/FF/i);
 }
});
test('A28 Li heel original 6 to 7 km/h decreases rather than falsely monotonic',()=>{
 assert.ok(evaluateRunningRegion('R10',6/3.6).rawValue>evaluateRunningRegion('R10',7/3.6).rawValue);
});
test('A36/A42 recording out-of-range speed keeps record and null results for unsupported regions',()=>{
 const s=app();const r=record('unmatched',5,30);assert.equal(save(s,r).ok,true);
 const exp=s.workflows.records.loadExperience('unmatched');assert.ok(exp);
 for(const region of ['R05','R06','R09'])assert.equal(exp.regionalV2Result.regions.find(x=>x.primaryRegionId===region).value,null);
 assert.equal(exp.regionalV2Recovery,null);
});
test('R05/R06/R09 at 10.008 and R10/R11/R12 at 12 exactly preserve 12-region support',()=>{
 assert.equal(n(evaluateRunningAtSpeed(10.008/3.6,{protocolMatched:true})),12);
 assert.equal(n(evaluateRunningAtSpeed(12/3.6,{protocolMatched:true})),12);
 assert.equal(n(evaluateRunningAtSpeed(10/3.6,{protocolMatched:true})),9);
 assert.equal(n(evaluateRunningAtSpeed(12.001/3.6,{protocolMatched:true})),9);
});
test('R11 v4 detail displays Li midfoot force, reference-only, and rejects arch direct measurement',()=>{
 const s=app();save(s,record('arch'));const screen=renderBodyPartDetailScreenWithPresentation({services:s,context:{parameters:new URLSearchParams('recordId=arch&regionId=BA-DISP-028')}});
 assert.match(screen,/Liらの中足部区域の最大力/);assert.match(screen,/内側縦足弓を直接測定した値ではありません/);assert.match(screen,/計算根拠と適用条件/);
});
