import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { writeMobileHomeJson, writeMobileHomeBatch } from '../ui/mobileHomeGridUtilities.js';

const keys = {
  positions: 'running-record-mobile-home-positions-v1',
  layout: 'running-record-mobile-home-layout-v1',
  widgets: 'running-record-mobile-home-widgets-v1',
};
const values = {
  positions: {version: 1, pages: [[{token: 'app:record', row: 1, col: 1}]]},
  layout: {version: 3, pages: [['app:record']], dock: ['history'], activePage: 0},
  widgets: {version: 2, order: ['today'], visible: ['today'], sizes: {today: 'medium'}, pageById: {today: 0}},
};
function withStore(initial, exercise, options={}) {
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  const data = new Map(Object.entries(initial));
  const writes=[];
  const store = {
    getItem(key) {
      if (options.readFailure) throw new Error('SecurityError');
      return data.has(key) ? data.get(key) : null;
    },
    setItem(key, value) {
      writes.push(key);
      if (options.failAt === writes.length) throw new Error('QuotaExceededError');
      data.set(key, String(value));
    },
    removeItem(key) { data.delete(key); },
  };
  Object.defineProperty(globalThis,'localStorage',{configurable:true,value:store});
  try {return exercise({data,writes,store});}
  finally {if (previous) Object.defineProperty(globalThis,'localStorage',previous);else delete globalThis.localStorage;}
}

for (const [name,key] of Object.entries(keys)) {
  for (const bad of ['{"unfinished":', '[]', 'null', '{"pages":12,"dock":[]}', '{"order":"today"}']) {
    test(`G01 alternate ${name}: protect original malformed ${bad}`, () => withStore({[key]:bad}, ({data,writes})=>{
      const approved=writeMobileHomeJson(key, values[name]);
      assert.equal(approved,false);
      assert.equal(data.get(key),bad);
      assert.equal(writes.length,0);
    }));
  }
  test(`G01 alternate ${name}: denied read cannot write`,()=>withStore({[key]:JSON.stringify(values[name])},({data,writes})=>{
    assert.equal(writeMobileHomeJson(key,values[name]),false);
    assert.equal(writes.length,0);
  },{readFailure:true}));
  test(`G01 alternate ${name}: valid legacy and first use save`,()=>{
    for (const raw of [null,JSON.stringify(values[name])]) withStore(raw===null?{}:{[key]:raw},({data})=>{
      assert.equal(writeMobileHomeJson(key,values[name]),true);
      assert.deepEqual(JSON.parse(data.get(key)),values[name]);
    });
  });
}

test('G01 alternate: multi-key batch validates all keys before its first mutation',()=>{
  const raw='{"damaged":';
  withStore({[keys.widgets]:raw},({data,writes})=>{
    const saved=writeMobileHomeBatch(Object.entries(keys).map(([name,key])=>[key,values[name]]));
    assert.equal(saved,false);
    assert.equal(writes.length,0);
    assert.equal(data.get(keys.widgets),raw);
    assert.equal(data.has(keys.layout),false);
    assert.equal(data.has(keys.positions),false);
  });
});
test('G01 alternate: second-key QuotaExceeded rollback preserves all originals',()=>{
  const initial={[keys.positions]:JSON.stringify(values.positions), [keys.layout]:JSON.stringify(values.layout)};
  withStore(initial,({data})=>{
    assert.equal(writeMobileHomeBatch([[keys.positions,{...values.positions,version:2}],[keys.layout,{...values.layout,activePage:1}]]),false);
    assert.equal(data.get(keys.positions),initial[keys.positions]);
    assert.equal(data.get(keys.layout),initial[keys.layout]);
  },{failAt:2});
});
test('G01 alternate: valid full batch updates all supplied keys',()=>withStore({},({data})=>{
  const entries=Object.entries(keys).map(([name,key])=>[key,values[name]]);
  assert.equal(writeMobileHomeBatch(entries),true);
  for (const [key,value] of entries)assert.deepEqual(JSON.parse(data.get(key)),value);
}));
test('G01 alternate: unknown keys and duplicate key changes are rejected',()=>withStore({},({writes})=>{
  assert.equal(writeMobileHomeBatch([['running-records-v1',[]]]),false);
  assert.equal(writeMobileHomeBatch([[keys.layout,values.layout],[keys.layout,values.layout]]),false);
  assert.equal(writes.length,0);
}));
test('G01 alternate: all mobile home persistence entrypoints route through fail-closed helpers',()=>{
  const files={
    'ui/mobileHomeWidgetIconSwap.js':'writeMobileHomeBatch',
    'ui/mobileHomeDropCoordinator.js':'writeMobileHomeBatch',
    'ui/mobileHomeEditScroll.js':'writeMobileHomeBatch',
    'ui/mobileHomePageCapacity.js':'writeJson',
    'ui/mobileHomeDefaultLayout.js':'writeJson',
  };
  for(const [file,contract] of Object.entries(files)){
    const source=readFileSync(new URL('../'+file,import.meta.url),'utf8');
    assert.ok(source.includes(contract),file);
    assert.doesNotMatch(source,/localStorage\?\.setItem\((POSITION_STORAGE_KEY|LAYOUT_STORAGE_KEY|WIDGET_STORAGE_KEY)/,file);
  }
});

test('G01 alternate: a concurrently replaced preference must not be clobbered', () => {
  const previous=Object.getOwnPropertyDescriptor(globalThis,'localStorage');
  const key=keys.layout;
  const original=JSON.stringify(values.layout), otherTab=JSON.stringify({...values.layout,activePage:3});
  let reads=0,writes=0,stored=original;
  Object.defineProperty(globalThis,'localStorage',{configurable:true,value:{
    getItem(k) { if(k!==key)return null;reads++;if(reads===2)stored=otherTab;return stored; },
    setItem(k,v){writes++;stored=v;}, removeItem(){writes++;stored=null;}
  }});
  try {
    assert.equal(writeMobileHomeJson(key,{...values.layout,activePage:2}),false);
    assert.equal(stored,otherTab);
    assert.equal(writes,0);
  } finally {if(previous)Object.defineProperty(globalThis,'localStorage',previous);else delete globalThis.localStorage;}
});

test('G01 alternate: failed new-key batch removes only our own interim creation', () => {
  withStore({},({data})=>{
    assert.equal(writeMobileHomeBatch([[keys.positions,values.positions],[keys.layout,values.layout]]),false);
    assert.equal(data.has(keys.positions),false);
    assert.equal(data.has(keys.layout),false);
  },{failAt:2});
});

test('G01 alternate: storage unavailable cannot be treated as successful persistence', () => {
  const old=Object.getOwnPropertyDescriptor(globalThis,'localStorage');
  try {
    delete globalThis.localStorage;
    assert.equal(writeMobileHomeJson(keys.layout,values.layout),false);
  } finally {if(old)Object.defineProperty(globalThis,'localStorage',old);else delete globalThis.localStorage;}
});
