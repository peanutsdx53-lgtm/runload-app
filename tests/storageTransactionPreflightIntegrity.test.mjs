import test from 'node:test';
import assert from 'node:assert/strict';
import '../core/internal/platformInfrastructure.js';
import { internalModules } from '../core/internal/modules.js';

const { createStorageGateway, createMemoryStorage } = internalModules.storageGateway;

function isolated() {
  const storage = createMemoryStorage({ kept: '{"important":true}' });
  return { storage, gateway: createStorageGateway(storage) };
}

test('transaction rejects missing, blank, and non-string storage keys without mutations', () => {
  const badKeys = [undefined, null, '', ' ', 0, false, {}, Symbol('name')];
  for (const key of badKeys) {
    const { storage, gateway } = isolated();
    const result = gateway.transact([{ key: 'good', value: 1 }, { key, value: { result: 2 } }]);
    assert.equal(result.ok, false, `key: ${String(key)}`);
    assert.equal(result.committedCount, 0);
    assert.deepEqual(storage.dump(), { kept: '{"important":true}' });
  }
});

test('transaction rejects invalid raw JSON before touching earlier values', () => {
  for (const rawValue of ['not-json', '', 'undefined', '{"unclosed":', '[1,]']) {
    const { storage, gateway } = isolated();
    const result = gateway.transact([{ key: 'kept', value: false }, { key: 'new', rawValue }]);
    assert.equal(result.ok, false, `rawValue=${rawValue}`);
    assert.equal(result.committedCount, 0);
    assert.deepEqual(storage.dump(), { kept: '{"important":true}' });
  }
});

test('transaction accepts valid serialized JSON and fully readable values', () => {
  const { storage, gateway } = isolated();
  const result = gateway.transact([{ key: 'kept', value: false }, { key: 'new', rawValue: '{"value":[0,null,true]}' }]);
  assert.equal(result.ok, true);
  assert.equal(storage.getItem('kept'), 'false');
  assert.deepEqual(gateway.readJsonResult('new', null).value, { value: [0, null, true] });
});
