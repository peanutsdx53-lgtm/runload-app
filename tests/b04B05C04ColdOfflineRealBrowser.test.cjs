'use strict';
// Real Chromium startup with production-like .localhost origin, SW-controlled offline reload.
// Does NOT claim to execute the VS Code Live Server extension or test a physical handset.
const assert=require('node:assert/strict');
const fs=require('node:fs/promises'),path=require('node:path'),http=require('node:http');
const {chromium}=require('playwright');
const ROOT=path.resolve(__dirname,'..');
const MIME={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.png':'image/png','.svg':'image/svg+xml','.webmanifest':'application/manifest+json; charset=utf-8','.json':'application/json; charset=utf-8'};
async function serve(){const server=http.createServer(async(req,res)=>{
 try{let p=decodeURIComponent(new URL(req.url,'http://localhost').pathname);if(!p.startsWith('/runload-app/')){res.writeHead(404).end();return}
 p=p.slice('/runload-app'.length);if(p==='/')p='/index.html';const f=path.resolve(ROOT,'.'+p);if(!f.startsWith(ROOT+path.sep)){res.writeHead(403).end();return}
 const body=await fs.readFile(f);res.writeHead(200,{'content-type':MIME[path.extname(f)]||'application/octet-stream','cache-control':'no-store'}).end(body);
 }catch{res.writeHead(404).end('Not Found')}
});await new Promise(ok=>server.listen(0,'127.0.0.1',ok));return{server,port:server.address().port}}
async function round(browser,origin,width){
 const context=await browser.newContext({viewport:{width,height:880}});const page=await context.newPage();
 const localErrors=[],requestErrors=[];page.on('pageerror',e=>localErrors.push(e.message));page.on('response',r=>{if(r.url().startsWith(origin)&&r.status()>=400)requestErrors.push(r.url()+' '+r.status())});
 const sentinel='round4-private-local-only-'+width;
 try{
  const first=await page.goto(origin+'index.html',{waitUntil:'domcontentloaded',timeout:40000});assert.equal(first.status(),200);
  await page.waitForFunction(()=>!document.querySelector('#app > .app-boot'),null,{timeout:35000});
  await page.waitForFunction(()=>navigator.serviceWorker?.controller&&Boolean(document.querySelector('#app')),null,{timeout:40000});
  await page.evaluate((s)=>localStorage.setItem('runload.audit.round4',s),sentinel);
  const data=await page.evaluate(()=>({app:!!document.querySelector('#app'),secure:isSecureContext,worker:!!navigator.serviceWorker.controller,cacheNames:[]}));
  assert.equal(data.secure,true,'Production-like origin is not secure');assert(data.worker,'SW must control the app');
  await page.waitForFunction(async()=>{
   const keys=(await caches.keys()).filter(k=>k.startsWith('running-record-app-runtime-'));
   if(!keys.length)return false;
   const cache=await caches.open(keys.at(-1));
   return Boolean((await cache.match('./index.html'))&&(await cache.match('./app.js'))&&(await cache.match('./ui/platformBootstrap.js')));
  },null,{timeout:40000});
  await context.setOffline(true);
  const offlineResponse=await page.reload({waitUntil:'domcontentloaded',timeout:35000});
  assert.equal(offlineResponse.status(),200,'Offline navigation should use cached index');
  await page.waitForFunction(()=>!document.querySelector('#app > .app-boot'),null,{timeout:35000});
  const offline=await page.evaluate(async()=>({sentinel:localStorage.getItem('runload.audit.round4'),controlled:!!navigator.serviceWorker.controller,
   js:await fetch('./app.js').then(r=>r.status).catch(()=>-1),css:await fetch('./styles/base.css').then(r=>r.status).catch(()=>-1),
   reg:await navigator.serviceWorker.getRegistration().then(r=>Boolean(r))}));
  assert.equal(offline.sentinel,sentinel,'Persistent local data altered/lost after offline reload');assert.equal(offline.controlled,true);assert.equal(offline.reg,true);
  assert.equal(offline.js,200,'Cached app.js unavailable offline');assert.equal(offline.css,200,'Cached CSS unavailable offline');
  assert.deepEqual(requestErrors,[],'Required runtime file missing');assert.deepEqual(localErrors,[],'Uncaught browser error');
  console.log('B04_B05_C04_PRODUCTION_LIKE_OFFLINE_PASS',JSON.stringify({width,offline,originClass:'*.localhost path /runload-app'}));
 }finally{await context.setOffline(false);await context.close()}
}
async function localLiveServerContrast(browser,port){
 const context=await browser.newContext({viewport:{width:390,height:844}});const page=await context.newPage();
 const origin=`http://127.0.0.1:${port}/runload-app/`;
 try{await page.goto(origin+'index.html',{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>!document.querySelector('#app > .app-boot'),null,{timeout:35000});
  await page.waitForTimeout(500);const result=await page.evaluate(async()=>({secure:isSecureContext,registration:!!(await navigator.serviceWorker.getRegistration()),booted:!document.querySelector('#app > .app-boot')}));
  assert.equal(result.booted,true);assert.equal(result.registration,false,'Local development is expected to opt out of SW');
  console.log('C04_LOCAL_HTTP_NO_PWA_INTENTIONAL_PASS',JSON.stringify(result));
 }finally{await context.close()}
}
(async()=>{const {server,port}=await serve();let browser;
 try{browser=await chromium.launch({headless:true,args:['--no-sandbox','--host-resolver-rules=MAP runload.localhost 127.0.0.1']});
  await localLiveServerContrast(browser,port);
  const origin=`http://runload.localhost:${port}/runload-app/`;
  for(const width of [390,1440])await round(browser,origin,width);
 }finally{await browser?.close();await new Promise(ok=>server.close(ok))}
})().catch(e=>{console.error(e);process.exitCode=1});
