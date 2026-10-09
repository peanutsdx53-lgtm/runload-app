import test from 'node:test';
import assert from 'node:assert/strict';
import '../core/internal/platformInfrastructure.js';
import { internalModules } from '../core/internal/modules.js';

const { createStorageGateway, createMemoryStorage } = internalModules.storageGateway;

function fixture() {
  const storage = createMemoryStorage({ existing: '{"distance":10}' });
  return { gateway: createStorageGateway(storage), storage };
}

test('non-finite numbers must not silently become null in JSON storage', () => {
  const invalid = [NaN, Infinity, -Infinity, { pace: Infinity },
    { details: { load: NaN } }, [1, NaN], { values: [0, -Infinity] },
    { toJSON() { return Infinity; } }];
  for (const value of invalid) {
    const { gateway, storage } = fixture();
    const result = gateway.transact([
      { key: 'existing', value: { distance: 20 } },
      { key: 'new', value },
    ]);
    assert.equal(result.ok, false, String(value));
    assert.equal(result.committedCount, 0);
    assert.deepEqual(storage.dump(), { existing: '{"distance":10}' });
  }
});

test('raw JSON with overflowing number must be rejected atomically', () => {
  for (const rawValue of ['1e400', '-1e400', '[0, 1e400]', '{"values":{"pace":1e400}}']) {
    const { gateway, storage } = fixture();
    const result = gateway.transact([
      { key: 'existing', value: 0 },
      { key: 'new', rawValue },
    ]);
    assert.equal(result.ok, false, rawValue);
    assert.equal(result.committedCount, 0);
    assert.deepEqual(storage.dump(), { existing: '{"distance":10}' });
  }
});

test('finite numbers and meaningful null, false, zero remain valid', () => {
  const { gateway } = fixture();
  for (const [key, value] of [
    ['zero', 0], ['false', false], ['null', null],
    ['finite', { pace: -12.5, distance: 1e308, status: null, zero: 0 }],
    ['raw', undefined],
  ]) {
    const result = key === 'raw'
      ? gateway.transact([{ key, rawValue: '{"value":1e308}' }])
      : gateway.writeJson(key, value);
    assert.equal(result.ok, true, key);
    const loaded = gateway.readJsonResult(key, null);
    assert.equal(loaded.ok, true, key);
    assert.equal(loaded.exists, true, key);
    if (key === 'raw') assert.deepEqual(loaded.value, { value: 1e308 });
    else assert.deepEqual(loaded.value, value);
  }
});
