import test from 'node:test';
import assert from 'node:assert/strict';
import { createApplicationServices, createMemoryStorage, STORAGE_KEYS } from '../core/appCore.js';

function deepObject(depth) {
  const value = {};
  let cursor = value;
  for (let index = 0; index < depth; index += 1) {
    cursor.next = {};
    cursor = cursor.next;
  }
  cursor.number = 42;
  return value;
}

function fixture(depth) {
  const raw = JSON.stringify(deepObject(depth));
  const storage = createMemoryStorage({ [STORAGE_KEYS.settings]: raw });
  const backup = createApplicationServices({ storage }).storage.backup;
  return { raw, storage, backup };
}

test('deep local settings must block backup without uncaught RangeError or storage mutation', () => {
  const { raw, storage, backup } = fixture(3500);
  let result;
  assert.doesNotThrow(() => { result = backup.tryExportBackupText(); });
  assert.equal(result.ok, false);
  assert.equal(result.code, 'BACKUP_EXPORT_SOURCE_INVALID');
  assert.ok(result.issues?.some((issue) => issue.code === 'JSON_TOO_DEEP'));
  assert.equal(storage.getItem(STORAGE_KEYS.settings), raw);
});

test('direct snapshot validator rejects overly deep and cyclic structures without throwing', () => {
  const backup = createApplicationServices({ storage: createMemoryStorage() }).storage.backup;
  const source = backup.createBackupSnapshot();
  const deep = { ...source, data: { ...source.data, [STORAGE_KEYS.settings]: deepObject(3500) } };
  const inspection = backup.validateBackupSnapshot(deep);
  assert.equal(inspection.canRestore, false);
  assert.ok(inspection.issues.some((issue) => issue.code === 'JSON_TOO_DEEP'));
  const cycle = {}; cycle.self = cycle;
  const cyclicInspection = backup.validateBackupSnapshot({ ...source, data: { ...source.data, [STORAGE_KEYS.settings]: cycle } });
  assert.equal(cyclicInspection.canRestore, false);
  assert.ok(cyclicInspection.issues.some((issue) => issue.code === 'JSON_TOO_DEEP'));
});

test('ordinary current settings and a near-limit noncyclic value remain exportable', () => {
  const { backup } = fixture(38);
  const result = backup.tryExportBackupText();
  assert.equal(result.ok, true);
  const inspection = backup.inspectBackupText(result.text);
  assert.equal(inspection.canRestore, true);
});
