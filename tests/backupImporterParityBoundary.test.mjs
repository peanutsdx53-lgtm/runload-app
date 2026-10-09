import test from 'node:test';
import assert from 'node:assert/strict';
import { createApplicationServices, createMemoryStorage, STORAGE_KEYS } from '../core/appCore.js';

function deepStructure(levels) {
  const root = {};
  let current = root;
  for (let i = 0; i < levels; i++) {
    current.next = {};
    current = current.next;
  }
  current.value = 7;
  return root;
}

function setupWithSettings(value) {
  const raw = JSON.stringify(value);
  const storage = createMemoryStorage({ [STORAGE_KEYS.settings]: raw });
  return { raw, storage, backup: createApplicationServices({ storage }).storage.backup };
}

test('export must not succeed for depth 62-63 if importer rejects the full envelope', () => {
  for (const levels of [62, 63]) {
    const { raw, storage, backup } = setupWithSettings(deepStructure(levels));
    const result = backup.tryExportBackupText();
    assert.equal(result.ok, false, `export accepted unreadable depth ${levels}`);
    assert.equal(result.code, 'BACKUP_EXPORT_SOURCE_INVALID');
    assert.ok(result.issues.some((issue) => issue.code === 'JSON_TOO_DEEP'));
    assert.equal(storage.getItem(STORAGE_KEYS.settings), raw);
  }
});

test('export must refuse importer-invalid long strings and unsafe object keys', () => {
  const cases = [
    { value: { note: 'x'.repeat(2 * 1024 * 1024 + 1) }, code: 'JSON_STRING_TOO_LONG' },
    { value: JSON.parse('{"constructor":{"note":"do not restore"}}'), code: 'JSON_DANGEROUS_KEY' },
  ];
  for (const { value, code } of cases) {
    const { raw, storage, backup } = setupWithSettings(value);
    const exported = backup.tryExportBackupText();
    assert.equal(exported.ok, false, `${code} unexpectedly exported`);
    assert.equal(exported.code, 'BACKUP_EXPORT_SOURCE_INVALID');
    assert.ok(exported.issues.some((issue) => issue.code === code));
    assert.equal(storage.getItem(STORAGE_KEYS.settings), raw);
  }
});

test('valid near-boundary nested JSON remains exportable and round-trip inspectable', () => {
  for (const levels of [0, 40, 60, 61]) {
    const { backup } = setupWithSettings(deepStructure(levels));
    const exported = backup.tryExportBackupText();
    assert.equal(exported.ok, true, `valid depth ${levels} rejected: ${exported.code}`);
    assert.equal(backup.inspectBackupText(exported.text).canRestore, true);
  }
});

test('automatic pre-restore backup refuses unusable source without changing stored user data', () => {
  const { raw, storage, backup } = setupWithSettings(deepStructure(62));
  const incoming = createApplicationServices({ storage: createMemoryStorage() }).storage.backup.createBackupSnapshot();
  const attempt = backup.restoreBackupText(JSON.stringify(incoming));
  assert.equal(attempt.ok, false);
  assert.equal(attempt.code, 'PRE_RESTORE_BACKUP_FAILED');
  assert.equal(attempt.cause.code, 'BACKUP_EXPORT_SOURCE_INVALID');
  assert.equal(storage.getItem(STORAGE_KEYS.settings), raw);
  assert.equal(storage.getItem(STORAGE_KEYS.backups), null);
});
