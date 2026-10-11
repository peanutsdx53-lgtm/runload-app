import test from 'node:test';
import assert from 'node:assert/strict';
import '../core/internal/platformInfrastructure.js';
import { internalModules } from '../core/internal/modules.js';

const { createStorageGateway, createMemoryStorage } = internalModules.storageGateway;
const PROBE_KEY = 'runner-load-app-storage-probe-v1';

for (const originallyPresent of [true, false]) {
  test(`G-01 probe does not overwrite another tab after its own probe write (initial key ${originallyPresent ? 'present' : 'absent'})`, () => {
    const inner = createMemoryStorage(originallyPresent ? { [PROBE_KEY]: 'earlier-probe' } : {});
    let reads = 0;
    const adapter = {
      getItem(key) {
        const observed = inner.getItem(key);
        if (key === PROBE_KEY && ++reads === 3) {
          // A second tab edits the key after this read but before restore.
          inner.setItem(key, 'other-tab-value');
        }
        return observed;
      },
      setItem: (key, value) => inner.setItem(key, value),
      removeItem: (key) => inner.removeItem(key),
    };
    const result = createStorageGateway(adapter).probe();
    assert.equal(result.ok, false);
    assert.equal(result.code, 'STORAGE_PROBE_FAILED');
    assert.equal(result.rollback.ok, false);
    assert.equal(result.rollback.failures[0].code, 'STORAGE_ROLLBACK_CONFLICT');
    assert.equal(inner.getItem(PROBE_KEY), 'other-tab-value');
  });
}

test('G-01 normal storage probe restores preexisting bytes', () => {
  const inner = createMemoryStorage({ [PROBE_KEY]: 'original', unrelated: 'safe' });
  assert.equal(createStorageGateway(inner).probe().ok, true);
  assert.deepEqual(inner.dump(), { [PROBE_KEY]: 'original', unrelated: 'safe' });
});

for (const originallyPresent of [true, false]) {
  test(`G-01 probe rejects an intervening change before its write (initial key ${originallyPresent ? 'present' : 'absent'})`, () => {
    const inner = createMemoryStorage(originallyPresent ? { [PROBE_KEY]: 'older-probe' } : {});
    let reads = 0;
    const adapter = {
      getItem(key) {
        const observed = inner.getItem(key);
        if (key === PROBE_KEY && ++reads === 1) {
          // Simulate the second tab modifying the probe key immediately
          // after the preflight snapshot captured its former bytes.
          inner.setItem(key, 'newer-tab-probe');
        }
        return observed;
      },
      setItem: (key, value) => inner.setItem(key, value),
      removeItem: (key) => inner.removeItem(key),
    };
    const result = createStorageGateway(adapter).probe();
    assert.equal(result.ok, false);
    assert.equal(result.code, 'STORAGE_PROBE_CONCURRENT_CHANGE');
    assert.equal(inner.getItem(PROBE_KEY), 'newer-tab-probe');
  });
}
