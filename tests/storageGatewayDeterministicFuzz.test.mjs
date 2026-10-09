import test from 'node:test';
import assert from 'node:assert/strict';
import '../core/internal/platformInfrastructure.js';
import { internalModules } from '../core/internal/modules.js';
const { createMemoryStorage, createStorageGateway } = internalModules.storageGateway;
function rand(seed) { let x = seed | 0; return () => { x ^= x << 13; x ^= x >>> 17; x ^= x << 5; return (x >>> 0) / 4294967296; }; }
const r = rand(20261009);
const pick = (a) => a[Math.floor(r() * a.length)];

test('seeded 300-case transaction fuzz preserves preflight atomicity and JSON readability', () => {
  const forbidden = [undefined, Symbol('x'), 1n, () => 5];
  const valid = [0, -3, null, false, true, [], {}, '', { user: 'trial' }, [0, null, true], { nested: { number: 1 } }];
  for (let i = 0; i < 300; i++) {
    const store = createMemoryStorage({ kept: '{"original":1}' });
    const gateway = createStorageGateway(store);
    const invalid = i % 3 === 0;
    const a = pick(valid);
    const b = invalid ? pick(forbidden) : pick(valid);
    const result = gateway.transact([{ key: 'kept', value: a }, { key: 'other', value: b }]);
    if (invalid) {
      assert.equal(result.ok, false, `case ${i}`);
      assert.deepEqual(store.dump(), { kept: '{"original":1}' }, `case ${i}`);
      assert.equal(result.committedCount, 0, `case ${i}`);
    } else {
      assert.equal(result.ok, true, `case ${i}`);
      assert.deepEqual(gateway.readJsonResult('kept', null).value, a, `case ${i}`);
      assert.deepEqual(gateway.readJsonResult('other', null).value, b, `case ${i}`);
    }
  }
});

test('seeded 200-case write-failure fault injection restores previous JSON snapshots', () => {
  for (let i = 0; i < 200; i++) {
    const initial = { first: '{"v":1}', second: '[1,2]', third: 'false' };
    const inner = createMemoryStorage(initial);
    const failOn = pick(['first','second','third']);
    let throwOnce = true;
    const target = {
      getItem: k => inner.getItem(k),
      removeItem: k => inner.removeItem(k),
      setItem(k, raw) {
        if (k === failOn && throwOnce) { throwOnce = false; throw new Error('quota_once'); }
        inner.setItem(k, raw);
      },
    };
    const gateway = createStorageGateway(target);
    const result = gateway.transact([
      { key: 'first', value: { v: i } },
      { key: 'second', value: [i] },
      { key: 'third', value: true },
    ]);
    assert.equal(result.ok, false, `case ${i}`);
    assert.equal(result.rollback.ok, true, `case ${i}`);
    assert.deepEqual(inner.dump(), initial, `case ${i}`);
  }
});
