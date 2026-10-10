import test from 'node:test';
import assert from 'node:assert/strict';
import { createApplicationServices, createMemoryStorage, STORAGE_KEYS } from '../core/appCore.js';

const make = () => ({ id:'g01-preservation', date:'2026-10-10', createdAt:'2026-10-10T00:00:00.000Z',
 activityType:'run', distanceKm:5, durationMinutes:30, runningFormat:'CONTINUOUS_RUN',stepsProvenance:'UNKNOWN',
 course:{gradeKnowledge:'UNKNOWN',modelSurfaceClass:'UNKNOWN'} });
const feedback = {checkStatus:'deferred',bodyAreaObservations:[],safetyFlags:{}};

function fixture(){
 const inner=createMemoryStorage();
 const app=createApplicationServices({storage:inner});
 assert.equal(app.workflows.records.saveRecordAndFeedback(make(), feedback).ok,true);
 const original=app.storage.backup.tryExportBackupText();
 assert.equal(original.ok,true,JSON.stringify(original));
 const incoming=structuredClone(original.snapshot);
 incoming.data[STORAGE_KEYS.draft]={comment:'restored independent user draft'};
 assert.equal(app.storage.backup.validateBackupSnapshot(incoming).canRestore,true);
 return { original, incoming, baseline:inner.dump() };
}

function adapter(initial, failAt, style){
 const inner=createMemoryStorage(initial);let writes=0;let injected=false;
 const onWrite=(key,action)=>{
   writes++;
   if(!injected && writes===failAt && style==='before') { injected=true;throw Error('quota-before'); }
   action();
   if(!injected && writes===failAt && style==='after') { injected=true;throw Error('quota-after'); }
 };
 return {
  raw:inner,
  storage:{getItem:key=>inner.getItem(key),setItem:(key,value)=>onWrite(key,()=>inner.setItem(key,value)),removeItem:key=>onWrite(key,()=>inner.removeItem(key))},
  injected:()=>injected,
 };
}

test('G-01 all restore write stages restore exactly prior bytes for pre- and post-mutation failures',()=>{
 const source=fixture();
 // USER_DATA 19 keys, history undo and automatic pre-restore backup key.
 const stages=Object.keys(source.incoming.data).length+2;
 assert.equal(stages,21);
 let injectedCount=0;
 for(const style of ['before','after']){
   for(let at=1;at<=stages;at++){
     const wrap=adapter(source.baseline,at,style);
     const app=createApplicationServices({storage:wrap.storage});
     const result=app.storage.backup.restoreBackupText(JSON.stringify(source.incoming));
     assert.equal(wrap.injected(),true,`not injected at ${at}/${style}`);
     assert.equal(result.ok,false,`unexpected success at ${at}/${style}`);
     assert.equal(result.rollback?.ok,true,`rollback failed at ${at}/${style}: ${JSON.stringify(result)}`);
     assert.deepEqual(wrap.raw.dump(),source.baseline,`mutated bytes at ${at}/${style}`);
     injectedCount++;
   }
 }
 assert.equal(injectedCount,42);
});

test('G-01 successful restore creates a valid pre-restore backup and keeps result provenance',()=>{
 const source=fixture();const storage=createMemoryStorage(source.baseline);const app=createApplicationServices({storage});
 const result=app.storage.backup.restoreBackupText(JSON.stringify(source.incoming));
 assert.equal(result.ok,true,JSON.stringify(result));
 const restored=app.storage.backup.createBackupSnapshot();
 assert.deepEqual(restored.data[STORAGE_KEYS.draft],source.incoming.data[STORAGE_KEYS.draft]);
 assert.equal(app.storage.backup.validateBackupSnapshot(restored).canRestore,true);
 const history=app.storage.gateway.readJson(STORAGE_KEYS.backups,[]);
 assert.equal(history.length,1);
 assert.deepEqual(history[0].snapshot.data,source.original.snapshot.data);
 assert.equal(app.storage.backup.validateBackupSnapshot(history[0].snapshot).canRestore,true);
});

test('G-01 malformed or unsupported incoming copies cannot mutate any storage key',()=>{
 const source=fixture(); const base=source.incoming;
 const invalid=[
  null,
  {...base,formatVersion:'runner-load-app-new-backup-v1'},
  {...base,data:{...base.data,[STORAGE_KEYS.records]:null}},
  {...base,data:{...base.data,unexpected:[]}},
  {...base,data:{...base.data,[STORAGE_KEYS.records]:[{id:'orphan'}]}},
  {...base,data:{...base.data,[STORAGE_KEYS.modelResultsRegionalV2]:[{record_id:'missing',model_version:'x'}]}},
  {...base,data:{...base.data,[STORAGE_KEYS.readingReferenceHistory]:{version:'invalid',entries:[{recordId:'missing',articleId:'x'}]}}},
 ];
 for(const bad of invalid){
   const storage=createMemoryStorage(source.baseline),app=createApplicationServices({storage});
   const result=app.storage.backup.restoreBackupText(JSON.stringify(bad));
   assert.equal(result.ok,false,`unexpected accept ${JSON.stringify(bad).slice(0,150)}`);
   assert.deepEqual(storage.dump(),source.baseline);
 }
});
