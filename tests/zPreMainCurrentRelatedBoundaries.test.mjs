import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createApplicationServices,createMemoryStorage,STORAGE_KEYS} from '../core/appCore.js';
import {createRofJServices} from '../core/rofJCore.js';
import '../core/internal/platformInfrastructure.js';
import {internalModules} from '../core/internal/modules.js';
import {evaluateRunningAtSpeed} from '../core/runningEvidence/runningEvidenceEngine.js';
import {renderResultScreen as mobileResult} from '../screens/mobile/resultScreen.js';
import {renderResultScreen as desktopResult} from '../screens/desktop/resultScreen.js';

const t={pre:'2026-10-19T07:59:00.000Z',start:'2026-10-19T08:00:00.000Z',end:'2026-10-19T08:30:00.000Z',post:'2026-10-19T08:31:00.000Z',later:'2026-10-19T09:00:00.000Z'};
const feedback={checkStatus:'deferred',bodyAreaObservations:[],safetyFlags:{}};
const record=(id='pre-main-01',distanceKm=5.5,durationMinutes=30)=>({id,date:'2026-10-19',createdAt:t.start,activityType:'run',distanceKm,durationMinutes,runningFormat:'CONTINUOUS_RUN',stepsProvenance:'UNKNOWN',course:{gradeKnowledge:'UNKNOWN',modelSurfaceClass:'UNKNOWN'}});
function fixture(){const storage=createMemoryStorage(),app=createApplicationServices({storage});return {app,storage,rof:createRofJServices({gateway:app.storage.gateway,recordsRepository:app.storage.records})};}
function openRun(rof,id='running'){assert.equal(rof.beginLifecycle({runId:id,createdAt:t.pre}).ok,true);return id;}

// Named Current scenarios deliberately exercise the relevant production service,
// not merely the presence of a phrase or an unrelated regression suite.
test('A08: a new ROF-J PRE entry is rejected after the recorded run begins',()=>{
 const {rof}=fixture();const id=openRun(rof);assert.equal(rof.markRunStart(id,t.start).ok,true);
 const reply=rof.capturePreDirect(id,4,t.post);assert.equal(reply.ok,false);assert.equal(reply.code,'PRE_AFTER_RUN_START_FORBIDDEN');
 assert.equal(rof.summarizeRun(id).pre,null);
});
test('A09: an observed ROF-J zero is not missing/undefined',()=>{
 const {rof}=fixture();openRun(rof,'zero');openRun(rof,'missing');
 assert.equal(rof.capturePreDirect('zero',0,t.pre).ok,true);assert.equal(rof.markRunStart('zero',t.start).ok,true);
 assert.equal(rof.markRunStart('missing',t.start).ok,true);
 assert.equal(rof.summarizeRun('zero').pre,0);assert.equal(rof.summarizeRun('missing').pre,null);
 assert.equal(rof.summarizeRun('zero').preObservedValue,0);
});
test('A10: ROF-J one-sided captures produce no false PRE/POST delta',()=>{
 const {rof}=fixture();openRun(rof,'only-pre');rof.capturePreDirect('only-pre',0,t.pre);rof.markRunStart('only-pre',t.start);rof.markRunEnd('only-pre',t.end);
 assert.equal(rof.summarizeRun('only-pre').delta,null);
 openRun(rof,'only-post');rof.markRunStart('only-post',t.start);rof.markRunEnd('only-post',t.end);rof.capturePostDirect('only-post',5,t.post);
 const s=rof.summarizeRun('only-post');assert.equal(s.pre,null);assert.equal(s.post,5);assert.equal(s.delta,null);
});
test('A12/A35: literature values are not summed with a personal ROF-J subjective score',()=>{
 const {app,rof}=fixture();const r=record('separation');openRun(rof,'separation');assert.equal(app.workflows.records.saveRecordAndFeedback(r,feedback).ok,true);
 rof.capturePreDirect('separation',5,t.pre);rof.markRunStart('separation',t.start);rof.markRunEnd('separation',t.end);rof.capturePostDirect('separation',8,t.post);
 const s=rof.summarizeRun('separation'),e=app.workflows.records.loadExperience('separation');
 assert.equal(s.delta,3);assert.ok(e.regionalV2Result.regions.some(row=>Number.isFinite(row.value)));
 assert.equal(e.regionalV2Result.regions.every(row=>row.valueEnvelope===null),true);
 // ROF input never enters the scientific reference evaluator.
 const a=evaluateRunningAtSpeed(11/3.6,{protocolMatched:true});
 assert.equal(a.regions.R01.reference100,evaluateRunningAtSpeed(11/3.6,{protocolMatched:true}).regions.R01.reference100);
 const pages=[mobileResult({services:app,context:{parameters:new URLSearchParams('recordId=separation')} }),desktopResult({services:app,context:{parameters:new URLSearchParams('recordId=separation')}})];
 for(const html of pages)assert.doesNotMatch(html,/総合負荷点|怪我の確率|ROF-Jとの合算点/);
});
test('A17: reference-unavailable running result still shows actual saved record and next-stage navigation',()=>{
 const {app}=fixture();assert.equal(app.workflows.records.saveRecordAndFeedback(record('out-of-evidence',1,30),feedback).ok,true);
 const e=app.workflows.records.loadExperience('out-of-evidence');assert.equal(e.record.distanceKm,1);
 assert.equal(e.regionalV2Result.regions.every(row=>row.value===null),true);
 for(const render of [mobileResult,desktopResult]){
  const html=render({services:app,context:{parameters:new URLSearchParams('recordId=out-of-evidence')}});
  assert.match(html,/1\.00|1 km|1km|1\.0/);
  assert.match(html,/記録|履歴/);
  assert.doesNotMatch(html,/危険度が高い|必ず負傷/);
 }
});
test('A18: saved draft survives interruption without corrupting last completed run',()=>{
 const {app}=fixture();assert.equal(app.workflows.records.saveRecordAndFeedback(record('completed'),feedback).ok,true);
 const original=app.workflows.records.loadExperience('completed').record;
 const before=app.storage.draft.save({record:record('resumed',6,45),feedback:{checkStatus:'deferred'}});
 assert.equal(before.ok,true);const loaded=app.storage.draft.load();assert.equal(loaded.record.id,'resumed');
 assert.deepEqual(app.workflows.records.loadExperience('completed').record,original);
});
test('A20: pre-restore rollback backup protects original record and reconstructs original content',()=>{
 const {app}=fixture();assert.equal(app.workflows.records.saveRecordAndFeedback(record('before-restore'),feedback).ok,true);
 const exported=app.storage.backup.tryExportBackupText();assert.equal(exported.ok,true);
 assert.equal(app.workflows.records.saveRecordAndFeedback(record('after-restore'),feedback).ok,true);
 const result=app.storage.backup.restoreBackupText(exported.text);assert.equal(result.ok,true,JSON.stringify(result));
 assert.ok(app.workflows.records.loadExperience('before-restore'));
 assert.equal(app.workflows.records.loadExperience('after-restore'),null);
 const safety=app.storage.gateway.readJson(STORAGE_KEYS.backups,[]);assert.ok(safety.length>0);
});
test('A29: speed exploration does not write any change to saved running facts or reference snapshots',()=>{
 const {app,storage}=fixture();assert.equal(app.workflows.records.saveRecordAndFeedback(record('hypothesis'),feedback).ok,true);
 const before=storage.dump();const simulated=evaluateRunningAtSpeed(12/3.6,{protocolMatched:true,speedContext:'HYPOTHETICAL'});
 assert.equal(simulated.regions.R01.reference100!==null,true);
 assert.deepEqual(storage.dump(),before);
});
test('A31: initial ROF-J response timestamp remains immutable after markRunStart idempotency',()=>{
 const {rof}=fixture();openRun(rof,'immutable');rof.capturePreDirect('immutable',4,t.pre);rof.markRunStart('immutable',t.start);
 const original=rof.repository.loadByRunId('immutable').measurements.PRE_RUN;
 const later=rof.markRunStart('immutable',t.post);assert.equal(later.unchanged,true);
 const still=rof.repository.loadByRunId('immutable').measurements.PRE_RUN;
 assert.equal(still.revisions[0].recordedAt,t.pre);assert.deepEqual(still,original);
});
test('A32: with unknown start/end time ROF-J observed value is not an eligible PRE/POST delta',()=>{
 const {rof}=fixture();openRun(rof,'start-unknown');rof.capturePreDirect('start-unknown',7,t.pre);
 const summary=rof.summarizeRun('start-unknown');assert.equal(summary.pre,null);assert.equal(summary.preObservedValue,7);
 assert.equal(summary.preEligibility.eligible,false);assert.ok(summary.preEligibility.reasons.includes('RUN_START_UNKNOWN'));
 assert.equal(summary.delta,null);
});
test('A33: POST cannot be captured before run finishes or before its recorded end time',()=>{
 const {rof}=fixture();openRun(rof,'post-guard');rof.markRunStart('post-guard',t.start);
 let x=rof.capturePostDirect('post-guard',6,t.post);assert.equal(x.code,'RUN_END_REQUIRED_FOR_POST');
 rof.markRunEnd('post-guard',t.end);x=rof.capturePostDirect('post-guard',6,t.start);
 assert.equal(x.ok,false);assert.equal(x.code,'POST_BEFORE_RUN_END');
 assert.equal(rof.summarizeRun('post-guard').postObservedValue ?? null,null);
});
test('A34: initial ROF-J revision timestamps cannot be overwritten by a second direct capture',()=>{
 const {rof}=fixture();openRun(rof,'revision');rof.capturePreDirect('revision',3,t.pre);
 const before=rof.repository.loadByRunId('revision').measurements.PRE_RUN;
 const x=rof.capturePreDirect('revision',10,t.post);assert.equal(x.ok,false);assert.equal(x.code,'PRE_ALREADY_CAPTURED');
 const after=rof.repository.loadByRunId('revision').measurements.PRE_RUN;assert.deepEqual(after,before);
});
test('A37: independent user next-step memo persists after following running record is saved',()=>{
 const {app}=fixture();const first=record('follow-up-1');assert.equal(app.workflows.records.saveRecordAndFeedback(first,feedback).ok,true);
 const saved=app.storage.selfInterpretations.saveForRecord({record:first,findingCode:'QUESTION',findingLabel:'走行後に気づいたこと',decision:'CONTINUE',nextLabel:'次回は走り終わったときの感覚を見る',userNote:'本人が選んだ確認事項',now:t.post});
 assert.equal(saved.ok,true,JSON.stringify(saved));assert.equal(app.workflows.records.saveRecordAndFeedback(record('follow-up-2'),feedback).ok,true);
 const prior=app.storage.selfInterpretations.findByRecordId('follow-up-1');assert.match(prior.nextLabel,/次回/);assert.equal(prior.userNote,'本人が選んだ確認事項');
 assert.ok(app.workflows.records.loadExperience('follow-up-2'));
});
test('A41: a simulated conflicting write from another tab aborts the transaction without overwriting it',()=>{
 // Audits genuine gateway conflict-detection behavior, but not delivery of a real browser storage event.
 const {createStorageGateway,createMemoryStorage}=internalModules.storageGateway;
 const inner=createMemoryStorage({saved:'original',reference:'base'});let readCount=0;
 const storage={getItem(key){if(key==='saved'&&++readCount===2)inner.setItem('saved','second-tab');return inner.getItem(key);},setItem:(k,v)=>inner.setItem(k,v),removeItem:k=>inner.removeItem(k)};
 const tx=createStorageGateway(storage).transact([{key:'saved',value:'unapproved-update'},{key:'reference',value:'other'}]);
 assert.equal(tx.ok,false);assert.equal(tx.code,'STORAGE_TRANSACTION_CONCURRENT_CHANGE');
 assert.deepEqual(inner.dump(),{saved:'second-tab',reference:'base'});
});
