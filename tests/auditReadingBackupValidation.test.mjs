import assert from 'node:assert/strict';
import test from 'node:test';
import { createApplicationServices, createMemoryStorage, STORAGE_KEYS } from '../core/appCore.js';
import { loadInterpretationReferenceHistory, rememberInterpretationReferenceSelectionResult } from '../ui/interpretationReferenceHistory.js';

function fresh() { return createApplicationServices({ storage: createMemoryStorage() }); }
function runningRecord(id) { return { id,date:'2026-10-08',createdAt:'2026-10-08T11:00:00Z',activityType:'run',distanceKm:5,durationMinutes:30,runningFormat:'CONTINUOUS_RUN',stepsProvenance:'UNKNOWN',course:{name:'Test',gradeKnowledge:'UNKNOWN',modelSurfaceClass:'UNKNOWN'} }; }
function createRecord(service,id) { const res=service.workflows.records.saveRecordAndFeedback(runningRecord(id), {checkStatus:'deferred',bodyAreaObservations:[],safetyFlags:{}}); assert.equal(res.ok,true,JSON.stringify(res)); }
const source=fresh(); createRecord(source,'r1'); createRecord(source,'r2');
assert.equal(rememberInterpretationReferenceSelectionResult(source.storage.gateway,{recordId:'r1',articleId:'regional-three-views'}).ok,true);
const backup=source.storage.backup.createBackupSnapshot();
const key=STORAGE_KEYS.readingReferenceHistory;
const fixture=backup.data[key];

const invalidCases=[
  ['missing entries', {version:1}],
  ['null entries', {version:1,entries:null}],
  ['version mismatch', {version:99,entries:fixture.entries}],
  ['non object entry', {version:1,entries:[1]}],
  ['blank record ID', {version:1,entries:[{recordId:'',articleId:'regional-three-views'}]}],
  ['blank article ID', {version:1,entries:[{recordId:'r1',articleId:''}]}],
  ['duplicate record', {version:1,entries:[...fixture.entries,...fixture.entries]}],
  ['orphan record', {version:1,entries:[{recordId:'deleted',articleId:'regional-three-views'}]}],
  ['too many entries', {version:1,entries:Array.from({length:25},(_,i)=>({recordId:'r'+i,articleId:'regional-three-views'}))}],
  ['trimmed field divergence', {version:1,entries:[{recordId:' r1 ',articleId:'regional-three-views'}]}],
];

for(const [name,value] of invalidCases) {
  test(`INT04 restore rejects ${name} without changing current data`,()=>{
    const bad={...backup,data:{...backup.data,[key]:value}};
    const target=fresh(); createRecord(target,'original');
    assert.equal(rememberInterpretationReferenceSelectionResult(target.storage.gateway,{recordId:'original',articleId:'rof-j-how-to-read'}).ok,true);
    const before=loadInterpretationReferenceHistory(target.storage.gateway);
    const inspection=target.storage.backup.validateBackupSnapshot(bad);
    assert.equal(inspection.canRestore,false,`${name}: inspection must BLOCK`);
    assert.ok(inspection.issues.some(i=>String(i.code).startsWith('READING_REFERENCE_')));
    assert.equal(target.storage.backup.restoreBackupText(JSON.stringify(bad)).ok,false);
    assert.ok(target.workflows.records.loadExperience('original'));
    assert.equal(target.workflows.records.loadExperience('r1'),null);
    assert.deepEqual(loadInterpretationReferenceHistory(target.storage.gateway),before);
  });
  test(`INT04 export rejects ${name} without erasing source`,()=>{
    const target=fresh(); createRecord(target,'r1'); createRecord(target,'r2');
    target.storage.gateway.writeJson(key,value);
    const res=target.storage.backup.tryCreateBackupSnapshot();
    assert.equal(res.ok,false);
    assert.equal(res.code,'BACKUP_SOURCE_READING_REFERENCE_INVALID');
    assert.deepEqual(target.storage.gateway.readJson(key,undefined),value);
  });
}

test('INT04 valid history round-trips; absent history stays optional null',()=>{
  const target=fresh();
  const check=target.storage.backup.validateBackupSnapshot(backup);
  assert.equal(check.canRestore,true,JSON.stringify(check.issues));
  assert.equal(target.storage.backup.restoreBackupText(JSON.stringify(backup)).ok,true);
  assert.deepEqual(loadInterpretationReferenceHistory(target.storage.gateway),fixture.entries);
  const none=fresh().storage.backup.createBackupSnapshot();
  assert.equal(none.data[key],null);
  assert.equal(target.storage.backup.validateBackupSnapshot(none).canRestore,true);
});
