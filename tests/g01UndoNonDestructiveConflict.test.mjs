import test from 'node:test';
import assert from 'node:assert/strict';
import {createApplicationServices,createMemoryStorage,STORAGE_KEYS} from '../core/appCore.js';
import {rememberInterpretationReferenceSelectionResult} from '../ui/interpretationReferenceHistory.js';
const feedback={checkStatus:'deferred',bodyAreaObservations:[],safetyFlags:{}};
const sample=(id,comment)=>({id,date:'2026-10-08',createdAt:'2026-10-08T07:00:00Z',activityType:'run',distanceKm:5,durationMinutes:30,runningFormat:'CONTINUOUS_RUN',stepsProvenance:'UNKNOWN',reflectionContext:{postRunReflection:comment},course:{gradeKnowledge:'UNKNOWN',modelSurfaceClass:'UNKNOWN'}});
const app=()=>createApplicationServices({storage:createMemoryStorage()});
function save(s,id,comment='original'){const r=s.workflows.records.saveRecordAndFeedback(sample(id,comment),feedback);assert.equal(r.ok,true,JSON.stringify(r));}
function pin(s,id){const r=rememberInterpretationReferenceSelectionResult(s.storage.gateway,{recordId:id,articleId:'regional-three-views'});assert.equal(r.ok,true,JSON.stringify(r));}

test('G-01 undo must not replace a newly saved record using the same ID',()=>{
 const s=app();save(s,'collision','original');pin(s,'collision');
 assert.equal(s.workflows.history.deleteRecord('collision').ok,true);
 save(s,'collision','newly-entered-data');
 const before=s.storage.backup.createBackupSnapshot();
 const undoBefore=s.storage.gateway.readJson(STORAGE_KEYS.historyUndo,null);
 const result=s.workflows.history.undoDelete();
 assert.equal(result.ok,false,'undo must not silently overwrite post-deletion record');
 assert.equal(result.code,'HISTORY_UNDO_RECORD_CONFLICT');
 assert.deepEqual(s.storage.backup.createBackupSnapshot().data,before.data);
 assert.deepEqual(s.storage.gateway.readJson(STORAGE_KEYS.historyUndo,null),undoBefore);
});

test('G-01 undo must not evict an unrelated Reading entry when history is full',()=>{
 const s=app();for(let i=0;i<24;i++){save(s,'record-'+i);pin(s,'record-'+i);}
 const beforeDelete=s.storage.gateway.readJson(STORAGE_KEYS.readingReferenceHistory,null);
 assert.equal(beforeDelete.entries.length,24);
 const deletionId=beforeDelete.entries[1].recordId;
 assert.equal(s.workflows.history.deleteRecord(deletionId).ok,true);
 save(s,'new-after-delete');pin(s,'new-after-delete');
 const full=s.storage.gateway.readJson(STORAGE_KEYS.readingReferenceHistory,null);
 assert.equal(full.entries.length,24);
 const backup=s.storage.backup.createBackupSnapshot();
 const undoBefore=s.storage.gateway.readJson(STORAGE_KEYS.historyUndo,null);
 const result=s.workflows.history.undoDelete();
 assert.equal(result.ok,false,'undo may not silently discard any of the 24 Reading entries');
 assert.equal(result.code,'HISTORY_UNDO_READING_HISTORY_FULL');
 assert.deepEqual(s.storage.gateway.readJson(STORAGE_KEYS.readingReferenceHistory,null),full);
 assert.deepEqual(s.storage.gateway.readJson(STORAGE_KEYS.historyUndo,null),undoBefore);
 assert.deepEqual(s.storage.backup.createBackupSnapshot().data,backup.data);
});
