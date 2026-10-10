import test from 'node:test';
import assert from 'node:assert/strict';
import {
  clearPendingRunMeasurement, commitPendingRunMeasurement,
  peekPendingRunMeasurement, savePendingRunMeasurement,
} from '../ui/runMeasurementState.js';
import { addMobileQuickToolEntry, removeMobileQuickToolEntry } from '../ui/mobileQuickToolsStore.js';

const ROUTES = 'runner-load-app-new-v1-run-measurements-v1';
const QUICK = 'running-record-mobile-quick-tools-v1';
const SESSION = 'runner-load-app-flow-session-v1-run-measurement-v1';
const track = [
  { lat: 35, lon: 139, timestamp: 1000, accuracyM: 5 },
  { lat: 35.0002, lon: 139.0002, timestamp: 2000, accuracyM: 5 },
];
const initialQuick = () => ({version:1,locationNotes:[],quickNotes:[],gearNotes:[],departureChecks:[{id:'archive-one',createdAt:'2026-10-09T00:00:00Z',note:'old'}],fuelNotes:[]});

function memoryStorage(initial = {}) {
 const data = new Map(Object.entries(initial));
 return {getItem:(key)=> data.has(key)?data.get(key):null, setItem:(key,value)=>data.set(key,String(value)),removeItem:(key)=>data.delete(key),data};
}
function deniedStorage(mode) {
 const stored = memoryStorage();
 return {getItem(key) {if(mode==='read')throw new DOMException('not allowed','SecurityError');return stored.getItem(key);},
 setItem(key,value){if(mode==='write')throw new DOMException('quota','QuotaExceededError');stored.setItem(key,value);},
 removeItem(key){stored.removeItem(key);},data:stored.data};
}
function withStorage(local, session, callback) {
 const oldLocal=Object.getOwnPropertyDescriptor(globalThis,'localStorage');
 const oldSession=Object.getOwnPropertyDescriptor(globalThis,'sessionStorage');
 try {
  if (local === 'deny-getter') Object.defineProperty(globalThis,'localStorage',{configurable:true,get(){throw new DOMException('denied','SecurityError');}});
  else if (local === 'missing') Reflect.deleteProperty(globalThis,'localStorage');
  else Object.defineProperty(globalThis,'localStorage',{configurable:true,value:local,writable:true});
  Object.defineProperty(globalThis,'sessionStorage',{configurable:true,value:session,writable:true});
  return callback();
 } finally {
  if(oldLocal)Object.defineProperty(globalThis,'localStorage',oldLocal);else Reflect.deleteProperty(globalThis,'localStorage');
  if(oldSession)Object.defineProperty(globalThis,'sessionStorage',oldSession);else Reflect.deleteProperty(globalThis,'sessionStorage');
 }
}
function stagePending() {
 assert.equal(savePendingRunMeasurement({runId:'g01-synthetic',distanceKm:2,durationMinutes:20,track,saveRoute:true}).ok,true);
 assert.equal(peekPendingRunMeasurement()?.runId,'g01-synthetic');
}

test('G-01: malformed route archive cannot be overwritten on commit and pending remains retryable',()=>{
 const corrupt='[{"id":"original-route"}, !! not-json';
 withStorage(memoryStorage({[ROUTES]:corrupt}),memoryStorage(),()=>{
  stagePending();const result=commitPendingRunMeasurement('new-record');
  assert.equal(result.ok,false);assert.equal(result.saved,false);
  assert.equal(globalThis.localStorage.getItem(ROUTES),corrupt);
  assert.equal(peekPendingRunMeasurement()?.runId,'g01-synthetic');
 });
});
test('G-01: valid JSON nonarray and object archives cannot be replaced by empty route list',()=>{
 for(const corrupt of ['{}','null','{"legacy":true}','"text"']) {
  withStorage(memoryStorage({[ROUTES]:corrupt}),memoryStorage(),()=>{
   stagePending();const result=commitPendingRunMeasurement('new-record');
   assert.equal(result.ok,false,corrupt);assert.equal(globalThis.localStorage.getItem(ROUTES),corrupt);assert.ok(peekPendingRunMeasurement());
  });
 }
});
test('G-01: denied persistent route storage or inaccessible getter never reports a saved GPS trace',()=>{
 for(const mode of [deniedStorage('read'),'deny-getter','missing']) {
  withStorage(mode,memoryStorage(),()=>{
   stagePending();const result=commitPendingRunMeasurement('new-record');
   assert.equal(result.ok,false);assert.equal(result.saved,false);assert.ok(peekPendingRunMeasurement());
  });
 }
});
test('G-01: route write failure retains both prior archive bytes and pending measurement',()=>{
 const original='[{"recordId":"old-record","track":[{"lat":35,"lon":139}]}]';
 const fail=deniedStorage('write');fail.data.set(ROUTES,original);
 withStorage(fail,memoryStorage(),()=>{
  stagePending();const result=commitPendingRunMeasurement('new-record');
  assert.equal(result.ok,false);assert.equal(fail.getItem(ROUTES),original);assert.ok(peekPendingRunMeasurement());
 });
});
test('G-01: healthy route archive appends GPS trace and clears pending after persistence',()=>{
 const existing=JSON.stringify([{recordId:'archived',track}]);
 withStorage(memoryStorage({[ROUTES]:existing}),memoryStorage(),()=>{
  stagePending();const result=commitPendingRunMeasurement('new-record');
  assert.equal(result.ok,true);assert.equal(result.saved,true);
  const saved=JSON.parse(globalThis.localStorage.getItem(ROUTES));
  assert.equal(saved.length,2);assert.equal(saved[0].recordId,'archived');assert.equal(saved[1].recordId,'new-record');
  assert.equal(peekPendingRunMeasurement(),null);
 });
});
test('G-01: corrupt quick-tool archive is not rewritten when adding a departure check',()=>{
 for(const corrupt of ['not-json','null','{"version":2,"departureChecks":[]}','{"version":1,"departureChecks":{}}']) {
  withStorage(memoryStorage({[QUICK]:corrupt}),memoryStorage(),()=>{
   assert.equal(addMobileQuickToolEntry('departure',{note:'new'}),null);
   assert.equal(globalThis.localStorage.getItem(QUICK),corrupt);
  });
 }
});
test('G-01: denied quick-tool storage prevents false successful save and leaves original record',()=>{
 const previous=JSON.stringify(initialQuick());
 for(const mode of [deniedStorage('read'),'deny-getter','missing']) {
  if(typeof mode==='object')mode.data.set(QUICK,previous);
  withStorage(mode,memoryStorage(),()=>{
   assert.equal(addMobileQuickToolEntry('departure',{note:'new'}),null);
   if(typeof mode==='object'&&mode.data.has(QUICK))assert.equal(mode.data.get(QUICK),previous);
  });
 }
});
test('G-01: healthy quick-tool add and remove preserve pre-existing entries',()=>{
 withStorage(memoryStorage({[QUICK]:JSON.stringify(initialQuick())}),memoryStorage(),()=>{
  const added=addMobileQuickToolEntry('departure',{note:'new'});assert.ok(added?.id);
  let saved=JSON.parse(globalThis.localStorage.getItem(QUICK));
  assert.equal(saved.departureChecks.length,2);assert.equal(saved.departureChecks[1].id,'archive-one');
  assert.equal(removeMobileQuickToolEntry('departure',added.id),true);
  saved=JSON.parse(globalThis.localStorage.getItem(QUICK));
  assert.deepEqual(saved.departureChecks,initialQuick().departureChecks);
 });
});

test('G-01: valid unversioned historical memo collections remain addable without loss',()=>{
 const old=JSON.stringify({quickNotes:[{id:'earlier',note:'original'}],departureChecks:[{id:'saved',checks:['keys']}],extra:{custom:'retained'}});
 withStorage(memoryStorage({[QUICK]:old}),memoryStorage(),()=>{
  assert.ok(addMobileQuickToolEntry('departure',{note:'fresh'}));
  const state=JSON.parse(globalThis.localStorage.getItem(QUICK));
  assert.equal(state.version,1);assert.deepEqual(state.quickNotes,[{id:'earlier',note:'original'}]);
  assert.deepEqual(state.extra,{custom:'retained'});assert.equal(state.departureChecks[1].id,'saved');
 });
});
