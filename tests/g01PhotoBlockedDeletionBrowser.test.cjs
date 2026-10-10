'use strict';
// Real Chromium: an open second-tab IndexedDB connection must not turn a
// rejected clear request into a queued, destructive deleteDatabase later.
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const { createServer } = require('node:http');
const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '..');
const MIME = {'.html':'text/html', '.js':'text/javascript', '.mjs':'text/javascript', '.json':'application/json', '.css':'text/css', '.svg':'image/svg+xml', '.png':'image/png'};
const dummyJpeg = [255, 216, 255, 217];
async function run() {
  const server = createServer(async (req, res) => {
    try {
      const raw = decodeURIComponent(new URL(req.url, 'http://127.0.0.1').pathname);
      const file = path.resolve(ROOT, '.' + (raw === '/' ? '/index.html' : raw));
      if (!file.startsWith(ROOT + path.sep)) { res.writeHead(403).end(); return; }
      const bytes = await fs.readFile(file);
      res.writeHead(200, {'content-type': MIME[path.extname(file)] || 'application/octet-stream', 'cache-control': 'no-store'}).end(bytes);
    } catch { res.writeHead(404).end(); }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  let browser;
  try {
    browser = await chromium.launch({headless:true, args:['--no-sandbox']});
    for (const viewport of [{width:1440,height:900},{width:390,height:844}]) {
      const context = await browser.newContext({viewport, serviceWorkers:'block'});
      const outbound = [];
      await context.route('**/*', route => {
        if (route.request().url().startsWith(origin + '/')) return route.continue();
        outbound.push(route.request().url()); return route.abort();
      });
      const a = await context.newPage(), b = await context.newPage();
      try {
        await Promise.all([a.goto(origin + '/index.html'),b.goto(origin + '/index.html')]);
        // A transient open exception must not poison the module's cached
        // promise: storage can recover during the same browser session.
        const transient = await a.evaluate(async()=>{
          const original = IDBFactory.prototype.open;
          let rejected = false;
          try {
            IDBFactory.prototype.open = function(){ throw new DOMException('Temporary browser denial','SecurityError'); };
            const p = await import('/ui/mobilePhotoMemoStore.js');
            rejected = (await p.clearAllPhotoMemos()) === false;
          } finally { IDBFactory.prototype.open = original; }
          const p = await import('/ui/mobilePhotoMemoStore.js');
          return {rejected, recovered:await p.clearAllPhotoMemos()};
        });
        assert.deepEqual(transient,{rejected:true,recovered:true});
        const start = await a.evaluate(async img => {
          const p = await import('/ui/mobilePhotoMemoStore.js');
          await p.clearAllPhotoMemos();
          localStorage.setItem('g01-blocked-clear-sentinel', 'survive');
          const save = await p.savePhotoMemo({blob:new Blob([new Uint8Array(img)],{type:'image/jpeg'}),note:'before clear',width:1,height:1});
          return {ok:save.ok, count:(await p.listPhotoMemos()).length};
        },dummyJpeg);
        assert.deepEqual(start,{ok:true,count:1});
        // Deliberately hold open another tab's native connection. Old
        // deleteDatabase implementation emits onblocked yet remains queued.
        const held = await b.evaluate(async () => {
          const database = await new Promise((resolve,reject) => {
            const q = indexedDB.open('running-record-mobile-media-v1',1);
            q.onsuccess = () => resolve(q.result);
            q.onerror = () => reject(q.error);
          });
          window.__g01HeldDatabase = database;
          window.__g01VersionChanged = 0;
          database.onversionchange = () => { window.__g01VersionChanged++; /* intentional hold */ };
          return database.objectStoreNames.contains('photoMemos');
        });
        assert.equal(held,true);
        const cleared = await Promise.race([
          a.evaluate(async()=>{
            const p=await import('/ui/mobilePhotoMemoStore.js');
            return {ok:await p.clearAllPhotoMemos(),count:(await p.listPhotoMemos()).length,other:localStorage.getItem('g01-blocked-clear-sentinel')};
          }),
          new Promise((_,reject)=>setTimeout(()=>reject(new Error('photo clear deadlocked on another tab')),5000))
        ]);
        assert.deepEqual(cleared,{ok:true,count:0,other:'survive'});
        const read = await b.evaluate(async() => {
          const tx=window.__g01HeldDatabase.transaction('photoMemos','readonly');
          return await new Promise((resolve,reject)=>{
            const q=tx.objectStore('photoMemos').count();
            q.onsuccess=()=>resolve({count:q.result,changed:window.__g01VersionChanged});
            q.onerror=()=>reject(q.error);
          });
        });
        assert.deepEqual(read,{count:0,changed:0});
        await b.evaluate(()=>{window.__g01HeldDatabase.close();delete window.__g01HeldDatabase;});
        const fresh = await a.evaluate(async img=>{
          const p=await import('/ui/mobilePhotoMemoStore.js');
          const save=await p.savePhotoMemo({blob:new Blob([new Uint8Array(img)],{type:'image/jpeg'}),note:'after clear',width:1,height:1});
          return {ok:save.ok,count:(await p.listPhotoMemos()).length};
        },dummyJpeg);
        assert.deepEqual(fresh,{ok:true,count:1});
        // Close the previously blocking tab and prove there is no previously
        // queued deleteDatabase that destroys the newly stored photo.
        await b.close();
        await a.waitForTimeout(300);
        assert.equal(await a.evaluate(async()=>(await (await import('/ui/mobilePhotoMemoStore.js')).listPhotoMemos()).length),1);
        assert.deepEqual(outbound,[]);
        console.log('G01_IDB_BLOCKED_DELETE_RACE_PASS',JSON.stringify({viewport,keptIndependentRecord:true,otherTabConnectionKept:true,delayedDelete:false,externalCalls:0}));
      } finally { await context.close(); }
    }
  } finally { await browser?.close(); await new Promise(resolve=>server.close(resolve)); }
}
run().catch(error=>{ console.error(error);process.exitCode=1; });
