import test from 'node:test';
import assert from 'node:assert/strict';
import {createApplicationServices,createMemoryStorage,STORAGE_KEYS} from '../core/appCore.js';
function createWithDraft(draft){
 const services=createApplicationServices({storage:createMemoryStorage()});
 assert.equal(services.storage.gateway.writeJson(STORAGE_KEYS.draft,draft).ok,true);
 return services.storage.backup;
}
test('ordinary backup remains restorable after pretty-printing',()=>{
 const backup=createWithDraft({comment:'正常なメモ'});
 const exported=backup.tryExportBackupText();
 assert.equal(exported.ok,true,exported.code);
 const inspected=backup.inspectBackupText(exported.text);
 assert.equal(inspected.canRestore,true,JSON.stringify(inspected.issues));
});
test('oversize export is rejected at the same byte limit as import',()=>{
 const backup=createWithDraft({comment:'a'.repeat(17*1024*1024)});
 const exported=backup.tryExportBackupText();
 assert.equal(exported.ok,false);
 assert.equal(exported.code,'BACKUP_EXPORT_TOO_LARGE');
 assert.equal(exported.details.maximumBytes,16*1024*1024);
 assert.ok(exported.details.bytes>exported.details.maximumBytes);
 assert.throws(()=>backup.exportBackupText(),(e)=>e.code==='BACKUP_EXPORT_TOO_LARGE');
});
test('UTF-8 multi-byte characters count toward export threshold',()=>{
 const backup=createWithDraft({comment:'あ'.repeat(6*1024*1024)});
 const result=backup.tryExportBackupText();
 assert.equal(result.ok,false);
 assert.equal(result.code,'BACKUP_EXPORT_TOO_LARGE');
});
test('rejected oversized export does not modify storage',()=>{
 const draft={comment:'A'.repeat(17*1024*1024)};
 const storage=createMemoryStorage();
 const services=createApplicationServices({storage});
 services.storage.gateway.writeJson(STORAGE_KEYS.draft,draft);
 const before=services.storage.gateway.readJson(STORAGE_KEYS.draft,null);
 const result=services.storage.backup.tryExportBackupText();
 assert.equal(result.ok,false);
 const after=services.storage.gateway.readJson(STORAGE_KEYS.draft,null);
 assert.deepEqual(after,before);
});
test('corrupted GPS source cannot produce an unusable backup file',()=>{
  const services=createApplicationServices({storage:createMemoryStorage()});
  const key=STORAGE_KEYS.runMeasurements;
  const invalid=[{recordId:'missing-record',track:[]}];
  assert.equal(services.storage.gateway.writeJson(key,invalid).ok,true);
  const exported=services.storage.backup.tryExportBackupText();
  assert.equal(exported.ok,false);
  assert.equal(exported.code,'BACKUP_EXPORT_SOURCE_INVALID');
  assert.ok(exported.issues.some(issue=>issue.code==='RUN_MEASUREMENT_RECORD_MISSING'));
  assert.throws(()=>services.storage.backup.exportBackupText(),error=>error.code==='BACKUP_EXPORT_SOURCE_INVALID');
  assert.deepEqual(services.storage.gateway.readJson(key,[]),invalid);
});
