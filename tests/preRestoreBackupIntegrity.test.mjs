import test from 'node:test';
import assert from 'node:assert/strict';
import { createApplicationServices, createMemoryStorage, STORAGE_KEYS } from '../core/appCore.js';

function setup(){
  const services = createApplicationServices({ storage: createMemoryStorage() });
  return { backup: services.storage.backup, gateway: services.storage.gateway };
}

test('valid source is archived as restorable backup before restoring a new snapshot', () => {
  const { backup, gateway }=setup();
  const original=backup.createBackupSnapshot();
  assert.equal(gateway.writeJson(STORAGE_KEYS.draft, {comment:'old'}).ok,true);
  const result=backup.restoreBackupText(JSON.stringify(original));
  assert.equal(result.ok,true,result.code);
  const auto=gateway.readJson(STORAGE_KEYS.backups,[]);
  assert.equal(auto.length,1);
  assert.equal(auto[0].snapshot.data[STORAGE_KEYS.draft].comment,'old');
  assert.equal(backup.validateBackupSnapshot(auto[0].snapshot).canRestore,true);
});

test('orphan measurement corrupt source rejects restore without erasing current data',()=>{
  const {backup,gateway}=setup();
  const incoming=backup.createBackupSnapshot();
  const orphan=[{recordId:'missing-record',track:[]}];
  gateway.writeJson(STORAGE_KEYS.runMeasurements,orphan);
  const result=backup.restoreBackupText(JSON.stringify(incoming));
  assert.equal(result.ok,false);
  assert.equal(result.code,'PRE_RESTORE_BACKUP_FAILED');
  assert.equal(result.cause.code,'BACKUP_EXPORT_SOURCE_INVALID');
  assert.deepEqual(gateway.readJson(STORAGE_KEYS.runMeasurements,[]),orphan);
  assert.deepEqual(gateway.readJson(STORAGE_KEYS.backups,[]),[]);
});

test('oversize source cannot be saved as automatic pre-restore backup',()=>{
  const {backup,gateway}=setup();
  const incoming=backup.createBackupSnapshot();
  const old={comment:'あ'.repeat(6*1024*1024)};
  gateway.writeJson(STORAGE_KEYS.draft,old);
  const result=backup.restoreBackupText(JSON.stringify(incoming));
  assert.equal(result.ok,false);
  assert.equal(result.code,'PRE_RESTORE_BACKUP_FAILED');
  assert.equal(result.cause.code,'BACKUP_EXPORT_TOO_LARGE');
  assert.deepEqual(gateway.readJson(STORAGE_KEYS.draft,{}),old);
  assert.deepEqual(gateway.readJson(STORAGE_KEYS.backups,[]),[]);
});

test('missing old data can be archived and a new backup safely restored',()=>{
  const {backup,gateway}=setup();
  const first=backup.createBackupSnapshot();
  gateway.writeJson(STORAGE_KEYS.settings,{preferredUnit:'km'});
  const result=backup.restoreBackupText(JSON.stringify(first));
  assert.equal(result.ok,true);
  const saved=gateway.readJson(STORAGE_KEYS.backups,[])[0]?.snapshot;
  assert.equal(backup.validateBackupSnapshot(saved).canRestore,true);
});
