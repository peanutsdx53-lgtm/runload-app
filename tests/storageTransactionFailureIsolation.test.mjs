import test from 'node:test';
import assert from 'node:assert/strict';
import '../core/internal/platformInfrastructure.js';
import { internalModules } from '../core/internal/modules.js';

const { createStorageGateway, createMemoryStorage } = internalModules.storageGateway;

function setup(){
 const storage=createMemoryStorage({original:JSON.stringify({v:1})});
 return {storage,gateway:createStorageGateway(storage)};
}

test('invalid JSON writes never claim success or corrupt the previously readable value',()=>{
 for (const bad of [undefined, ()=>3, Symbol('bad'), 42n]) {
  const {gateway,storage}=setup();
  const result=gateway.writeJson('original',bad);
  assert.equal(result.ok,false,typeof bad);
  assert.equal(result.committedCount,0);
  assert.deepEqual(gateway.readJsonResult('original',null).value,{v:1});
  assert.equal(storage.getItem('original'),' {"v":1}'.trim());
 }
});

test('cyclic JSON data fails closed before any transaction side effect',()=>{
 const {storage,gateway}=setup();
 const value={}; value.self=value;
 const original=storage.dump();
 const result=gateway.transact([{key:'new-key',value:'good'},{key:'original',value}]);
 assert.equal(result.ok,false);
 assert.equal(result.committedCount,0);
 assert.deepEqual(storage.dump(),original);
});

test('invalid changes are rejected without modifying storage',()=>{
 for (const changes of [null,{},[null],[{key:'k',value:undefined}],[{key:'k',value:Symbol('bad')}],[{key:'k',rawValue:undefined}]]) {
  const {storage,gateway}=setup();
  const result=gateway.transact(changes);
  assert.equal(result.ok,false,String(changes));
  assert.equal(result.committedCount,0);
  assert.deepEqual(storage.dump(),{original:'{"v":1}'});
 }
});

test('write succeeds for valid zero, null and false and remains readable',()=>{
 const {gateway}=setup();
 for(const value of [0,null,false,[],{},'']){
  assert.equal(gateway.writeJson('roundtrip',value).ok,true);
  assert.deepEqual(gateway.readJsonResult('roundtrip',99).value,value);
 }
});

test('write failure rolls back earlier keys, leaving every JSON value readable',()=>{
 const inner=createMemoryStorage({first:'{"i":1}',second:'{"i":2}'});
 let trigger=true;
 const storage={getItem:(k)=>inner.getItem(k),removeItem:(k)=>inner.removeItem(k),
  setItem(k,v){if(k==='second'&&trigger){trigger=false;throw new Error('QuotaExceededError')}inner.setItem(k,v)}};
 const gateway=createStorageGateway(storage);
 const result=gateway.transact([{key:'first',value:{i:3}},{key:'second',value:{i:4}}]);
 assert.equal(result.ok,false);
 assert.equal(result.rollback.ok,true);
 assert.equal(result.committedCount,1);
 assert.deepEqual(gateway.readJsonResult('first',null).value,{i:1});
 assert.deepEqual(gateway.readJsonResult('second',null).value,{i:2});
});
