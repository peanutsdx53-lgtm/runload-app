import { test } from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';
const source = fs.readFileSync(new URL('../service-worker.js', import.meta.url), 'utf8');
const APP='https://runload.invalid/app/';
function setup({ failPlatform=false }={}) {
 const hooks={};const values=new Map();const operations=[];
 const normalize=(url)=>new URL(typeof url==='string'?url:url.url,APP).href;
 const caches={
  async open(name){
   if(!values.has(name))values.set(name,new Map());const set=values.get(name);
   return {async addAll(urls){const requests=urls.map(normalize);operations.push(['addAll',name,requests.length]);if(failPlatform&&requests.some(x=>x.includes('desktop-history.css')))throw Error('network failed');for(const u of requests)set.set(u,{ok:true,tag:name})},async match(u){return set.get(normalize(u))||null},async put(u,res){set.set(normalize(u),res)}};
  },
  async keys(){return [...values.keys()]},
  async delete(name){operations.push(['delete',name]);return values.delete(name)},
  async match(u){for(const set of values.values())if(set.has(normalize(u)))return set.get(normalize(u));return null},
 };
 const self={location:new URL(APP+'service-worker.js'),clients:{async claim(){}},addEventListener:(kind,fn)=>hooks[kind]=fn,skipWaiting(){}};
 const context={self,caches,URL,Request,Response,fetch:async()=>{throw Error('offline')}};
 vm.runInNewContext(source,context,{filename:'service-worker.js'});
 async function dispatch(kind,fields={}){let pending,respond;const e={...fields,waitUntil(p){pending=Promise.resolve(p)},respondWith(p){respond=Promise.resolve(p)}};hooks[kind]?.(e);if(pending)await pending;return respond?await respond:undefined}
 return {caches,values,operations,normalize,dispatch};
}
const OLD='running-record-app-runtime-2026.10.09.52';
test('SW install retains shared-cache-only contract and includes offline home',async()=>{
 const m=setup();await m.dispatch('install');const keys=await m.caches.keys();assert.equal(keys.length,1);const group=await m.caches.open(keys[0]);assert.ok(await group.match('./index.html'));
 assert.equal(await group.match('./styles/desktop-history.css'),null);
});
test('SW activation retains most recent previous cache, removing superseded older cache only',async()=>{
 const m=setup();await(await m.caches.open('running-record-app-runtime-2026.10.08.43')).addAll(['./index.html']);await(await m.caches.open(OLD)).addAll(['./index.html','./styles/desktop-history.css']);await m.dispatch('install');await m.dispatch('activate');const keys=await m.caches.keys();assert.equal(keys.includes(OLD),true);assert.equal(keys.includes('running-record-app-runtime-2026.10.08.43'),false);
});
test('offline navigation uses coherent previous index before platform cache completion',async()=>{
 const m=setup();await(await m.caches.open(OLD)).addAll(['./index.html']);await m.dispatch('install');await m.dispatch('activate');let r=await m.dispatch('fetch',{request:{url:APP+'index.html',method:'GET',mode:'navigate'}});assert.equal(r.tag,OLD);
});
test('offline assets prefer old coherent version before CACHE_PLATFORM completes',async()=>{
 const m=setup();await(await m.caches.open(OLD)).addAll(['./styles/desktop-history.css','./styles/base.css']);await m.dispatch('install');await m.dispatch('activate');for (const rel of ['./styles/desktop-history.css','./styles/base.css']){const req=new Request(APP+rel);const r=await m.dispatch('fetch',{request:req});assert.equal(r.tag,OLD)}
});
test('successful platform preload replaces the previous cache without losing assets',async()=>{
 const m=setup();await(await m.caches.open(OLD)).addAll(['./index.html','./styles/desktop-history.css']);await m.dispatch('install');await m.dispatch('activate');await m.dispatch('message',{data:{type:'CACHE_PLATFORM',platform:'desktop'}});
 const names=await m.caches.keys();assert.equal(names.includes(OLD),false);let next=names[0];assert.equal((await(await m.caches.open(next)).match('./styles/desktop-history.css'))?.tag,next);
});
test('failed platform cache update keeps previous coherent cache and rejects the update',async()=>{
 const m=setup({failPlatform:true});m.values.set(OLD,new Map([[m.normalize('./index.html'),{ok:true,tag:OLD}],[m.normalize('./styles/desktop-history.css'),{ok:true,tag:OLD}]]));await m.dispatch('install');await m.dispatch('activate');await assert.rejects(m.dispatch('message',{data:{type:'CACHE_PLATFORM',platform:'desktop'}}),/network failed/);assert.equal((await m.caches.keys()).includes(OLD),true);
});
test('SW does not respond to cross-origin and mutating requests',async()=>{
 const m=setup();await m.dispatch('install');for (const req of [new Request('https://external.invalid/map.png'),new Request(APP+'index.html',{method:'POST'})])assert.equal(await m.dispatch('fetch',{request:req}),undefined);
});
