import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createApplicationServices,createMemoryStorage,PRIMARY_REGIONAL_V2_REGION_DEFS,
  PRIMARY_REGIONAL_V2_MODEL_VERSION,
} from '../core/appCore.js';
import {buildWorkspace} from '../screens/historyScreen.js';
import {renderResultScreen as renderDesktop} from '../screens/desktop/resultScreen.js';
import {renderResultScreen as renderMobile} from '../screens/mobile/resultScreen.js';
import {renderBodyPartDetailScreenWithPresentation,fmt} from '../screens/bodyPartDetailScreen.js';

const feedback={checkStatus:'deferred',bodyAreaObservations:[],safetyFlags:{}};
const record=(id,date,km,min)=>({id,date,createdAt:`${date}T06:30:00.000Z`,activityType:'run',distanceKm:km,durationMinutes:min,runningFormat:'CONTINUOUS_RUN',stepsProvenance:'UNKNOWN',course:{gradeKnowledge:'UNKNOWN',modelSurfaceClass:'UNKNOWN'}});
const context=(input)=>({parameters:new URLSearchParams(input)});
function setUp(){const s=createApplicationServices({storage:createMemoryStorage()});for(const r of [record('new-1','2026-10-08',5,31),record('new-2','2026-10-10',7.5,44)])assert.equal(s.workflows.records.saveRecordAndFeedback(r,feedback).ok,true);return s;}

test('pre-release new records always use current v3.1, no legacy default',()=>{
 const s=setUp();for(const id of ['new-1','new-2']){
  const e=s.workflows.records.loadExperience(id);
  assert.equal(e.regionalV2ResultRecord.model_version,PRIMARY_REGIONAL_V2_MODEL_VERSION);
  assert.equal(e.regionalV2ResultRecord.output_semantic_version,'runload-primary-regional-reference100-output-v3.1');
  assert.equal(e.record.regionalModelSnapshot.modelVersion,PRIMARY_REGIONAL_V2_MODEL_VERSION);
  assert.equal(e.regionalV2Recovery,null);
  assert.equal(e.regionalV2Result.regions.length,12);
 }
});

test('all 12 region values preserve meaning across saved record, history, consultation, desktop/mobile output and detail',()=>{
 const s=setUp();const all=s.workflows.records.loadAllExperiences(),e=s.workflows.records.loadExperience('new-2');
 const saved=s.storage.modelResultsRegionalV2.loadForRecord('new-2').find(x=>x.model_version===PRIMARY_REGIONAL_V2_MODEL_VERSION);
 assert.ok(saved);assert.deepEqual(e.regionalV2ResultRecord.result.regions,saved.result.regions);
 const desktop=renderDesktop({services:s,context:context('recordId=new-2')});
 const mobile=renderMobile({services:s,context:context('recordId=new-2')});
 assert.match(desktop,/data-region-id=/);assert.match(mobile,/data-region-id=/);
 for(const def of PRIMARY_REGIONAL_V2_REGION_DEFS){
  const id=def.displayId,expected=saved.result.regions.find(x=>x.regionId===id);
  assert.ok(expected,id);const history=buildWorkspace(s,context(`recordId=new-2&regionId=${id}&period=28&view=records`));
  const h=history.trendRows.find(x=>x.experience.record.id==='new-2');assert.ok(h,id);
  assert.equal(h.row.value,expected.value,id);assert.equal(h.resultRecord.model_version,PRIMARY_REGIONAL_V2_MODEL_VERSION,id);
  const memo=s.consultation.buildConsultationReport(e,all,{regionId:id});
  assert.equal(memo.modelReference.regional.value,expected.value,id);
  const detail=renderBodyPartDetailScreenWithPresentation({services:s,context:context(`recordId=new-2&regionId=${id}`)});
  assert.match(detail,/部位詳細/,id);
  const canonical=Number.isFinite(expected.value) ? fmt(expected.value,1) : '—';
  assert.ok(desktop.includes(`data-pc-region-select="${id}"`),id);
  assert.ok(mobile.includes(`data-region-id="${id}"`),id);
  if(expected.value == null){
    assert.equal(h.conditionIndexExact,null,id);
  }else{
    assert.equal(h.conditionIndexExact,expected.value,id);
    assert.ok(desktop.includes(`今回の目安 ${canonical}`),id);
    assert.ok(mobile.includes(`今回の目安 ${canonical}`),id);
  }
 }
});

test('round-trip portable backup cannot silently revise new v3.1 model, 12 values or signatures',()=>{
 const s=setUp();const exported=s.storage.backup.tryExportBackupText();assert.equal(exported.ok,true);
 const dest=createApplicationServices({storage:createMemoryStorage()});assert.equal(dest.storage.backup.restoreBackupText(exported.text).ok,true);
 for(const id of ['new-1','new-2']){
  const source=s.workflows.records.loadExperience(id),target=dest.workflows.records.loadExperience(id);
  assert.deepEqual(target.regionalV2ResultRecord,source.regionalV2ResultRecord);
  assert.equal(target.regionalV2Recovery,null);
 }
});

test('rest record never becomes a fabricated zero or current run result in report/history',()=>{
 const s=createApplicationServices({storage:createMemoryStorage()});
 const r={id:'rest-only',date:'2026-10-10',createdAt:'2026-10-10T20:00:00.000Z',activityType:'rest'};
 const saved=s.workflows.records.saveRecordAndFeedback(r,feedback);assert.equal(saved.ok,true,JSON.stringify(saved));
 const e=s.workflows.records.loadExperience('rest-only');assert.ok(e);
 const all=s.workflows.records.loadAllExperiences();
 for(const def of PRIMARY_REGIONAL_V2_REGION_DEFS){
  const id=def.displayId;
  const report=s.consultation.buildConsultationReport(e,all,{regionId:id});
  assert.equal(report.modelReference.state,'REST',id);
  assert.equal(report.modelReference.regional.value,null,id);
  const ws=buildWorkspace(s,context(`recordId=rest-only&regionId=${id}&period=28`));
  const row=ws.trendRows.find(x=>x.experience.record.id==='rest-only');
  assert.ok(row,id);assert.equal(row.conditionIndexExact,null,id);
  assert.equal(row.compatibility.directDeltaAllowed,false,id);
 }
});
