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
      let bytes = await fs.readFile(target);
      if (path.basename(target) === 'index.html') {
        // Security probing must not rely on production CSP to suppress injected
        // HTML; other H01/E03 browser suites verify the real deployed CSP.
        const original = bytes.toString('utf8');
        const withoutCsp = original.replace(/<meta\s+http-equiv=["']Content-Security-Policy["'][^>]*>\s*/i, '');
        assert.notEqual(withoutCsp, original, 'probe must actually remove CSP');
        bytes = Buffer.from(withoutCsp, 'utf8');
      }
      res.writeHead(200, {'content-type':(MIME[path.extname(target)] || 'application/octet-stream')+'; charset=utf-8','cache-control':'no-store'}).end(bytes);
    } catch {res.writeHead(404).end();}
  });
  return new Promise(resolve => srv.listen(0, '127.0.0.1', () => resolve({srv,origin:`http://127.0.0.1:${srv.address().port}`})));
}
async function platformRun(browser,origin,mobile) {
  console.log('E01_ROUTE_PLATFORM_START', mobile?'mobile':'desktop');
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
    console.log('E01_ROUTE_BOOT_START',mobile?'mobile':'desktop');
    const resp=await page.goto(origin+'/index.html#/home',{waitUntil:'domcontentloaded',timeout:25000});
    console.log('E01_ROUTE_BOOT_OK',mobile?'mobile':'desktop');
    assert.equal(resp.status(),200);
    assert.equal(await page.locator('meta[http-equiv="Content-Security-Policy"]').count(), 0, 'E01 route parser probe must run without meta CSP');
    await page.waitForSelector('.app-shell',{timeout:25000});
    const routeKeys=await page.evaluate(async mobile=>{
      const registry=mobile ? await import('/screens/mobileScreenRegistry.js') : await import('/screens/desktopScreenRegistry.js');
      return Object.keys(registry.createScreenRenderers());
    },mobile);
    assert.equal(routeKeys.length,mobile?24:22,JSON.stringify({mobile,routeKeys}));
    console.log('E01_ROUTE_REGISTRY',JSON.stringify({mobile,count:routeKeys.length}));
    const screens=[];
    const failures=[];
    const query=new URLSearchParams({recordId:'e01-record',planId:'e01-plan',id:'e01-course',returnTo:'#/home?x='+ATTACK, note:ATTACK,articleId:ATTACK}).toString();
    // A fresh page per route isolates navigation lifecycles and ensures the
    // requested renderer runs from a cold URL, not stale prior DOM state.
    await page.close();
    for(const name of routeKeys) {
      console.log('E01_ROUTE_PROBING',mobile?'mobile':'desktop',name);
      const probe=await context.newPage();
      probe.on('pageerror',err=>errors.push(String(err.message)));
      try {
        const response=await probe.goto(origin+'/index.html#/'+name+'?'+query,{waitUntil:'domcontentloaded',timeout:15000});
        assert.equal(response.status(),200,`${name}: response`);
        try {
          await probe.waitForSelector('.app-shell',{state:'attached',timeout:4000});
        } catch (error) {
          const diag=await probe.evaluate(()=>({
            href:location.href,readyState:document.readyState,
            title:document.title,bodyClass:document.body?.className,
            appExists:Boolean(document.getElementById('app')),
            appSnippet:document.getElementById('app')?.innerHTML.slice(0,400),
            heading:document.querySelector('h1')?.textContent,
          })).catch(e=>({diagnosticError:String(e)}));
          console.error('E01_ROUTE_BOOT_DIAGNOSTICS',JSON.stringify({mobile,name,diag,pageErrors:errors.slice(-5)}));
          throw error;
        }
        await probe.waitForTimeout(70);
        const state=await probe.evaluate(()=>{
          const root=document.getElementById('app');
          const content=root?.querySelector('main#main-content');
          const unsafe=[...document.querySelectorAll('script[onload],script[src^="https://mal.invalid"],iframe,[onerror],[onload],[onfocus],a[href^="javascript:"],img[src^="https://mal.invalid"]')]
            .filter(n=>n.closest('#app, #platform-header-root'));
          // Inspect actual rendered text and accessible names. Merely grepping
          // template strings does not prove that labels are visible to users.
          const visibleText=content?.innerText || "";
          const accessibleNames=[...content?.querySelectorAll('[aria-label]') || []]
            .map(node=>node.getAttribute('aria-label') || "");
          const exposedText=visibleText+" "+accessibleNames.join(" ");
          const internalTokens=[...new Set(exposedText.match(/\b(?:BA-DISP-\d+|SOURCE_AUTHORED_MODEL|DIGITIZED_ORIGINAL_FIGURE|WITHIN_SOURCE_INTERPOLATION|REFERENCE_NOT_READY|AXIS_PRESERVED_NOT_COMBINED|RUNNING_CURRENT)\b/g) || [])];
          const headings=[...content?.querySelectorAll('h1,h2,h3') || []]
            .map(node=>(node.innerText || "").trim()).filter(Boolean).slice(0,12);
          const englishEyebrows=[...content?.querySelectorAll('small') || []]
            .filter(node=>node.getClientRects().length > 0)
            .map(node=>(node.innerText || "").trim())
            .filter(text=>/^[A-Z][A-Z \/-]{3,}$/.test(text)).slice(0,16);
          // F-01/F-04: visible copy/staged-control census on registered real Chromium DOM.
          // Do not print synthetic stored text containing adversarial strings.
          const normalizedText=visibleText.replace(/\s+/g,' ').trim();
          const shown=selector=>[...content?.querySelectorAll(selector)||[]].filter(node=>node.getClientRects().length>0);
          const readableBlocks=shown('p,li,dd,summary').map(node=>(node.innerText||'').replace(/\s+/g,' ').trim()).filter(Boolean);
          const clickable=shown('button,a[href],[role="button"],input:not([type="hidden"])');
          const staged=shown('details,[aria-expanded],summary,dialog,[role="dialog"]');
          const japaneseCharacters=(normalizedText.match(/[ぁ-んァ-ヶ一-龠]/g)||[]).length;
          return {main:Boolean(content),elements:unsafe.map(n=>n.outerHTML.slice(0,120)),executed:window.__e01RouteXss,hash:window.location.hash,
            headings,englishEyebrows,accessibleNameCount:accessibleNames.length,internalTokens,
            copyAudit:{visibleChars:normalizedText.length,japaneseCharacters,readableBlocks:readableBlocks.length,
              longestBlockChars:Math.max(0,...readableBlocks.map(x=>x.length)),clickableControls:clickable.length,
              stagedControls:staged.length}};
        });
        assert.ok(state.main,`${name}: main not present`);
        assert.ok(state.hash.startsWith('#/'+name+'?'),`${name}: requested route did not survive`);
        assert.deepEqual(state.elements,[],`${name}: attacker created nodes`);
        assert.equal(state.executed,0,`${name}: script executed`);
        assert.deepEqual(state.internalTokens,[],`${name}: user-visible scientific internals must not leak into text/ARIA`);
        assert.ok(state.copyAudit.visibleChars>=2,`${name}: empty user copy`);
        assert.ok(state.copyAudit.japaneseCharacters>0,`${name}: Japanese user-facing text absent`);
        console.log('F01_F04_REGISTERED_SCREEN_COPY_AUDIT',JSON.stringify({mobile,name,...state.copyAudit}));
        console.log('F02_E01_ACTUAL_ROUTE_DOM',JSON.stringify({mobile,name,headings:state.headings,englishEyebrows:state.englishEyebrows,accessibleNameCount:state.accessibleNameCount,internalTokens:state.internalTokens}));
        screens.push(name);
        console.log('E01_ROUTE_DONE',mobile?'mobile':'desktop',name);
      } catch (error) {
        const failure={mobile,name,error:String(error).slice(0,320),pageErrors:errors.slice(-3)};
        failures.push(failure);
        console.error('E01_ROUTE_FAILURE',JSON.stringify(failure));
      } finally {
        await probe.close().catch(()=>{});
      }
    }
    assert.deepEqual(failures,[],`routes failed: ${JSON.stringify(failures)}`);
    assert.deepEqual(errors,[],`unexpected screen errors: ${errors.slice(0,5)}`);
    assert.equal(outgoing.filter(url=>url.includes('mal.invalid')).length,0,'attacker-controlled outbound request');
    assert.equal(screens.length, routeKeys.length, 'every registered renderer must be exercised without CSP');
    console.log('E01_ALL_REGISTERED_ROUTES_BROWSER_PASS',JSON.stringify({mobile,count:screens.length,viewport,externalRequests:outgoing.length}));
  }finally{await context.close();}
}
(async()=>{
  const watchdog=setTimeout(()=>{console.error('E01_ROUTE_PROBE_GLOBAL_TIMEOUT_150S');process.exit(2);},150000);
  const {srv,origin}=await localServer();let browser;
  try{
    console.log('E01_ROUTE_CHROMIUM_LAUNCH');
    browser=await chromium.launch({headless:true,args:['--no-sandbox']});
    console.log('E01_ROUTE_CHROMIUM_READY');
    await platformRun(browser,origin,true);
    await platformRun(browser,origin,false);
    console.log('E01_46_PLATFORM_ROUTE_BROWSER_PROBE_PASS');
  }finally{await browser?.close();await new Promise(ok=>srv.close(ok));clearTimeout(watchdog);}
})().catch(e=>{console.error(e);process.exitCode=1;});
