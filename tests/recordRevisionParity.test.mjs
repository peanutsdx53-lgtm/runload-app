import assert from 'node:assert/strict';
import { createApplicationServices, createMemoryStorage, STORAGE_KEYS, PRIMARY_REGIONAL_V2_REGION_DEFS } from '../core/appCore.js';
import { buildWorkspace } from '../screens/historyScreen.js';
import { renderHistoryScreen as desktopHistory } from '../screens/desktop/historyScreen.js';
import { renderHistoryScreen as mobileHistory } from '../screens/mobile/historyScreen.js';
import { renderBodyPartDetailScreenWithPresentation } from '../screens/bodyPartDetailScreen.js';

const results=[];
function check(id,fn){try{fn();results.push({id,status:'PASS'});}catch(e){results.push({id,status:'FAIL',message:e.stack||String(e)});}}
const context=(params='')=>({parameters:new URLSearchParams(params)});
const feedback={checkStatus:'deferred',bodyAreaObservations:[],safetyFlags:{}};
function record(id,date,dist=5,minutes=33.333333333){return {id,date,createdAt:`${date}T07:00:00.000Z`,activityType:'run',distanceKm:dist,durationMinutes:minutes,runningFormat:'CONTINUOUS_RUN',stepsProvenance:'UNKNOWN',course:{gradeKnowledge:'UNKNOWN',modelSurfaceClass:'UNKNOWN'}};}
const services=createApplicationServices({storage:createMemoryStorage()});
check('SETUP-PRIOR-SAVED',()=>assert.equal(services.workflows.records.saveRecordAndFeedback(record('prior','2026-10-07'),feedback).ok,true));
check('SETUP-TARGET-SAVED',()=>assert.equal(services.workflows.records.saveRecordAndFeedback(record('target','2026-10-08'),feedback).ok,true));
const before=services.workflows.records.loadExperience('target');
const oldResult=structuredClone(before.regionalV2ResultRecord);
const storedBefore=JSON.stringify(services.storage.modelResultsRegionalV2.loadAll());
const changed={...before.record,updatedAt:'2026-10-09T02:00:00.000Z',distanceKm:8,durationMinutes:32};
const expected=services.model.primaryRegionalV2.createPrimaryRegionalV2ResultRecord({record:changed,allRecords:[...services.storage.records.loadAll().filter(x=>x.id!=='target'),changed]}).resultRecord;
check('SETUP-REVISIONS-DIFFER',()=>assert.notEqual(oldResult.source_record_revision,expected.source_record_revision));
check('SETUP-RECORD-ONLY-EDIT',()=>assert.equal(services.storage.gateway.writeJson(STORAGE_KEYS.records,[...services.storage.records.loadAll().filter(x=>x.id!=='target'),changed]).ok,true));
const loaded=services.workflows.records.loadExperience('target');
const all=services.workflows.records.loadAllExperiences();
check('RECOVERED-REVISION-MATCHES-RECORD',()=>assert.equal(loaded.regionalV2ResultRecord.source_record_revision,changed.updatedAt));
check('RECOVERY-EXPLICIT-ISSUE',()=>assert.ok(loaded.regionalV2Recovery?.issueCodes?.includes('SOURCE_RECORD_REVISION_MISMATCH')));
check('NO-PERSISTED-RESULT-OVERWRITE',()=>assert.equal(JSON.stringify(services.storage.modelResultsRegionalV2.loadAll()),storedBefore));
check('RECOVERY-TRANSIENT-ONLY',()=>assert.equal(loaded.regionalV2ResultRecord.recovery_status,'TRANSIENT_RECONSTRUCTED'));
check('REGION-COUNT-12',()=>assert.equal(loaded.regionalV2Result.regions.length,12));
for(const def of PRIMARY_REGIONAL_V2_REGION_DEFS){
 const regionId=def.displayId;
 check(`REGION-${def.id}-RECALCULATED`,()=>{
  const actual=loaded.regionalV2Result.regions.find(x=>x.regionId===regionId);
  const wanted=expected.result.regions.find(x=>x.regionId===regionId);
  assert.ok(actual && wanted); assert.equal(actual.value,wanted.value);
  assert.deepEqual(actual.routeTrace,wanted.routeTrace);
 });
 check(`HISTORY-${def.id}-SAME-VALUE`,()=>{
  const workspace=buildWorkspace(services,context(`regionId=${regionId}&period=28`));
  const item=workspace.rows.find(x=>x.experience.record.id==='target');
  const wanted=expected.result.regions.find(x=>x.regionId===regionId);
  assert.equal(item.row.value,wanted.value);
  assert.equal(item.resultRecord.source_record_revision,changed.updatedAt);
 });
 check(`CONSULTATION-${def.id}-SAME-VALUE`,()=>{
  const report=services.consultation.buildConsultationReport(loaded,all,{regionId});
  const wanted=expected.result.regions.find(x=>x.regionId===regionId);
  assert.equal(report.modelReference.regional.value,wanted.value);
 });
}
check('DESKTOP-HISTORY-RENDER',()=>assert.match(desktopHistory({services,context:context('view=records')}),/保存記録/));
check('MOBILE-HISTORY-RENDER',()=>assert.match(mobileHistory({services,context:context('view=trends&regionId=BA-DISP-014')}),/比較できる記録/));
check('DETAIL-RENDER',()=>assert.match(renderBodyPartDetailScreenWithPresentation({services,context:context('recordId=target&regionId=BA-DISP-014')}),/保存記録の推移/));
check('OLDER-RECORD-NOT-CHANGED',()=>assert.equal(services.workflows.records.loadExperience('prior').regionalV2Recovery,null));
check('SAME-REVISION-DOES-NOT-RECOVER',()=>{
 const s=createApplicationServices({storage:createMemoryStorage()});assert.equal(s.workflows.records.saveRecordAndFeedback(record('clean','2026-10-08'),feedback).ok,true);
 assert.equal(s.workflows.records.loadExperience('clean').regionalV2Recovery,null);
});
check('EXACT-REVISION-PREFERRED-OVER-FUTURE-STALE',()=>{
 const s=createApplicationServices({storage:createMemoryStorage()});assert.equal(s.workflows.records.saveRecordAndFeedback(record('dual','2026-10-08'),feedback).ok,true);
 const original=s.workflows.records.loadExperience('dual').regionalV2ResultRecord;
 const future={...structuredClone(original),id:'future-result',source_record_revision:'2099-01-01T00:00:00.000Z'};
 assert.equal(s.storage.modelResultsRegionalV2.saveAll([original,future]).ok,true);
 const actual=s.workflows.records.loadExperience('dual');
 assert.equal(actual.regionalV2ResultRecord.id,original.id);
 assert.equal(actual.regionalV2Recovery,null);
});
const failed=results.filter(x=>x.status==='FAIL');
console.log(JSON.stringify({suite:'record-revision-crossscreen-parity',total:results.length,passed:results.length-failed.length,failed:failed.length,results},null,2));
if(failed.length)process.exitCode=1;
