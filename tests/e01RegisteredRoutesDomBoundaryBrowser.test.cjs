'use strict';
// Real Chromium bounded E-01 regression: every registered platform route receives
// hostile persisted data and URL parameters. This is not a universal XSS proof.
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const http = require('node:http');
const path = require('node:path');
const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '..');
const MIME = {'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.webmanifest':'application/manifest+json'};
const ATTACK = '"><img src="https://mal.invalid/e01-route-exfil" onerror="window.__e01RouteXss=1"><svg onload="window.__e01RouteXss=1"></svg>';
async function localServer() {
  const srv = http.createServer(async (req, res) => {
    try {
      const uri = new URL(req.url, 'http://127.0.0.1');
      const relative = decodeURIComponent(uri.pathname === '/' ? '/index.html' : uri.pathname);
      const target = path.resolve(ROOT, '.' + relative);
      if (!target.startsWith(ROOT + path.sep)) {res.writeHead(403).end();return;}
      const bytes = await fs.readFile(target);
      res.writeHead(200, {'content-type':(MIME[path.extname(target)] || 'application/octet-stream')+'; charset=utf-8','cache-control':'no-store'}).end(bytes);
    } catch {res.writeHead(404).end();}
  });
  return new Promise(resolve => srv.listen(0, '127.0.0.1', () => resolve({srv,origin:`http://127.0.0.1:${srv.address().port}`})));
}
async function platformRun(browser,origin,mobile) {
  const viewport = mobile ? {width:390,height:844} : {width:1440,height:900};
  const context=await browser.newContext({viewport,serviceWorkers:'block'});
  const outgoing=[];
  await context.route('**/*', route => {
    const url=route.request().url();
    if (url.startsWith(origin+'/')) return route.continue();
    outgoing.push(url);return route.abort('blockedbyclient');
  });
  await context.addInitScript(payload => {
    window.__e01RouteXss=0;
    const pre='runner-load-app-new-v1-';
    const record={id:'e01-record',date:'2026-10-12',activityType:'run',distanceKm:5,durationMinutes:30,
      course:{name:payload},comment:payload,reflectionContext:{postRunReflection:payload}};
    const plan={id:'e01-plan',scheduledDate:'2026-10-13',planType:'run',plannedSession:{activityType:'run',distanceKm:5,durationMinutes:30,course:{name:payload}}};
    try {
      localStorage.setItem(pre+'records-v1',JSON.stringify([record]));
      localStorage.setItem(pre+'plans-v1',JSON.stringify([plan]));
      localStorage.setItem(pre+'courses-v1',JSON.stringify([{id:'e01-course',name:payload,course:{name:payload}}]));
      localStorage.setItem(pre+'profile-v1',JSON.stringify({runningGoalTags:[payload],experienceSelfAssessment:payload}));
      localStorage.setItem('running-record-mobile-quick-tools-v1',JSON.stringify({notes:payload,departureChecks:[]}));
    } catch { /* Storage-denial testing is separately owned by D-05/E-07. */ }
  },ATTACK);
  const errors=[];
  try {
    const page=await context.newPage();
    page.on('pageerror',err=>errors.push(String(err.message)));
    const resp=await page.goto(origin+'/index.html#/home',{waitUntil:'domcontentloaded',timeout:25000});
    assert.equal(resp.status(),200);
    await page.waitForSelector('.app-shell',{timeout:25000});
    const routeKeys=await page.evaluate(async mobile=>{
      const registry=mobile ? await import('/screens/mobileScreenRegistry.js') : await import('/screens/desktopScreenRegistry.js');
      return Object.keys(registry.createScreenRenderers());
    },mobile);
    assert.equal(routeKeys.length,mobile?24:22,JSON.stringify({mobile,routeKeys}));
    const screens=[];
    const query=new URLSearchParams({recordId:'e01-record',planId:'e01-plan',id:'e01-course',returnTo:'#/home?x='+ATTACK, note:ATTACK,articleId:ATTACK}).toString();
    for(const name of routeKeys) {
      await page.evaluate(({name,query})=>{window.location.hash=`#/${name}?${query}`;},{name,query});
      await page.waitForTimeout(90);
      const state=await page.evaluate(()=>{
        const root=document.getElementById('app');
        const content=root?.querySelector('main#main-content');
        const unsafe=[...document.querySelectorAll('script[onload],script[src^="https://mal.invalid"],iframe,[onerror],[onload],[onfocus],a[href^="javascript:"],img[src^="https://mal.invalid"]')]
          .filter(n=>n.closest('#app, #platform-header-root'));
        return {main:Boolean(content),elements:unsafe.map(n=>n.outerHTML.slice(0,120)),executed:window.__e01RouteXss,hash:window.location.hash};
      });
      assert.ok(state.main,`${name}: main not present`);
      assert.deepEqual(state.elements,[],`${name}: attacker created nodes`);
      assert.equal(state.executed,0,`${name}: script executed`);
      screens.push(name);
    }
    assert.deepEqual(errors,[],`unexpected screen errors: ${errors.slice(0,5)}`);
    assert.equal(outgoing.filter(url=>url.includes('mal.invalid')).length,0,'attacker-controlled outbound request');
    console.log('E01_ALL_REGISTERED_ROUTES_BROWSER_PASS',JSON.stringify({mobile,count:screens.length,viewport,externalRequests:outgoing.length}));
  }finally{await context.close();}
}
(async()=>{
  const {srv,origin}=await localServer();let browser;
  try{
    browser=await chromium.launch({headless:true,args:['--no-sandbox']});
    await platformRun(browser,origin,true);
    await platformRun(browser,origin,false);
    console.log('E01_46_PLATFORM_ROUTE_BROWSER_PROBE_PASS');
  }finally{await browser?.close();await new Promise(ok=>srv.close(ok));}
})().catch(e=>{console.error(e);process.exitCode=1;});
