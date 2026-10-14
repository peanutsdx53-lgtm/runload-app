'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs/promises');
const http=require('node:http');
const path=require('node:path');
const {chromium}=require('playwright');
const ROOT=path.resolve(__dirname,'..');
const MIME={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.webmanifest':'application/manifest+json'};
async function startServer(){
 const server=http.createServer(async(req,res)=>{
  try {
   const pathname=decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname);
   const target=path.resolve(ROOT,'.'+(pathname==='/'?'/index.html':pathname));
   if(!target.startsWith(ROOT+path.sep)){res.writeHead(403).end();return;}
   res.writeHead(200,{'content-type':MIME[path.extname(target)]||'application/octet-stream','cache-control':'no-store'}).end(await fs.readFile(target));
  }catch{res.writeHead(404).end();}
 });
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 return {server,url:'http://127.0.0.1:'+server.address().port};
}
(async()=>{
 const {server,url}=await startServer();
 let browser;
 try {
  browser=await chromium.launch({headless:true});
  const context=await browser.newContext({viewport:{width:390,height:844},serviceWorkers:'block',permissions:[]});
  // Native Chromium permission denial, not an invented geolocation callback.
  await context.clearPermissions();
  const page=await context.newPage(),errors=[];
  page.on('pageerror',err=>errors.push(err.message));
  await page.goto(url+'/index.html#/run-measurement',{waitUntil:'domcontentloaded',timeout:25000});
  await page.waitForSelector('[data-action="start-measurement"]',{timeout:25000});
  const permission=await page.evaluate(async()=>{
   try{return (await navigator.permissions.query({name:'geolocation'})).state;}catch{return 'unsupported';}
  });
  // Clicking via DOM bypasses the tutorial overlay, not the browser permission API.
  await page.evaluate(()=>document.querySelector('[data-action="start-measurement"]').click());
  await page.waitForFunction(()=>{
    const status=document.querySelector('[data-measurement-status]');
    return status && /許可されていません|取得できません|GPS エラー/.test(status.textContent||'');
  },{timeout:15000}).catch(async()=>{
    throw new Error('Native denied GPS did not produce accessible status: '+JSON.stringify(await page.evaluate(()=>({
      prep:document.querySelector('[data-measurement-prep-status]')?.textContent,
      active:document.querySelector('[data-measurement-status]')?.textContent,
      quality:document.querySelector('[data-run-measurement]')?.dataset.gpsQuality
    }))));
  });
  const after=await page.evaluate(()=>({
   status:document.querySelector('[data-measurement-status]')?.textContent,
   quality:document.querySelector('[data-run-measurement]')?.dataset.gpsQuality,
   distance:document.querySelector('[data-measurement-distance]')?.textContent,
   pace:document.querySelector('[data-measurement-current-pace]')?.textContent,
   indicator:document.querySelector('[data-measurement-step-value]')?.textContent,
  }));
  assert.equal(after.quality,'error',JSON.stringify({permission,after}));
  assert.equal(after.distance,'0.00',JSON.stringify(after));
  assert.equal(after.pace,'—',JSON.stringify(after));
  assert.ok(after.indicator==null||after.indicator==='—',JSON.stringify(after));
  assert.deepEqual(errors,[],'No page-level JavaScript exception during browser-native GPS denial');
  console.log('D05_E07_NATIVE_CHROMIUM_GPS_DENIAL_PASS',JSON.stringify({permission,after}));
  await context.close();
 } finally {await browser?.close();await new Promise(resolve=>server.close(resolve));}
})().catch(error=>{console.error(error);process.exitCode=1;});
