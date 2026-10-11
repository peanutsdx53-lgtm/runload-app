import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import vm from 'node:vm';
const source=fs.readFileSync(new URL('../core/internal/platformInfrastructure.js',import.meta.url),'utf8');
const start=source.indexOf('const NOTICE_ID = "pwa-update-notice";');
const end=source.indexOf('moduleExports["registerPwaServiceWorker"] = registerPwaServiceWorker;');
assert(start>=0&&end>start,'Real production registration definition must be present');
const actual=source.slice(start,end)+'\nglobalThis.__registerPwaServiceWorker = registerPwaServiceWorker;';
async function scenario({readyState,hostname='runload.test',protocol='https:'}){
 const callbacks=new Map();let registered=0,updates=0,messages=[],unregistered=0;
 const waiting={postMessage:(msg)=>messages.push(msg)};
 const reg={active:waiting,waiting:null,update:async()=>{updates++},addEventListener(){}};
 const sw={register:async()=>{registered++;return reg},ready:Promise.resolve(reg),controller:null,addEventListener(){},getRegistrations:async()=>[{active:{scriptURL:'https://runload.test/service-worker.js'},unregister:async()=>{unregistered++;}}]};
 const document={readyState,getElementById:()=>null};
 const window={isSecureContext:true,location:{hostname,protocol},addEventListener:(type,cb)=>callbacks.set(type,cb)};
 const context={document,window,navigator:{serviceWorker:sw},queueMicrotask,console,Promise};
 vm.createContext(context);vm.runInContext(actual,context,{filename:'core/internal/platformInfrastructure.js'});
 context.__registerPwaServiceWorker({platform:'mobile'});
 if(readyState!=='complete')await callbacks.get('load')?.();
 for(let i=0;i<8;i++)await new Promise(resolve=>setImmediate(resolve));
 return{registered,updates,messages,unregistered,loadListenerRegistered:callbacks.has('load')};
}
test('B-04: PWA registration still runs when asynchronous ESM loads after load event',async()=>{
 const x=await scenario({readyState:'complete'});
 assert.equal(x.registered,1,'Late app boot must register service worker');
 assert.equal(x.updates,1);
 assert.deepEqual(JSON.parse(JSON.stringify(x.messages)),[{type:'CACHE_PLATFORM',platform:'mobile'}]);
});
test('C-04: local Live Server SW cleanup still runs when bootstrap completes after load',async()=>{
 const x=await scenario({readyState:'complete',hostname:'127.0.0.1',protocol:'http:'});
 assert.equal(x.registered,0);assert.equal(x.unregistered,1,'Dev SW must not remain installed');
});
test('B-04: original pre-load registration behavior remains supported',async()=>{
 const x=await scenario({readyState:'loading'});
 assert.equal(x.registered,1);assert.equal(x.updates,1);
});
