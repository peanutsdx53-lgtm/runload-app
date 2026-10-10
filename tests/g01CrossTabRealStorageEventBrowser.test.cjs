'use strict';
// Genuine two-tab storage delivery over HTTP, executing the production history module.
const assert=require('node:assert/strict');
const http=require('node:http');
const fs=require('node:fs/promises');
const path=require('node:path');
const {chromium}=require('playwright');
const ROOT=path.resolve(__dirname,'..');
const KEY='runner-load-app-mobile-walk-jog-records-v1.3';
const row=d=>({id:'g01-live-cross-tab',createdAt:'2026-10-10T00:00:00Z',activityId:'WALK',
  distanceKm:d,durationMinutes:13,analysis:{segments:[]}});
async function startServer(){
  const server=http.createServer(async(req,res)=>{
    try{
      const pathname=new URL(req.url,'http://127.0.0.1').pathname;
      if(pathname==='/__g01_audit') {
        res.writeHead(200,{'content-type':'text/html; charset=utf-8','cache-control':'no-store'});
        res.end('<!doctype html><html><body><main class="screen-layout--history"><header class="page-head">履歴</header></main></body></html>');return;
      }
      const file=path.resolve(ROOT,'.'+decodeURIComponent(pathname));
      if(!file.startsWith(ROOT+path.sep)){res.writeHead(403).end();return;}
      const body=await fs.readFile(file);
      res.writeHead(200,{'content-type':'text/javascript; charset=utf-8','cache-control':'no-store'}).end(body);
    }catch{res.writeHead(404).end('Not Found');}
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  return {server,origin:'http://127.0.0.1:'+server.address().port};
}
async function waitFor(view,text){
  await view.waitForFunction(s=>Boolean(document.querySelector('[data-mobile-activity-history]')?.textContent.includes(s)),text,{timeout:12000});
  return view.locator('[data-mobile-activity-history]').innerText();
}
(async()=>{
 const {server,origin}=await startServer();let browser;
 try{
  browser=await chromium.launch({headless:true,args:['--no-sandbox']});
  for(const viewport of [{width:390,height:844},{width:800,height:900}]){
   const context=await browser.newContext({viewport,serviceWorkers:'block'});
   try{
    const writer=await context.newPage(),viewer=await context.newPage();
    await Promise.all([writer.goto(origin+'/__g01_audit'),viewer.goto(origin+'/__g01_audit')]);
    await writer.evaluate(({key,rows})=>localStorage.setItem(key,JSON.stringify(rows)),{key:KEY,rows:[row(1.1)]});
    await viewer.evaluate(async()=>{
      window.__g01StorageEvents=[];
      addEventListener('storage',e=>window.__g01StorageEvents.push(e.key));
      window.location.hash='#/history?mobileActivity=1';
      const {installMobileWalkJogHistoryUi}=await import('/ui/mobileWalkJogHistoryUi.js');
      window.__g01Dispose=installMobileWalkJogHistoryUi();
    });
    assert.match(await waitFor(viewer,'1.10'),/1\.10/);
    await writer.evaluate(({key,rows})=>localStorage.setItem(key,JSON.stringify(rows)),{key:KEY,rows:[row(8.4)]});
    assert.match(await waitFor(viewer,'8.40'),/8\.40/);
    assert.equal(await viewer.evaluate(key=>window.__g01StorageEvents.includes(key),KEY),true,'No real storage event received');
    assert.equal(await writer.evaluate(key=>JSON.parse(localStorage.getItem(key))[0].distanceKm,KEY),8.4,'Read-only history rewrote data');
    const previous=await viewer.locator('[data-mobile-activity-history]').innerHTML();
    await writer.evaluate(()=>localStorage.setItem('unrelated-g01-audit-key','other'));
    await viewer.waitForFunction(()=>window.__g01StorageEvents.length>=2);
    assert.equal(await viewer.locator('[data-mobile-activity-history]').innerHTML(),previous,'Unrelated key changed view');
    await writer.evaluate(key=>localStorage.removeItem(key),KEY);
    assert.match(await waitFor(viewer,'活動別記録はまだありません'),/活動別記録はまだありません/);
    await writer.evaluate(({key,rows})=>localStorage.setItem(key,JSON.stringify(rows)),{key:KEY,rows:[row(3.2)]});
    assert.match(await waitFor(viewer,'3.20'),/3\.20/);
    await writer.evaluate(()=>localStorage.clear());
    assert.match(await waitFor(viewer,'活動別記録はまだありません'),/活動別記録はまだありません/);
    await viewer.evaluate(()=>window.__g01Dispose());
    console.log('G01_REAL_CROSSTAB_BROWSER_PASS',JSON.stringify(viewport));
   }finally{await context.close();}
  }
 }finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
})().catch(e=>{console.error(e);process.exitCode=1;});
