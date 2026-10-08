import assert from 'node:assert/strict';
import {createApplicationServices,createMemoryStorage,STORAGE_KEYS} from '../core/appCore.js';
const services=createApplicationServices({storage:createMemoryStorage()});
const backup=services.storage.backup;
const original=backup.createBackupSnapshot();
const nullableListKeys=[STORAGE_KEYS.records,STORAGE_KEYS.modelResultsRegionalV2,STORAGE_KEYS.subjectiveFeedback,STORAGE_KEYS.plans,STORAGE_KEYS.courses,STORAGE_KEYS.runMeasurements,STORAGE_KEYS.selfUnderstandingThreads,STORAGE_KEYS.selfInterpretations];
let accepted=[];
for(const key of nullableListKeys){const payload={...original,data:{...original.data,[key]:null}};const test=backup.validateBackupSnapshot(payload);if(test.canRestore)accepted.push(key)}
console.log('NULL_COLLECTION_RESTORE_ACCEPTED='+accepted.length+'/'+nullableListKeys.length);
assert.equal(accepted.length,0,'null must not stand for a complete collection in the current-only backup');
for(const key of nullableListKeys) assert.deepEqual(original.data[key],[],`new backup ${key} must explicitly encode []`);
const valid=backup.validateBackupSnapshot(original);
assert.equal(valid.canRestore,true,'current backup must be restorable');
assert.equal(original.formatVersion,'runner-load-app-new-backup-v2');
const prior={...original,formatVersion:'runner-load-app-new-backup-v1'};
assert.equal(backup.validateBackupSnapshot(prior).canRestore,false,'previous format intentionally unsupported');
for(const key of nullableListKeys){
 const modified={...original,data:{...original.data,[key]:null}};
 assert.equal(backup.restoreBackupText(JSON.stringify(modified)).ok,false,`restore must reject ${key}=null`);
}


const corrupted = createApplicationServices({storage:createMemoryStorage()});
assert.equal(corrupted.storage.gateway.writeJson(STORAGE_KEYS.records,null).ok,true);
const failedExport=corrupted.storage.backup.tryCreateBackupSnapshot();
assert.equal(failedExport.ok,false);
assert.equal(failedExport.code,'BACKUP_SOURCE_COLLECTION_INVALID');
console.log('EXISTING_NULL_STORAGE_BLOCKED=true');
