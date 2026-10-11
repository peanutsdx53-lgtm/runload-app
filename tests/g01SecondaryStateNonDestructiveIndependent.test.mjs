import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {syncAchievements, consumeUnannouncedAchievements} from '../ui/mobileAchievements.js';
const KEY='running-record-mobile-achievements-v1', TUTORIAL='running-record.screenTutorial.seen.v1';
const svc={storage:{records:{loadAll:()=>[{id:'r1',date:'2026-10-11',activityType:'run',distanceKm:5}]},plans:{loadAll:()=>[]},courses:{loadAll:()=>[]}}};
function mockStorage(initial={}){
 const map=new Map(Object.entries(initial));let deny=false,race=null, writes=0;
 return {map,get writes(){return writes},set deny(v){deny=v},set race(v){race=v},getItem(k){if(deny)throw new DOMException('denied','SecurityError');return map.get(k)??null},setItem(k,v){writes++;if(deny)throw new DOMException('quota','QuotaExceededError');if(race!==null){map.set(k,race);race=null;throw new DOMException('concurrent','InvalidStateError')}map.set(k,String(v))},removeItem(k){map.delete(k)}};
}
test('G01 achievements: malformed, future schema and unreadable originals are not overwritten',()=>{
 const old=globalThis.localStorage;
 try {for(const raw of ['{bad', 'null', '[]', '{"version":9,"unlocked":{}}', '{"version":1,"unlocked":[]}', '{"version":1,"announced":false}']){
   const store=mockStorage({[KEY]:raw});globalThis.localStorage=store;
   const result=syncAchievements(svc); assert.ok(Array.isArray(result));assert.equal(store.map.get(KEY),raw);assert.equal(store.writes,0);
   assert.deepEqual(consumeUnannouncedAchievements(svc),[]);assert.equal(store.map.get(KEY),raw);
 }
 const bad=mockStorage({[KEY]:'{"version":1,"unlocked":{}}'});bad.deny=true;globalThis.localStorage=bad;
 assert.doesNotThrow(()=>syncAchievements(svc));assert.deepEqual(consumeUnannouncedAchievements(svc),[]);
 }finally{globalThis.localStorage=old}
});
test('G01 achievements: preserve unknown fields and legacy partial state',()=>{
 const old=globalThis.localStorage;
 try {const raw={version:1,unlocked:{'prior-unknown':'2026-01-01'},futureOptional:{data:[1,2,3]}};
 const store=mockStorage({[KEY]:JSON.stringify(raw)});globalThis.localStorage=store;
 const r=syncAchievements(svc);assert.ok(r.some(x=>x.id==='first-record'&&x.unlockedAt));
 const stored=JSON.parse(store.map.get(KEY));assert.deepEqual(stored.futureOptional,raw.futureOptional);assert.equal(stored.unlocked['prior-unknown'],'2026-01-01');
 }finally{globalThis.localStorage=old}
});
test('G01 achievements: failed acknowledgement does not consume announcement',()=>{
 const old=globalThis.localStorage;
 try {const store=mockStorage();globalThis.localStorage=store;syncAchievements(svc);
 const previous=store.map.get(KEY);store.deny=true;assert.deepEqual(consumeUnannouncedAchievements(svc),[]);store.deny=false;assert.equal(store.map.get(KEY),previous);
 const consumed=consumeUnannouncedAchievements(svc);assert.ok(consumed.length>0);assert.equal(consumeUnannouncedAchievements(svc).length,0);
 }finally{globalThis.localStorage=old}
});
test('G01 tutorials: malformed/unreadable history retained; valid seen-map key added without dropping extras',async()=>{
 const src=fs.readFileSync(new URL('../ui/screenTutorial.js',import.meta.url),'utf8');
 const mod=await import('data:text/javascript;base64,'+Buffer.from(src+'\nexport { markSeen, readSeenMap };').toString('base64'));
 const old=globalThis.window;
 try{
  for(const raw of ['{bad','null','[]','42','"str"']){
    const store=mockStorage({[TUTORIAL]:raw});globalThis.window={localStorage:store};assert.equal(mod.markSeen('result'),false);assert.equal(store.map.get(TUTORIAL),raw);assert.equal(store.writes,0);
  }
  const state=JSON.stringify({settings:true,unknownFlag:{a:1}}),store=mockStorage({[TUTORIAL]:state});globalThis.window={localStorage:store};assert.equal(mod.markSeen('result'),true);
  assert.deepEqual(JSON.parse(store.map.get(TUTORIAL)),{settings:true,unknownFlag:{a:1},result:true});
  store.deny=true;assert.equal(mod.markSeen('result'),false);
 }finally{globalThis.window=old}
});
