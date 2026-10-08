import assert from 'node:assert/strict';
import test from 'node:test';
import { createApplicationServices, createMemoryStorage, STORAGE_KEYS } from '../core/appCore.js';
import { loadInterpretationReferenceHistory, rememberInterpretationReferenceSelectionResult } from '../ui/interpretationReferenceHistory.js';

function app(storage = createMemoryStorage()) { return createApplicationServices({ storage }); }
function record(id) { return { id, date: '2026-10-08', createdAt:'2026-10-08T10:00:00Z', activityType:'run', distanceKm:5, durationMinutes:30, runningFormat:'CONTINUOUS_RUN', stepsProvenance:'UNKNOWN', course:{name:'監査用',gradeKnowledge:'UNKNOWN',modelSurfaceClass:'UNKNOWN'} }; }
function create(s,id) { const result = s.workflows.records.saveRecordAndFeedback(record(id),{checkStatus:'deferred',bodyAreaObservations:[],safetyFlags:{}}); assert.equal(result.ok,true,JSON.stringify(result)); }
function present(s,id,article) { const result = rememberInterpretationReferenceSelectionResult(s.storage.gateway,{recordId:id,articleId:article}); assert.equal(result.ok,true); }
let checked=0;
function verify(name, fn) { test(name, () => { fn(); checked++; }); }

verify('INT03-01 deleting record removes linked Reading history only', () => {
 const s=app(); create(s,'r1'); create(s,'r2'); present(s,'r1','regional-three-views'); present(s,'r2','context-not-single-cause');
 assert.equal(s.workflows.history.deleteRecord('r1').ok,true);
 assert.deepEqual(loadInterpretationReferenceHistory(s.storage.gateway),[{recordId:'r2',articleId:'context-not-single-cause'}]);
 assert.equal(s.workflows.records.loadExperience('r1'),null);
});
verify('INT03-02 undo restores linked Reading history and original position', () => {
 const s=app(); for(const id of ['r1','r2','r3'])create(s,id);
 for(const [id,art] of [['r1','regional-three-views'],['r2','goals-and-recording-differ'],['r3','context-not-single-cause']])present(s,id,art);
 const before=loadInterpretationReferenceHistory(s.storage.gateway);
 assert.equal(s.workflows.history.deleteRecord('r2').ok,true);
 assert.equal(s.workflows.history.undoDelete().ok,true);
 assert.deepEqual(loadInterpretationReferenceHistory(s.storage.gateway),before);
});
verify('INT03-03 repeated delete of absent record is denied with no mutation', () => {
 const s=app();create(s,'r1');present(s,'r1','regional-three-views');
 assert.equal(s.workflows.history.deleteRecord('r1').ok,true);
 const snapshot=loadInterpretationReferenceHistory(s.storage.gateway);
 assert.equal(s.workflows.history.deleteRecord('r1').ok,false);
 assert.deepEqual(loadInterpretationReferenceHistory(s.storage.gateway),snapshot);
});
verify('INT03-04 deleting record without Reading does not invent Reading history', () => {
 const s=app();create(s,'r1');
 assert.equal(s.workflows.history.deleteRecord('r1').ok,true);
 assert.deepEqual(loadInterpretationReferenceHistory(s.storage.gateway),[]);
 assert.equal(s.storage.gateway.contains(STORAGE_KEYS.readingReferenceHistory),false);
});
verify('INT03-05 malformed Reading JSON refuses deletion without losing record', () => {
 const s=app();create(s,'r1');s.storage.gateway.writeRaw(STORAGE_KEYS.readingReferenceHistory,'{invalid');
 const del=s.workflows.history.deleteRecord('r1');
 assert.equal(del.ok,false);assert.equal(del.code,'HISTORY_SOURCE_READ_FAILED');
 assert.ok(s.workflows.records.loadExperience('r1'));
});
verify('INT03-06 structurally invalid Reading history refuses deletion', () => {
 const s=app();create(s,'r1');s.storage.gateway.writeJson(STORAGE_KEYS.readingReferenceHistory,{version:1,entries:null});
 assert.equal(s.workflows.history.deleteRecord('r1').code,'HISTORY_READING_REFERENCE_INVALID');
 assert.ok(s.workflows.records.loadExperience('r1'));
});
verify('INT03-07 failed history write rolls back record deletion and history', () => {
 const store=createMemoryStorage(); const originalSet=store.setItem.bind(store); let fail=false;
 store.setItem=(key,value)=>{if(fail && key===STORAGE_KEYS.readingReferenceHistory){fail=false;throw new Error('quota');} return originalSet(key,value);};
 const s=app(store);create(s,'r1');present(s,'r1','regional-three-views');
 const before=loadInterpretationReferenceHistory(s.storage.gateway);fail=true;
 const del=s.workflows.history.deleteRecord('r1');
 assert.equal(del.ok,false);assert.equal(del.rollback?.ok,true);
 assert.ok(s.workflows.records.loadExperience('r1'));
 assert.deepEqual(loadInterpretationReferenceHistory(s.storage.gateway),before);
});
verify('INT03-08 failed history write rolls back undo restoration', () => {
 const store=createMemoryStorage(); const originalSet=store.setItem.bind(store);let fail=false;
 store.setItem=(key,value)=>{if(fail && key===STORAGE_KEYS.readingReferenceHistory){fail=false;throw new Error('quota');} return originalSet(key,value);};
 const s=app(store);create(s,'r1');present(s,'r1','regional-three-views');
 assert.equal(s.workflows.history.deleteRecord('r1').ok,true);fail=true;
 const res=s.workflows.history.undoDelete();
 assert.equal(res.ok,false);assert.equal(res.rollback?.ok,true);
 assert.equal(s.workflows.records.loadExperience('r1'),null);
 assert.deepEqual(loadInterpretationReferenceHistory(s.storage.gateway),[]);
 assert.ok(s.workflows.history.loadUndoEntry()?.record?.id==='r1');
});
verify('INT03-09 deletion then re-creation of same ID does not inherit pinned article',()=>{
 const s=app();create(s,'r1');present(s,'r1','regional-three-views');
 assert.equal(s.workflows.history.deleteRecord('r1').ok,true);
 create(s,'r1');assert.deepEqual(loadInterpretationReferenceHistory(s.storage.gateway),[]);
});
verify('INT03-10 unrelated new Reading history survives undo',()=>{
 const s=app();create(s,'r1');create(s,'r2');present(s,'r1','regional-three-views');
 assert.equal(s.workflows.history.deleteRecord('r1').ok,true);present(s,'r2','goals-and-recording-differ');
 assert.equal(s.workflows.history.undoDelete().ok,true);
 assert.deepEqual(loadInterpretationReferenceHistory(s.storage.gateway).map(x=>x.recordId),['r1','r2']);
});
