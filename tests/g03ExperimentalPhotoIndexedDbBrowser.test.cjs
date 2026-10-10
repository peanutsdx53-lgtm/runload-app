'use strict';
// Experimental photo storage regression; does not restore the retired mobile memo UI.
const assert = require('node:assert/strict');
const {createServer} = require('node:http');
const fs = require('node:fs/promises');
const path = require('node:path');
const {chromium} = require('playwright');
const ROOT = path.resolve(__dirname, '..');
const MIME = {'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.webmanifest':'application/manifest+json'};
const JPG = Buffer.from('/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwDjaKKK/RzwT//Z','base64');
async function serve() {
  const server=createServer(async (req,res)=>{
    try {
      const raw = decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname);
      const f = path.resolve(ROOT, '.'+(raw==='/'?'/index.html':raw));
      if (!f.startsWith(ROOT+path.sep)) {res.writeHead(403);res.end();return;}
      const buf=await fs.readFile(f);res.writeHead(200,{'Content-Type':MIME[path.extname(f)]||'application/octet-stream','Cache-Control':'no-store'});res.end(buf);
    }catch{res.writeHead(404);res.end();}
  });
  await new Promise(r=>server.listen(0,'127.0.0.1',r));
  return {server,origin:`http://127.0.0.1:${server.address().port}`};
}
async function makePage(context,origin) {
  const p=await context.newPage();
  const resp=await p.goto(origin+'/index.html',{waitUntil:'domcontentloaded',timeout:25000});
  assert.equal(resp.status(),200);
  return p;
}
function sampleTask(count, jpg) {
  return async ({count,jpg})=>{
    const store=await import('/ui/mobilePhotoMemoStore.js');
    const file=new Blob([new Uint8Array(jpg)],{type:'image/jpeg'});
    return Promise.all(Array.from({length:count},(_,i)=>store.savePhotoMemo({blob:file,note:`photo-${i}`,width:1,height:1})));
  };
}
async function audit(browser,origin,viewport) {
  const context=await browser.newContext({viewport,permissions:[],serviceWorkers:'block'});
  const unexpected=[];
  await context.route('**/*',route=>{
    if(route.request().url().startsWith(origin+'/'))return route.continue();
    unexpected.push(route.request().url());return route.abort('blockedbyclient');
  });
  let page;
  try{
    page=await makePage(context,origin);
    const cleared=await page.evaluate(async()=>{
      const s=await import('/ui/mobilePhotoMemoStore.js');
      const ok=await s.clearAllPhotoMemos();
      return {ok,count:(await s.listPhotoMemos()).length};
    });
    assert.deepEqual(cleared,{ok:true,count:0});
    const init=await page.evaluate(async jpg=>{
      const s=await import('/ui/mobilePhotoMemoStore.js');
      const blob=new Blob([new Uint8Array(jpg)],{type:'image/jpeg'});
      const saved=await s.savePhotoMemo({blob,note:'  安全な写真  ',width:1,height:1});
      const found=await s.listPhotoMemos();
      return {saved:saved.ok, reason:saved.reason, count:found.length, id:saved.record?.id, note:found[0]?.note,
        byteSize:found[0]?.byteSize, mimeType:found[0]?.mimeType, width:found[0]?.width, height:found[0]?.height};
    }, [...JPG]);
    assert.equal(init.saved,true,JSON.stringify(init));
    assert.equal(init.count,1);assert.equal(init.note,'安全な写真');
    assert.equal(init.mimeType,'image/jpeg'); assert.equal(init.byteSize,JPG.length);
    assert.equal(init.width,1);assert.equal(init.height,1);
    await page.reload({waitUntil:'domcontentloaded'});
    const persisted=await page.evaluate(async id=>{
      const s=await import('/ui/mobilePhotoMemoStore.js');
      const entries=await s.listPhotoMemos();
      return {count:entries.length,id:entries[0]?.id,bytes:entries[0]?.imageBytes?.byteLength,deleted:await s.deletePhotoMemo(id),remaining:(await s.listPhotoMemos()).length};
    },init.id);
    assert.equal(persisted.count,1);assert.equal(persisted.id,init.id);
    assert.equal(persisted.bytes,JPG.length);assert.equal(persisted.deleted,true);assert.equal(persisted.remaining,0);
    const rejected=await page.evaluate(async jpg=>{
      const s=await import('/ui/mobilePhotoMemoStore.js');
      const jpeg=new Blob([new Uint8Array(jpg)],{type:'image/jpeg'});
      const png=new Blob([new Uint8Array(jpg)],{type:'image/png'});
      const oversized=new Blob([new Uint8Array(1_000_001)],{type:'image/jpeg'});
      const results=await Promise.all([
        s.savePhotoMemo({blob:png,width:1,height:1}),
        s.savePhotoMemo({blob:oversized,width:1,height:1}),
        s.savePhotoMemo({blob:jpeg,width:1441,height:1}),
        s.savePhotoMemo({blob:jpeg,width:1,height:0}),
        s.savePhotoMemo({blob:jpeg,width:'NaN',height:1}),
      ]);
      return {reasons:results.map(x=>x.reason),left:(await s.listPhotoMemos()).length};
    },[...JPG]);
    assert.deepEqual(rejected,{reasons:['image','size','image','image','image'],left:0});
    // Different browser tabs intentionally race: IDB readwrite transaction must atomically
    // serialize the count and insert, never permit more than 20 stored items.
    const other=await makePage(context,origin);
    const batch1=page.evaluate(async jpg=>{
      const s=await import('/ui/mobilePhotoMemoStore.js');const blob=new Blob([new Uint8Array(jpg)],{type:'image/jpeg'});
      return Promise.all(Array.from({length:15},(_,i)=>s.savePhotoMemo({blob,note:`tab1-${i}`,width:1,height:1})));
    },[...JPG]);
    const batch2=other.evaluate(async jpg=>{
      const s=await import('/ui/mobilePhotoMemoStore.js');const blob=new Blob([new Uint8Array(jpg)],{type:'image/jpeg'});
      return Promise.all(Array.from({length:15},(_,i)=>s.savePhotoMemo({blob,note:`tab2-${i}`,width:1,height:1})));
    },[...JPG]);
    const [a,b]=await Promise.all([batch1,batch2]);
    const combined=[...a,...b];const successes=combined.filter(x=>x.ok);
    assert.equal(successes.length,20,JSON.stringify(combined.map(x=>x.ok?'ok':x.reason)));
    assert.equal(combined.filter(x=>x.reason==='limit').length,10);
    const count=await page.evaluate(async()=>{const s=await import('/ui/mobilePhotoMemoStore.js');return (await s.listPhotoMemos()).length;});
    assert.equal(count,20);
    const simulated=await page.evaluate(async jpg=>{
      const s=await import('/ui/mobilePhotoMemoStore.js');
      const blob=new Blob([new Uint8Array(jpg)],{type:'image/jpeg'});
      const proto=IDBDatabase.prototype,old=proto.transaction;
      try {
        proto.transaction=function(...args){if(args[1]==='readwrite')throw new DOMException('Quota test','QuotaExceededError');return old.apply(this,args);};
        // Clear count to ensure the failure comes from the simulated transaction rather than limit.
        const r=await s.savePhotoMemo({blob,width:1,height:1});return {reason:r.reason,ok:r.ok};
      }finally{proto.transaction=old;}
    },[...JPG]);
    assert.equal(simulated.ok,false);
    assert(['quota','unavailable'].includes(simulated.reason),JSON.stringify(simulated));
    assert.equal(await page.evaluate(async()=> (await (await import('/ui/mobilePhotoMemoStore.js')).listPhotoMemos()).length),20);
    // Clear API remains usable after all limits, and must not clear localStorage.
    const final=await page.evaluate(async()=>{
      const s=await import('/ui/mobilePhotoMemoStore.js');
      localStorage.setItem('g03-keep-probe','preserve');
      const ok=await s.clearAllPhotoMemos();
      return {ok,count:(await s.listPhotoMemos()).length,other:localStorage.getItem('g03-keep-probe')};
    });
    assert.deepEqual(final,{ok:true,count:0,other:'preserve'});
    assert.deepEqual(unexpected,[]);
    await other.close();
    console.log('G03_PHOTO_INDEXEDDB_BROWSER_PASS',JSON.stringify({viewport,saved:1,restored:1,limited:20,parallelRejected:10,invalidInputs:5,quotaFailurePreserved:true,externalCalls:0}));
  }finally{await context.close();}
}
(async()=>{
  const {server,origin}=await serve();let browser;
  try{
    browser=await chromium.launch({headless:true,args:['--no-sandbox']});
    for(const viewport of [{width:1440,height:900},{width:390,height:844}])await audit(browser,origin,viewport);
  }finally{await browser?.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});
