import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createApplicationServices, createMemoryStorage, STORAGE_KEYS } from '../core/appCore.js';
import { internalModules } from '../core/internal/modules.js';

// Independent, non-user synthetic fixture produced by original v3.0 engine.
const fixture = JSON.parse(readFileSync(new URL('./fixtures/a03ActualHistoricV30Backup.json', import.meta.url),'utf8'));
const old = fixture.originalResult;
const svc = () => createApplicationServices({storage:createMemoryStorage()});
function importOriginal(s){const r=s.storage.backup.restoreBackupText(JSON.stringify(fixture.snapshot));assert.equal(r.ok,true,JSON.stringify(r));}
function currentState(s){return {
  record:s.storage.records.loadAll().find(x=>x.id===old.record_id),
  results:s.storage.modelResultsRegionalV2.loadForRecord(old.record_id),
  raw:s.storage.backup.createBackupSnapshot().data,
};}

test('G-03: all read routes leave actual historic v3.0 result and snapshot immutable',()=>{
  const s=svc();importOriginal(s);
  const initial=currentState(s),originalBytes=JSON.stringify(initial.raw);
  assert.equal(initial.results.length,1);
  assert.deepEqual(initial.results[0],old);
  for(let i=0;i<15;i++){
    const exp=s.workflows.records.loadExperience(old.record_id);
    assert.deepEqual(exp.regionalV2ResultRecord,old);
    assert.equal(exp.regionalSemanticState,'REFERENCE100_V3_HISTORIC_READ_ONLY');
    assert.deepEqual(s.workflows.records.loadLatestExperience()?.regionalV2ResultRecord,old);
    assert.deepEqual(s.workflows.records.loadAllExperiences().find(x=>x.record.id===old.record_id)?.regionalV2ResultRecord,old);
    assert.ok(s.workflows.history.search({period:'all'}).some(x=>x.record.id===old.record_id));
    assert.deepEqual(s.storage.modelResultsRegionalV2.findLatestForRecord(old.record_id),old);
    assert.deepEqual(s.storage.modelResultsRegionalV2.latestByRecord().get(old.record_id),old);
  }
  assert.equal(JSON.stringify(currentState(s).raw),originalBytes,'reads must never mutate backup snapshot');
  assert.equal(currentState(s).record.regionalModelSnapshot.modelVersion,'runload-primary-regional-reference100-v3.0');
});

test('G-03: export, inspect and restore of actual v3.0 backup retain exact model semantics',()=>{
  const original=svc();importOriginal(original);
  const ex=original.storage.backup.tryExportBackupText();
  assert.equal(ex.ok,true,JSON.stringify(ex));
  const inspected=original.storage.backup.inspectBackupText(ex.text);
  assert.equal(inspected.canRestore,true,JSON.stringify(inspected.issues));
  const dest=svc();
  const imported=dest.storage.backup.restoreBackupText(ex.text);
  assert.equal(imported.ok,true,JSON.stringify(imported));
  assert.deepEqual(dest.storage.modelResultsRegionalV2.loadForRecord(old.record_id),[old]);
  assert.equal(dest.storage.records.loadAll().find(x=>x.id===old.record_id).regionalModelSnapshot.modelVersion,'runload-primary-regional-reference100-v3.0');
  assert.equal(dest.workflows.records.loadExperience(old.record_id).regionalSemanticState,'REFERENCE100_V3_HISTORIC_READ_ONLY');
  const twice=dest.storage.backup.restoreBackupText(ex.text);
  assert.equal(twice.ok,true,JSON.stringify(twice));
  assert.deepEqual(dest.storage.modelResultsRegionalV2.loadForRecord(old.record_id),[old]);
});

test('G-03: deliberate edit writes distinct v3.1 but retains original, all 12 regions and model signatures incompatible',()=>{
  const s=svc();importOriginal(s);
  const rec=s.storage.records.loadAll().find(x=>x.id===old.record_id);
  const fb=s.storage.subjectiveFeedback.loadAll().find(x=>x.recordId===old.record_id);
  const edit=s.workflows.records.saveRecordAndFeedback({...rec,updatedAt:rec.updatedAt||rec.createdAt},fb);
  assert.equal(edit.ok,true,JSON.stringify(edit));
  const pair=s.storage.modelResultsRegionalV2.loadForRecord(old.record_id);
  assert.equal(pair.length,2);
  const prev=pair.find(x=>x.model_version==='runload-primary-regional-reference100-v3.0');
  const cur=pair.find(x=>x.model_version==='runload-primary-regional-reference100-v3.1');
  assert.deepEqual(prev,old);
  assert.ok(cur);
  assert.notEqual(cur.id,prev.id);
  assert.deepEqual(s.workflows.records.loadExperience(old.record_id).regionalV2ResultRecord,cur);
  for(const key of Object.keys(old.comparison_signatures)){
    const comparison=internalModules.primaryRegionalResultService.comparePrimaryRegionalV2Signatures(old.comparison_signatures[key],cur.comparison_signatures[key]);
    assert.equal(comparison.directDeltaAllowed,false,key);
    assert.equal(comparison.status,'INCOMPATIBLE',key);
  }
  const exp=s.storage.backup.tryExportBackupText();assert.equal(exp.ok,true,JSON.stringify(exp));
  const restored=svc();assert.equal(restored.storage.backup.restoreBackupText(exp.text).ok,true);
  assert.deepEqual(restored.storage.modelResultsRegionalV2.loadForRecord(old.record_id),pair);
});

test('G-03: unknown old-model results never become current model and are rejected as portable backups',()=>{
  const storage=createMemoryStorage();const s=createApplicationServices({storage});importOriginal(s);
  const archived=structuredClone(old);
  archived.model_version='unsupported-historical-model-1980';
  archived.output_semantic_version='unsupported-output-semantics-1980';
  archived.result.regions[0].value=999999;
  const raw=JSON.stringify([archived]);
  storage.setItem(STORAGE_KEYS.modelResultsRegionalV2,raw);
  for(let i=0;i<5;i++){
    const e=s.workflows.records.loadExperience(old.record_id);
    assert.equal(e.regionalV2ResultRecord,null);
    assert.equal(e.regionalV2Result,null);
  }
  assert.equal(storage.getItem(STORAGE_KEYS.modelResultsRegionalV2),raw);
  const snapshot=s.storage.backup.createBackupSnapshot();
  const inspect=s.storage.backup.validateBackupSnapshot(snapshot);
  assert.equal(inspect.canRestore,false);
  assert.ok(inspect.issues.some(x=>x.code==='REGIONAL_VERSION_UNSUPPORTED'));
  const ex=s.storage.backup.tryExportBackupText();
  assert.equal(ex.ok,false);
  assert.equal(storage.getItem(STORAGE_KEYS.modelResultsRegionalV2),raw);
});

test('G-03: corrupted historic route remains unavailable; no destructive auto-repair during repeated reads',()=>{
  const s=svc();importOriginal(s);
  const corrupt=structuredClone(old);corrupt.result.regions[0].routeTrace=[];
  assert.equal(s.storage.modelResultsRegionalV2.saveAll([corrupt]).ok,true);
  const raw=JSON.stringify(s.storage.modelResultsRegionalV2.loadAll());
  for(let i=0;i<10;i++){
    const ex=s.workflows.records.loadExperience(old.record_id);
    assert.equal(ex.regionalV2ResultRecord,null);
    assert.equal(ex.regionalV2Recovery.status,'HISTORIC_ARCHIVE_UNAVAILABLE');
  }
  assert.equal(JSON.stringify(s.storage.modelResultsRegionalV2.loadAll()),raw);
});

test('G-03: historic result with newer source record revision stays archived, never silently recalculated',()=>{
  const storage=createMemoryStorage();const s=createApplicationServices({storage});importOriginal(s);
  const arr=s.storage.records.loadAll();
  const index=arr.findIndex(x=>x.id===old.record_id);
  assert.ok(index>=0);
  arr[index].updatedAt='2026-10-10T23:59:59.000Z';
  storage.setItem(STORAGE_KEYS.records,JSON.stringify(arr));
  const previousResults=storage.getItem(STORAGE_KEYS.modelResultsRegionalV2);
  const recordBytes=storage.getItem(STORAGE_KEYS.records);
  for(let i=0;i<6;i++){
    const exp=s.workflows.records.loadExperience(old.record_id);
    assert.equal(exp.regionalV2ResultRecord,null);
    assert.equal(exp.regionalV2Recovery.status,'HISTORIC_ARCHIVE_UNAVAILABLE');
    assert.ok(exp.regionalV2Recovery.issueCodes.includes('SOURCE_RECORD_REVISION_MISMATCH'));
  }
  assert.equal(storage.getItem(STORAGE_KEYS.records),recordBytes);
  assert.equal(storage.getItem(STORAGE_KEYS.modelResultsRegionalV2),previousResults);
});

test('G-03: delete and undo the original v3.0 record retains historic calculation and metadata exactly',()=>{
  const s=svc();importOriginal(s);
  const before=s.storage.modelResultsRegionalV2.loadForRecord(old.record_id);
  const original=s.storage.records.loadAll().find(x=>x.id===old.record_id);
  assert.ok(original);
  const deleted=s.workflows.history.deleteRecord(old.record_id);
  assert.equal(deleted.ok,true,JSON.stringify(deleted));
  assert.deepEqual(s.storage.modelResultsRegionalV2.loadForRecord(old.record_id),[]);
  const undone=s.workflows.history.undoDelete();
  assert.equal(undone.ok,true,JSON.stringify(undone));
  assert.deepEqual(s.storage.modelResultsRegionalV2.loadForRecord(old.record_id),before);
  const recovered=s.storage.records.loadAll().find(x=>x.id===old.record_id);
  assert.equal(recovered.regionalModelSnapshot.modelVersion,'runload-primary-regional-reference100-v3.0');
  assert.deepEqual(s.workflows.records.loadExperience(old.record_id).regionalV2ResultRecord,old);
});

test('G-03: undated legacy records and timestamp variants never persist a fabricated new-model result on read',()=>{
  for (const mode of ['missingUpdatedAt','missingBothTimestamps','nullUpdatedAt','changedCreatedAt']){
    const storage=createMemoryStorage();const s=createApplicationServices({storage});importOriginal(s);
    const stored=JSON.parse(storage.getItem(STORAGE_KEYS.records));
    const target=stored.find(x=>x.id===old.record_id);assert.ok(target);
    if(mode==='missingUpdatedAt')delete target.updatedAt;
    if(mode==='missingBothTimestamps'){delete target.updatedAt;delete target.createdAt;}
    if(mode==='nullUpdatedAt')target.updatedAt=null;
    if(mode==='changedCreatedAt'){delete target.updatedAt;target.createdAt='2026-10-06T17:30:00.000Z';}
    storage.setItem(STORAGE_KEYS.records,JSON.stringify(stored));
    const before=storage.getItem(STORAGE_KEYS.modelResultsRegionalV2);
    const storedRecords=storage.getItem(STORAGE_KEYS.records);
    for(let iteration=0;iteration<3;iteration++){
      const experience=s.workflows.records.loadExperience(old.record_id);
      assert.ok(experience,mode);
      assert.notEqual(experience.regionalV2ResultRecord?.model_version,'runload-primary-regional-reference100-v3.1',mode);
      if(experience.regionalV2ResultRecord)assert.equal(experience.regionalSemanticState,'REFERENCE100_V3_HISTORIC_READ_ONLY');
    }
    assert.equal(storage.getItem(STORAGE_KEYS.modelResultsRegionalV2),before,mode);
    assert.equal(storage.getItem(STORAGE_KEYS.records),storedRecords,mode);
  }
});
