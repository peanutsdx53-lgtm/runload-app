'use strict';
// Real Chromium startup with production-like .localhost origin, SW-controlled offline reload.
// Does NOT claim to execute the VS Code Live Server extension or test a physical handset.
const assert=require('node:assert/strict');
const fs=require('node:fs/promises'),path=require('node:path'),http=require('node:http');
const {chromium}=require('playwright');
const ROOT=path.resolve(__dirname,'..');
const MIME={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.png':'image/png','.svg':'image/svg+xml','.webmanifest':'application/manifest+json; charset=utf-8','.json':'application/json; charset=utf-8'};
async function serve(){
 const handler=async(req,res)=>{
  try{let p=decodeURIComponent(new URL(req.url,'http://127.0.0.2').pathname);if(!p.startsWith('/runload-app/')){res.writeHead(404).end();return}
   p=p.slice('/runload-app'.length);if(p==='/')p='/index.html';const f=path.resolve(ROOT,'.'+p);if(!f.startsWith(ROOT+path.sep)){res.writeHead(403).end();return}
   const body=await fs.readFile(f);res.writeHead(200,{'content-type':MIME[path.extname(f)]||'application/octet-stream','cache-control':'no-store'}).end(body);
  }catch{res.writeHead(404).end('Not Found')}
 };
 // Separate trustworthy loopback origins: 127.0.0.1 follows development opt-out;
 // 127.0.0.2 exercises the unmodified production SW registration branch.
 const localServer=http.createServer(handler),prodServer=http.createServer(handler);
 await Promise.all([new Promise(ok=>localServer.listen(0,'127.0.0.1',ok)),new Promise(ok=>prodServer.listen(0,'127.0.0.2',ok))]);
 return{localServer,prodServer,httpPort:localServer.address().port,prodPort:prodServer.address().port};
}
async function round(browser,origin,width){
 const context=await browser.newContext({viewport:{width,height:880}});const page=await context.newPage();
 const localErrors=[],requestErrors=[];page.on('pageerror',e=>localErrors.push(e.message));page.on('response',r=>{if(r.url().startsWith(origin)&&r.status()>=400)requestErrors.push(r.url()+' '+r.status())});
 const sentinel='round4-private-local-only-'+width;
 try{
  const first=await page.goto(origin+'index.html',{waitUntil:'domcontentloaded',timeout:40000});assert.equal(first.status(),200);
  await page.waitForFunction(()=>!document.querySelector('#app > .app-boot'),null,{timeout:35000});
  const security=await page.evaluate(()=>({isSecureContext,hostname:location.hostname,swAvailable:'serviceWorker' in navigator,swController:!!navigator.serviceWorker?.controller}));
  assert.equal(security.isSecureContext,true,'Trustworthy loopback origin is not secure: '+JSON.stringify(security));
  await page.waitForTimeout(1500);
  const diag=await page.evaluate(async()=>({ready:document.readyState,secure:isSecureContext,hostname:location.hostname,
    controller:!!navigator.serviceWorker?.controller,caches:await caches.keys(),registrations:(await navigator.serviceWorker.getRegistrations()).map(r=>({scope:r.scope,active:r.active?.state,installing:r.installing?.state,waiting:r.waiting?.state}))}));
  console.log('B04_PROD_PWA_DIAG',JSON.stringify(diag));
  await page.waitForFunction(()=>navigator.serviceWorker?.controller&&Boolean(document.querySelector('#app')),null,{timeout:25000});
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
  // D-02: real Chromium stays network-offline throughout save/edit/history/backup/restore/reload.
  const recordId='d02-offline-acceptance-'+width;
  const lifecycle=await page.evaluate(async id=>{
    const {createApplicationServices}=await import(new URL('./core/appCore.js',location.href).href);
    const services=createApplicationServices({storage:localStorage});
    const record={id,date:'2026-10-10',createdAt:'2026-10-10T02:00:00.000Z',activityType:'run',
      distanceKm:6,durationMinutes:40,runningFormat:'CONTINUOUS_RUN',stepsProvenance:'UNKNOWN',
      course:{gradeKnowledge:'UNKNOWN',modelSurfaceClass:'UNKNOWN'}};
    const feedback={checkStatus:'deferred',bodyAreaObservations:[],safetyFlags:{}};
    const first=services.workflows.records.saveRecordAndFeedback(record,feedback);
    const updated=services.workflows.records.saveRecordAndFeedback({...record,distanceKm:7},feedback);
    const historyAfterEdit=services.workflows.history.search({period:'all'});
    const exported=services.storage.backup.tryExportBackupText();
    const inspection=exported.ok?services.storage.backup.inspectBackupText(exported.text):null;
    const later=services.workflows.records.saveRecordAndFeedback({...record,distanceKm:8},feedback);
    const imported=exported.ok?services.storage.backup.restoreBackupText(exported.text):null;
    const final=services.workflows.records.loadExperience(id);
    const historyAfterRestore=services.workflows.history.search({period:'all'});
    return {firstOk:first.ok,updatedOk:updated.ok,editedDistance:historyAfterEdit.find(x=>x.record.id===id)?.record.distanceKm??null,
      exportOk:exported.ok,inspectionOk:inspection?.canRestore??false,laterOk:later.ok,
      importOk:imported?.ok??false,importCode:imported?.code,
      restoredDistance:final?.record?.distanceKm??null,
      historyDistance:historyAfterRestore.find(x=>x.record.id===id)?.record.distanceKm??null,
      restoredModel:final?.regionalV2ResultRecord?.model_version??null};
  },recordId);
  assert.equal(lifecycle.firstOk,true,JSON.stringify(lifecycle));
  assert.equal(lifecycle.updatedOk,true,JSON.stringify(lifecycle));
  assert.equal(lifecycle.editedDistance,7,JSON.stringify(lifecycle));
  assert.equal(lifecycle.exportOk,true,JSON.stringify(lifecycle));
  assert.equal(lifecycle.inspectionOk,true,JSON.stringify(lifecycle));
  assert.equal(lifecycle.laterOk,true,JSON.stringify(lifecycle));
  assert.equal(lifecycle.importOk,true,JSON.stringify(lifecycle));
  assert.equal(lifecycle.restoredDistance,7,JSON.stringify(lifecycle));
  assert.equal(lifecycle.historyDistance,7,JSON.stringify(lifecycle));
  assert.match(lifecycle.restoredModel||'',/reference100-v3\.1/);
  // A second *offline* navigation proves persistent data and restored history, not only transient JS state.
  await page.reload({waitUntil:'domcontentloaded',timeout:35000});
  await page.waitForFunction(()=>!document.querySelector('#app > .app-boot'),null,{timeout:35000});
  const persisted=await page.evaluate(async id=>{
    const {createApplicationServices}=await import(new URL('./core/appCore.js',location.href).href);
    const services=createApplicationServices({storage:localStorage});
    return {record:services.workflows.records.loadExperience(id)?.record?.distanceKm??null,
      history:services.workflows.history.search({period:'all'}).find(x=>x.record.id===id)?.record.distanceKm??null,
      exported:services.storage.backup.tryExportBackupText().ok};
  },recordId);
  assert.deepEqual(persisted,{record:7,history:7,exported:true},JSON.stringify({lifecycle,persisted}));
  console.log('D02_OFFLINE_RECORD_EDIT_HISTORY_EXPORT_RESTORE_RELOAD_PASS',JSON.stringify({width,lifecycle,persisted}));
  assert.deepEqual(requestErrors,[],'Required runtime file missing');assert.deepEqual(localErrors,[],'Uncaught browser error');
  console.log('B04_B05_C04_PRODUCTION_LIKE_OFFLINE_PASS',JSON.stringify({width,offline,originClass:'127.0.0.2 trusted loopback path /runload-app'}));
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
(async()=>{const {localServer,prodServer,httpPort,prodPort}=await serve();let browser;
 try{browser=await chromium.launch({headless:true,args:['--no-sandbox']});
  await localLiveServerContrast(browser,httpPort);
  const origin=`http://127.0.0.2:${prodPort}/runload-app/`;
  for(const width of [390,1440])await round(browser,origin,width);
 }finally{await browser?.close();await Promise.all([new Promise(ok=>localServer.close(ok)),new Promise(ok=>prodServer.close(ok))])}
})().catch(e=>{console.error(e);process.exitCode=1});
