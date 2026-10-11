import test from 'node:test';
import assert from 'node:assert/strict';
import '../core/internal/platformInfrastructure.js';
import { internalModules } from '../core/internal/modules.js';

const { createMemoryStorage, createStorageGateway } = internalModules.storageGateway;
const { STORAGE_KEYS } = internalModules.storageKeys;
const recovery = STORAGE_KEYS.corruptStorageBackup;
const damaged = STORAGE_KEYS.records;

function encounter(initial) {
  const storage = createMemoryStorage({ [damaged]: '[broken', ...initial });
  const result = createStorageGateway(storage).readJsonResult(damaged, []);
  assert.equal(result.ok, false);
  assert.equal(result.exists, true);
  assert.equal(storage.getItem(damaged), '[broken', 'User original remains unchanged');
  return storage;
}

for (const old of ['{not-json', '{"legacy":true}', 'null', '"unexpected"']) {
  test(`G-01 fails closed rather than overwriting unreadable/rejected recovery bytes: ${old}`, () => {
    const storage = encounter({ [recovery]: old });
    assert.equal(storage.getItem(recovery), old);
  });
}

test('G-01 does not evict 20 existing recovery items when encountering a new damaged value', () => {
  const old = JSON.stringify(Array.from({length:20},(_,n)=>({key:`old-${n}`,rawValue:`snapshot-${n}`})));
  const storage = encounter({ [recovery]: old });
  assert.equal(storage.getItem(recovery), old);
});

test('G-01 duplicate reads do not amplify the identical corrupt evidence log', () => {
  const storage = createMemoryStorage({ [damaged]: '[broken' });
  const gateway = createStorageGateway(storage);
  assert.equal(gateway.readJsonResult(damaged, []).ok, false);
  const first = storage.getItem(recovery);
  assert.equal(gateway.readJsonResult(damaged, []).ok, false);
  assert.equal(storage.getItem(recovery), first);
  assert.equal(JSON.parse(first).length, 1);
});

test('G-01 appends new damaged evidence without discarding a previous readable entry', () => {
  const old = JSON.stringify([{ key:'old', rawValue:'valuable' }]);
  const storage = encounter({ [recovery]: old });
  const next = JSON.parse(storage.getItem(recovery));
  assert.equal(next.length, 2);
  assert.deepEqual(next[0], { key:'old', rawValue:'valuable' });
  assert.equal(next[1].key, damaged);
  assert.equal(next[1].rawValue, '[broken');
});

test('G-01 does not overwrite a concurrent recovery change between the read and append', () => {
  const inner = createMemoryStorage({ [damaged]: '[broken', [recovery]: '[]' });
  let reads = 0;
  const adapter = {
    getItem(key) {
      if (key === recovery && ++reads === 2) {
        inner.setItem(recovery, JSON.stringify([{ key:'other-tab', rawValue:'must-stay' }]));
      }
      return inner.getItem(key);
    },
    setItem: (key, value) => inner.setItem(key, value),
    removeItem: (key) => inner.removeItem(key),
  };
  assert.equal(createStorageGateway(adapter).readJsonResult(damaged, []).ok, false);
  assert.deepEqual(JSON.parse(inner.getItem(recovery)), [{ key:'other-tab', rawValue:'must-stay' }]);
});

test('G-01 refuses to silently rewrite a malformed recovery entry through the same recovery key', () => {
  const storage = createMemoryStorage({ [recovery]: '[broken' });
  assert.equal(createStorageGateway(storage).readJsonResult(recovery, []).ok, false);
  assert.equal(storage.getItem(recovery), '[broken');
});
