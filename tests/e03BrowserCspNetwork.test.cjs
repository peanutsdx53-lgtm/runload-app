'use strict';
// Browser security gate: execute this file in CI with Playwright installed.
// No external network is reached; allowable OSM image responses are intercepted.
const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const {chromium} = require('playwright');
const ROOT = path.resolve(__dirname,'..');
const TILE='https://tile.openstreetmap.org';
const PNG=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/44UAAAAASUVORK5CYII=','base64');
const mimetypes={'.html':'text/html','.js':'application/javascript','.mjs':'application/javascript','.css':'text/css','.json':'application/json','.webmanifest':'application/manifest+json','.png':'image/png','.svg':'image/svg+xml'};

async function serve(){
 const server=http.createServer(async(req,res)=>{
  try{
   const u=new URL(req.url,'http://localhost');
   const full=path.resolve(ROOT,'.'+(u.pathname==='/'?'/index.html':decodeURIComponent(u.pathname)));
   if(!full.startsWith(ROOT+path.sep)) {res.writeHead(403);res.end();return;}
   const data=await fs.readFile(full);
   res.writeHead(200,{'content-type':mimetypes[path.extname(full)]||'application/octet-stream','cache-control':'no-store'});res.end(data);
  }catch{res.writeHead(404);res.end();}
 });
 server.on('upgrade',(req,socket)=>{
  const key=req.headers['sec-websocket-key'];
  if(req.url!=='/e03-local-ws'||typeof key!=='string'){socket.destroy();return;}
  const accept=crypto.createHash('sha1').update(key+'258EAFA5-E914-47DA-95CA-C5AB0DC85B11').digest('base64');
  socket.write('HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: '+accept+'\r\n\r\n');
  socket.on('error',()=>{});
  socket.on('data',()=>socket.end());
 });
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 return {server,origin:`http://127.0.0.1:${server.address().port}`};
}

async function audit(browser,origin,viewport){
 const context=await browser.newContext({viewport,permissions:[],serviceWorkers:'block'});
 const page=await context.newPage();
 const outbound=[]; const brokenAssets=[];
 const csp=[];
 await page.addInitScript(()=>{window.__e03Violations=[];document.addEventListener('securitypolicyviolation',e=>window.__e03Violations.push({directive:e.effectiveDirective,uri:e.blockedURI}));});
 await page.route('**/*',async route=>{
  const url=route.request().url();
  if(url.startsWith(origin+'/')) return route.continue();
  outbound.push({url,method:route.request().method(),type:route.request().resourceType()});
  if(/^https:\/\/tile\.openstreetmap\.org\/\d+\/\d+\/\d+\.png$/.test(url)) return route.fulfill({status:200,contentType:'image/png',body:PNG});
  return route.abort('blockedbyclient');
 });
 page.on('response',r=>{if(r.url().startsWith(origin+'/')&&r.status()>=400)brokenAssets.push({url:r.url(),status:r.status()});});
 try{
  const response=await page.goto(origin+'/index.html',{waitUntil:'networkidle',timeout:40000});
  assert.equal(response.status(),200);
  await page.waitForTimeout(350);
  assert.deepEqual(outbound,[],'Unexpected third-party request on initial page load');
  assert.deepEqual(brokenAssets,[],'Missing startup dependency');
  assert.equal(await page.locator('meta[http-equiv="Content-Security-Policy"]').count(),1);
  const policy=await page.locator('meta[http-equiv="Content-Security-Policy"]').getAttribute('content');
  assert(policy.includes("script-src 'self'")&&!policy.includes("script-src 'self' 'unsafe-inline'"),'script-src must allow local scripts only');
  assert(policy.includes("style-src 'self' 'unsafe-inline'"),'Limited inline CSS boot fallback intentionally supported');
  assert(policy.includes("object-src 'none'")&&policy.includes("base-uri 'none'"),'unsafe object and base-uri policy missing');
  assert(policy.includes("connect-src 'self' ws://127.0.0.1:* ws://localhost:*"),'localhost ws exception must be explicitly bounded');
  const dynamic=await page.evaluate(async()=>{
   const {createRunMeasurementMap}=await import('/ui/runMeasurementMap.js');
   const container=document.createElement('div');container.id='e03-audit-map';container.style.width='320px';container.style.height='360px';document.body.append(container);
   const map=createRunMeasurementMap(container);if(!map)throw Error('Could not mount map');
   map.setCenter({lat:35.681236,lon:139.767125});map.setTrack([{lat:35.681236,lon:139.767125},{lat:35.683,lon:139.77}]);map.setZoom(17);
   window.__e03Map=map;
   return {prompt:container.querySelector('.run-map__tile-consent-description')?.textContent,consentShown:container.querySelector('.run-map__tile-consent')?.hidden===false};
  });
  assert(dynamic.consentShown&&dynamic.prompt.includes('外部'),'No meaningful opt-in consent prompt');
  await page.waitForTimeout(300);assert.deepEqual(outbound,[],'Map leaks viewed coordinates before explicit tile consent');
  await page.locator('#e03-audit-map .run-map__tile-consent-button').evaluate(button=>button.click());
  await page.waitForTimeout(450);
  assert(outbound.length>0,'Map consent did not generate tile requests');
  assert(outbound.every(x=>x.type==='image'&&/^https:\/\/tile\.openstreetmap\.org\/\d+\/\d+\/\d+\.png$/.test(x.url)),`Unexpected external request with consent: ${JSON.stringify(outbound)}`);
  assert.equal(await page.locator('#e03-audit-map .run-map__tile-consent').evaluate(e=>e.hidden),true);
  assert(await page.locator('#e03-audit-map img.run-map__tile').count()>0,'Missing map tiles');
  await page.waitForFunction(()=>[...document.querySelectorAll('#e03-audit-map img.run-map__tile')].some(img=>img.complete&&img.naturalWidth>0),null,{timeout:7000}).catch(()=>{});
  const decoded=await page.locator('#e03-audit-map img.run-map__tile').evaluateAll(nodes=>nodes.some(img=>img.complete&&img.naturalWidth>0));
  assert(decoded,'CSP accepted tile URLs but no image decoded; not a render PASS');
  // The intentionally allowed inline boot-style fallback must actually render.
  const inlineStyle=await page.evaluate(()=>{
    const style=document.createElement('style');style.textContent='.e03-inline-probe{color:rgb(1, 2, 3)}';document.head.append(style);
    const probe=document.createElement('span');probe.className='e03-inline-probe';document.body.append(probe);
    return getComputedStyle(probe).color;
  });
  assert.equal(inlineStyle,'rgb(1, 2, 3)','Allowed inline style did not apply');
  // Explicitly probe CSP defenses; the script and network attempts MUST be blocked.
  // Live Server's development-only ws://localhost CSP exception must work,
  // without enabling off-origin WebSocket destinations.
  const localSocket=await page.evaluate(async()=>new Promise(resolve=>{
    const ws=new WebSocket(`ws://${location.host}/e03-local-ws`);
    const fail=setTimeout(()=>resolve('TIMEOUT'),4000);
    ws.onopen=()=>{clearTimeout(fail);resolve('OPEN');ws.close();};
    ws.onerror=()=>{clearTimeout(fail);resolve('ERROR');};
  }));
  assert.equal(localSocket,'OPEN','Localhost WebSocket policy must allow dev Live Server connection');
  const requestsBeforeOffline=outbound.length;
  await context.setOffline(true);
  await page.evaluate(()=>window.__e03Map.setZoom(18));
  await page.waitForTimeout(100);
  assert.equal(outbound.length,requestsBeforeOffline,'Offline mode must not issue new tile requests');
  await context.setOffline(false);
  const checks=await page.evaluate(async()=>{ 
   window.__e03InlineRun=false;
   const script=document.createElement('script');script.textContent='window.__e03InlineRun=true';document.body.appendChild(script);
   const before=window.__e03Violations.length;
   let externalFetchBlocked=false;
   try{await fetch('https://example.invalid/runload-e03-leak?lat=35.68',{mode:'no-cors'});}catch{externalFetchBlocked=true;}
   const image=document.createElement('img');image.src='https://example.invalid/forbidden.png';document.body.append(image);
   await new Promise(r=>setTimeout(r,400));
   const policies=window.__e03Violations;
   return {inlineExecuted:window.__e03InlineRun,externalFetchBlocked,policies,before};
  });
  csp.push(...checks.policies);
  assert.equal(checks.inlineExecuted,false,'Inline script bypassed script-src');
  assert.equal(checks.externalFetchBlocked,true,'External fetch bypassed connect-src');
  assert(checks.policies.some(x=>x.directive.startsWith('script-src')),'Inline violation absent');
  assert(checks.policies.some(x=>x.directive==='connect-src'),'connect-src violation absent');
  assert(checks.policies.some(x=>x.directive==='img-src'),'img-src violation absent');
  assert(outbound.every(x=>x.url.startsWith(TILE+'/')),`Unapproved outbound URL attempted: ${JSON.stringify(outbound)}`);
  await page.evaluate(()=>window.__e03Map.destroy());
  console.log(JSON.stringify({viewport,boot:200,localMissing:brokenAssets.length,preConsentExternal:0,postConsentAllowedTiles:outbound.length,localDevWebsocket:localSocket,offlineNoNewRequests:true,cspBlocked:csp.map(x=>x.directive),result:'PASS'}));
 }finally{await context.close();}
}
(async()=>{
 const {server,origin}=await serve();
 let browser;
 try{
  browser=await chromium.launch({headless:true,args:['--no-sandbox']});
  await audit(browser,origin,{width:1440,height:900});
  await audit(browser,origin,{width:390,height:844});
  console.log('E-03 browser CSP / local dependency / map-consent network gate PASS');
 }finally{await browser?.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});
