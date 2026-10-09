import test from 'node:test';
import assert from 'node:assert/strict';
import '../core/internal/platformInfrastructure.js';
import { internalModules } from '../core/internal/modules.js';

const { createStorageGateway, createMemoryStorage } = internalModules.storageGateway;

function adapter(initial, failAt, failMethod) {
  const inner = createMemoryStorage(initial);
  let writes = 0;
  const storage = {
    getItem(key) { return inner.getItem(key); },
    setItem(key, value) {
      inner.setItem(key, value);
      if (failMethod === 'set' && ++writes === failAt) throw Error('write failed after mutation');
    },
    removeItem(key) {
      inner.removeItem(key);
      if (failMethod === 'remove' && ++writes === failAt) throw Error('remove failed after mutation');
    },
  };
  return { inner, gateway: createStorageGateway(storage) };
}

test('failed setItem after mutation restores both prior and failed keys', () => {
  const { inner, gateway } = adapter({first:'1',second:'2'}, 2, 'set');
  const before = inner.dump();
  const result = gateway.transact([{key:'first', value:10}, {key:'second', value:20}]);
  assert.equal(result.ok, false);
  assert.equal(result.committedCount, 1);
  assert.equal(result.rollback.ok, true);
  assert.deepEqual(inner.dump(), before);
});

test('failed setItem after creating a new key removes that key during rollback', () => {
  const { inner, gateway } = adapter({kept:'true'}, 2, 'set');
  const before = inner.dump();
  const result = gateway.transact([{key:'kept', value:false}, {key:'new', value:42}]);
  assert.equal(result.ok, false);
  assert.equal(result.rollback.ok, true);
  assert.deepEqual(inner.dump(), before);
});

test('failed removeItem after deletion restores removed original', () => {
  const { inner, gateway } = adapter({kept:'true',deleted:'7'}, 2, 'remove');
  const before = inner.dump();
  const result = gateway.transact([{key:'kept',remove:true}, {key:'deleted',remove:true}]);
  assert.equal(result.ok, false);
  assert.equal(result.rollback.ok, true);
  assert.deepEqual(inner.dump(), before);
});

test('all failed write positions keep keys unchanged (120 scenarios)', () => {
  for (let size=1;size<=12;size++) {
    for(let pos=1;pos<=size;pos++) {
      const original=Object.fromEntries(Array.from({length:size}, (_,i)=>[`k${i}`, String(i)]));
      const {inner,gateway}=adapter(original,pos,'set');
      const result=gateway.transact(Object.keys(original).map((key,i)=>({key,value:i+100})));
      assert.equal(result.ok,false,`size=${size} position=${pos}`);
      assert.deepEqual(inner.dump(),original,`size=${size} position=${pos}`);
    }
  }
});


test('persistent pre-mutation quota error does not cause a false rollback failure', () => {
  const inner=createMemoryStorage({ first:'1', second:'2' });
  const storage={
    getItem(k) { return inner.getItem(k); },
    removeItem(k) { inner.removeItem(k); },
    setItem(k,v) { if (k==='second') throw Error('persistent quota'); inner.setItem(k,v); },
  };
  const gateway=createStorageGateway(storage);
  const result=gateway.transact([{key:'first',value:3},{key:'second',value:4}]);
  assert.equal(result.ok,false);
  assert.equal(result.rollback.ok,true);
  assert.deepEqual(inner.dump(),{first:'1',second:'2'});
});

test('unrecoverable mutation reports rollback failure rather than success', () => {
  const inner=createMemoryStorage({ original:'1' });
  const storage={
    getItem(k) { return inner.getItem(k); },
    removeItem(k) { inner.removeItem(k); },
    setItem(k,v) { if(k==='original') { inner.setItem(k,v); throw Error('persistent failure'); } inner.setItem(k,v); },
  };
  const gateway=createStorageGateway(storage);
  const result=gateway.transact([{key:'original',value:2}]);
  assert.equal(result.ok,false);
  assert.equal(result.rollback.ok,false);
  assert.equal(result.rollback.failures.length,1);
  assert.equal(inner.getItem('original'),'1');
});
