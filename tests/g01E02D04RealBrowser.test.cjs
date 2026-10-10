'use strict';
// Audit: storage persistence/lock, runtime outbound request boundary, offline map fallback.
// Intended for CI Playwright Chromium; the test makes no actual third-party request.
const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs/promises');
const path = require('node:path');
const {chromium} = require('playwright');
const ROOT=path.resolve(__dirname,'..');
const MIME={'.html':'text/html','.js':'application/javascript','.mjs':'application/javascript','.json':'application/json','.css':'text/css','.svg':'image/svg+xml','.png':'image/png','.webmanifest':'application/manifest+json'};
const SAMPLE={id:'g01-e02-d04-browser-record',date:'2026-10-10',createdAt:'2026-10-10T02:00:00.000Z',activityType:'run',distanceKm:6,durationMinutes:40,runningFormat:'CONTINUOUS_RUN',stepsProvenance:'UNKNOWN',course:{gradeKnowledge:'UNKNOWN',modelSurfaceClass:'UNKNOWN'}};
const FEEDBACK={checkStatus:'deferred',bodyAreaObservations:[],safetyFlags:{}};
async function serve(){
 const server=http.createServer(async(req,res)=>{try{
  const url=new URL(req.url,'http://127.0.0.1');const filename=path.resolve(ROOT,'.'+(url.pathname==='/'?'/index.html':decodeURIComponent(url.pathname)));
  if(!filename.startsWith(ROOT+path.sep)){res.writeHead(403).end();return;}
  const data=await fs.readFile(filename);res.writeHead(200,{'content-type':MIME[path.extname(filename)]||'application/octet-stream','cache-control':'no-store'}).end(data);
 }catch{res.writeHead(404).end('Not Found');}});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));return {server,origin:`http://127.0.0.1:${server.address().port}`};
}
async function until(p){return Promise.race([p,new Promise((_,reject)=>setTimeout(()=>reject(new Error('Audit timeout')),25000))]);}
async function runAudit(browser,origin,viewport){
 const context=await browser.newContext({viewport,serviceWorkers:'block'});
 const outbound=[];const loggedErrors=[];const localMissing=[];
 await context.route('**/*', async route=>{
  const req=route.request(),url=req.url();
  if(url.startsWith(origin+'/'))return route.continue();
  outbound.push({url,method:req.method(),type:req.resourceType(),body:req.postData()});
  return route.abort('blockedbyclient');
 });
 const page=await context.newPage();
 page.on('pageerror',err=>loggedErrors.push(err.message));
 page.on('response',res=>{if(res.url().startsWith(origin+'/')&&res.status()>=400)localMissing.push(res.url());});
 try {
  const response=await page.goto(origin+'/index.html',{waitUntil:'networkidle',timeout:35000});assert.equal(response.status(),200);
  // Wait for the boot loader to either mount the normal app or report a genuine environment error.
  await page.waitForTimeout(250);
  assert.equal(await page.locator('.app-session-guard').count(),0,'First tab must acquire Web Lock and initialize');
  assert.equal(outbound.length,0,'No external requests on startup');
  assert.equal(localMissing.length,0,'Missing local boot resource');
  const second=await context.newPage();await second.goto(origin+'/index.html',{waitUntil:'networkidle'});
  await second.locator('.app-session-guard').waitFor({timeout:10000});
  assert.match(await second.locator('.app-session-guard').innerText(),/別のタブ/,'Second tab must be blocked');
  assert.equal(await second.locator('.app-session-guard button').count(),1,'Clear retry guidance required');
  assert.equal(outbound.length,0,'Lock contention must not cause third party transmission');
  const save=await page.evaluate(async ({record,feedback})=>{
   const {createApplicationServices}=await import('/core/appCore.js');
   const app=createApplicationServices({storage:localStorage});
   const before=Object.keys(localStorage).length;
   const result=app.workflows.records.saveRecordAndFeedback(record,feedback);
   const experience=app.workflows.records.loadExperience(record.id);
   const backup=app.storage.backup.tryExportBackupText();
   const invalid=app.storage.backup.inspectBackupText('{not:json');
   return {saved:result.ok,reason:result.code||null,record:experience?.record?.id,model:experience?.regionalV2ResultRecord?.model_version,backupOk:backup.ok,backupSize:backup.text?.length||0,backupCanRestore:backup.ok?app.storage.backup.inspectBackupText(backup.text).canRestore:null,invalidRejected:invalid.canRestore===false,keysBefore:before,keysAfter:localStorage.length};
  },{record:SAMPLE,feedback:FEEDBACK});
  assert.equal(save.saved,true,JSON.stringify(save));
  assert.equal(save.record,SAMPLE.id,'Read after save must preserve ID');
  assert.equal(save.backupOk,true,JSON.stringify(save));
  assert.equal(save.backupCanRestore,true);
  assert.equal(save.invalidRejected,true);
  assert(save.backupSize>1000,'Export should include meaningful snapshot');
  assert.equal(outbound.length,0,'Saving, loading, and backup must not transmit user data');
  await page.close(); // release the exclusive edit lock on the real browser lifecycle.
  await second.reload({waitUntil:'networkidle'});
  await second.waitForTimeout(350);
  assert.equal(await second.locator('.app-session-guard').count(),0,'Second tab must acquire lock after first closes');
  const recovered=await second.evaluate(async id=>{
    const {createApplicationServices}=await import('/core/appCore.js');
    const app=createApplicationServices({storage:localStorage});
    const exp=app.workflows.records.loadExperience(id);
    const backup=app.storage.backup.tryExportBackupText();
    return {id:exp?.record?.id,model:exp?.regionalV2ResultRecord?.model_version,backupRestore:backup.ok&&app.storage.backup.inspectBackupText(backup.text).canRestore};
  },SAMPLE.id);
  assert.equal(recovered.id,SAMPLE.id,'Stored record absent after tab restart');
  assert.equal(recovered.model,save.model,'Model identity changed during reload');
  assert.equal(recovered.backupRestore,true,'Backup invalid after tab restart');
  assert.equal(outbound.length,0,'Reload and persisted history must not transmit user data');
  // Offline map, no external PNGs, and offline usage of the main record/backup workflow.
  await context.setOffline(true);
  const offline=await second.evaluate(async id=>{
   const {createRunMeasurementMap}=await import('/ui/runMeasurementMap.js');
   const root=document.createElement('div');root.id='g01-d04-audit-map';root.style.cssText='width:320px;height:360px;position:relative';document.body.append(root);
   const map=createRunMeasurementMap(root);
   map.setCenter({lat:35.68,lon:139.77});map.setTrack([{lat:35.68,lon:139.77},{lat:35.6801,lon:139.7701}]);
   root.querySelector('.run-map__tile-consent-button').click();
   const visible=!!root.querySelector('svg polyline.run-map__route')&&root.querySelector('.run-map__tile-consent').hidden===false;
   const notice=root.querySelector('.run-map__tile-consent-description').textContent;
   map.setZoom(18);const images=root.querySelectorAll('img.run-map__tile').length;
   const {createApplicationServices}=await import('/core/appCore.js');
   const app=createApplicationServices({storage:localStorage});const exp=app.workflows.records.loadExperience(id);
   const backup=app.storage.backup.tryExportBackupText();
   const ret={routeVisible:visible,notice,images,recordRead:exp?.record?.id,backup:backup.ok};map.destroy();return ret;
  },SAMPLE.id);
  assert.equal(offline.routeVisible,true,JSON.stringify(offline));
  assert.match(offline.notice,/オフライン/,'No offline map limitation text');
  assert.equal(offline.images,0,'Offline must create no external map tile images');
  assert.equal(offline.recordRead,SAMPLE.id,'Core record not available offline');
  assert.equal(offline.backup,true,'Offline backup must work');
  assert.equal(outbound.length,0,'Offline map and core workflow leaked external request');
  await context.setOffline(false);
  console.log(JSON.stringify({viewport,lock:'PASS',persistentRecord:recovered.id,backupRestorable:true,malformedBackupBlocked:true,offlineMapTrack:true,offlineUserNotice:true,offlineCore:true,thirdPartyRequests:outbound.length,result:'PASS'}));
 } finally {await context.close();}
}
(async()=>{const {server,origin}=await serve();let browser;try{
 browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 await until(runAudit(browser,origin,{width:1440,height:900}));
 await until(runAudit(browser,origin,{width:390,height:844}));
 console.log('G01 E02 D04 chromium browser privacy persistence/lock/fallback regression: PASS');
 }finally{await browser?.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});
