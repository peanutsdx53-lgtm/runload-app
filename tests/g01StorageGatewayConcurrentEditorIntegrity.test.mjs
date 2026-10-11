import test from 'node:test';
import assert from 'node:assert/strict';
import '../core/internal/platformInfrastructure.js';
import { internalModules } from '../core/internal/modules.js';
const { createStorageGateway, createMemoryStorage } = internalModules.storageGateway;

test('G01 preflight detects a second-tab key edit before any overwrite', () => {
  const inner = createMemoryStorage({ a: '1', b: '2' });
  let reads = 0;
  const storage = {
    getItem(key) {
      if (key === 'a' && ++reads === 2) inner.setItem('a', 'another-tab');
      return inner.getItem(key);
    },
    setItem: (k, v) => inner.setItem(k, v),
    removeItem: (k) => inner.removeItem(k),
  };
  const result = createStorageGateway(storage).transact([{ key:'a', value:42 },{key:'b',value:43}]);
  assert.equal(result.ok,false);
  assert.equal(result.code,'STORAGE_TRANSACTION_CONCURRENT_CHANGE');
  assert.deepEqual(inner.dump(),{a:'another-tab',b:'2'});
});

test('G01 failed multi-key write does not destroy a concurrent editor during rollback', () => {
  const inner=createMemoryStorage({ a:'1', b:'2'});
  let changed=false;
  const storage={
    getItem:k=>inner.getItem(k),
    setItem(k,v){
      if(k==='b') { inner.setItem('a','another-tab'); changed=true; throw Error('quota'); }
      inner.setItem(k,v);
    },
    removeItem:k=>inner.removeItem(k),
  };
  const result=createStorageGateway(storage).transact([{key:'a',value:100},{key:'b',value:200}]);
  assert.equal(changed,true);
  assert.equal(result.ok,false);
  assert.equal(result.rollback.ok,false);
  assert.equal(result.rollback.failures[0].code,'STORAGE_ROLLBACK_CONFLICT');
  assert.deepEqual(inner.dump(),{a:'another-tab',b:'2'});
});
