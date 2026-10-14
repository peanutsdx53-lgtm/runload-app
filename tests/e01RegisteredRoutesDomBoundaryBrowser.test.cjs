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
    // G-04: the skip link must reach the main landmark without changing the SPA route.
    const beforeSkipHash=await page.evaluate(()=>location.hash);
    await page.locator('.skip-link').focus();
    await page.keyboard.press('Enter');
    assert.equal(await page.evaluate(()=>location.hash),beforeSkipHash,'skip link must preserve the active screen');
    assert.equal(await page.evaluate(()=>document.activeElement?.id),'main-content','skip link must focus the primary content');
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
          // F-02: assistive technology announces alt, title and placeholders too.
          // Preserve technical identifiers in storage and DOM data attributes.
          const accessibilityStrings=[...content?.querySelectorAll('[title],[alt],[placeholder],[aria-description],[aria-valuetext]') || []]
            .flatMap(n=>['title','alt','placeholder','aria-description','aria-valuetext'].map(k=>n.getAttribute(k)).filter(Boolean));
          const exposedText=[visibleText,...accessibleNames,...accessibilityStrings].join(' ');
          const internalTokens=[...new Set(exposedText.match(/\b(?:BA-DISP-\d+|BFR-\d{3}-[A-Z]+|R(?:0[1-9]|1[0-2])|runload-primary-regional-reference100-[A-Za-z0-9.\-]+|INTERPRETATION_OUTPUT_V\d+|PRIMARY_REGIONAL_[A-Z0-9_]+|SOURCE_AUTHORED_MODEL|DIGITIZED_ORIGINAL_FIGURE|WITHIN_SOURCE_INTERPOLATION|REFERENCE_NOT_READY|AXIS_PRESERVED_NOT_COMBINED|RUNNING_CURRENT)\b/g) || [])];
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
          return {main:Boolean(content),landmarkCount:document.querySelectorAll("main").length,elements:unsafe.map(n=>n.outerHTML.slice(0,120)),executed:window.__e01RouteXss,hash:window.location.hash,
            headings,englishEyebrows,accessibleNameCount:accessibleNames.length,internalTokens,
            copyAudit:{visibleChars:normalizedText.length,japaneseCharacters,readableBlocks:readableBlocks.length,
              longestBlockChars:Math.max(0,...readableBlocks.map(x=>x.length)),clickableControls:clickable.length,
              stagedControls:staged.length}};
        });
        assert.ok(state.main,`${name}: main not present`);
        assert.equal(state.landmarkCount,1,`${name}: nested or missing main landmark on ${mobile?"mobile":"desktop"}`);
        // Browser approximation of text enlargement; physical VoiceOver/OS zoom remains a separate gate.
        if(['home','record-input','history','settings','run-measurement'].includes(name)){
          const zoom=await probe.evaluate(()=>{
            document.documentElement.style.zoom='2';
            const headings=[...document.querySelectorAll('#main-content h1,#main-content h2')]
              .filter(node=>node.getClientRects().length>0 && !node.closest('.visually-hidden,[aria-hidden="true"]'));
            const clipped=headings.filter(node=>{
              const s=getComputedStyle(node);
              return node.scrollWidth>node.clientWidth+3 && s.overflowX!=='visible';
            }).map(n=>n.textContent?.trim().slice(0,45));
            document.documentElement.style.zoom='';
            return {headings:headings.length,clipped};
          });
          assert.ok(zoom.headings>0,JSON.stringify({mobile,name,zoom}));
          assert.deepEqual(zoom.clipped,[],JSON.stringify({mobile,name,zoom}));
          console.log('G04_200_PERCENT_BROWSER_TEXT_ZOOM_PASS',JSON.stringify({mobile,name,headings:zoom.headings}));
        }
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

const SCIENTIFIC_CONCEPTS = {
  result: [/100/, /基準/, /部位/],
  history: [/履歴|記録/],
  'interpretation-room': [/記録|確認|振り返/],
  consultation: [/共有|相談/],
  simulation: [/条件|比較/],
  plan: [/予定/],
  'record-input': [/記録/],
  'body-part-detail': [/部位|記録/],
  'course-library': [/コース/],
  privacy: [/保存|データ/],
  terms: [/規約/],
  'body-timeline': [/身体|推移/],
  'run-route': [/走行軌跡|ルート/],
  'support-guidance': [/公的サポート|相談/],
  about: [/走行記録|クレジット/],
  home: [/走行記録|ホーム/],
  reading: [/ランニング/],
  'course-editor': [/コース/],
  'gpx-analysis': [/ルート|坂道/],
  'run-measurement': [/測定/],
  settings: [/設定/],
};
async function storedRunSemanticRoutes(browser,origin,mobile) {
  const context=await browser.newContext({viewport:mobile?{width:390,height:844}:{width:1440,height:900},serviceWorkers:'block'});
  const external=[],errors=[];
  await context.route('**/*',r=>r.request().url().startsWith(origin+'/')?r.continue():(external.push(r.request().url()),r.abort('blockedbyclient')));
  try {
    const page=await context.newPage();
    page.on('pageerror',err=>errors.push(String(err.message)));
    await page.goto(origin+'/index.html#/home',{waitUntil:'domcontentloaded',timeout:25000});
    await page.waitForSelector('.app-shell',{timeout:25000});
    const id='e01-semantic-'+(mobile?'mobile':'desktop');
    const persisted=await page.evaluate(async({id,payload})=>{
      const {createApplicationServices}=await import('/core/appCore.js');
      const services=createApplicationServices({storage:localStorage});
      const record={id,date:'2026-10-12',createdAt:'2026-10-12T10:00:00.000Z',
        activityType:'run',distanceKm:5,durationMinutes:30,runningFormat:'CONTINUOUS_RUN',
        course:{name:payload,gradeKnowledge:'UNKNOWN',modelSurfaceClass:'UNKNOWN'},
        reflectionContext:{postRunReflection:payload},comment:payload};
      const feedback={checkStatus:'deferred',bodyAreaObservations:[],safetyFlags:{}};
      const saved=services.workflows.records.saveRecordAndFeedback(record,feedback);
      const stored=services.workflows.records.loadExperience(id);
      return {ok:saved.ok,model:stored?.regionalV2ResultRecord?.model_version??null};
    },{id,payload:ATTACK});
    assert.equal(persisted.ok,true,JSON.stringify({mobile,persisted}));
    assert.match(persisted.model||'',/reference100-v3\.1/);
    const routes=Object.keys(SCIENTIFIC_CONCEPTS),trace=[];
    for(const name of routes){
      const query=new URLSearchParams({recordId:id,planId:id,returnTo:'#/result',regionId:'BA-DISP-014',articleId:'not-found'}).toString();
      await page.goto(origin+'/index.html#/'+name+'?'+query,{waitUntil:'domcontentloaded',timeout:18000});
      await page.waitForSelector('.app-shell',{timeout:18000});
      await page.waitForTimeout(45);
      // Touch mobile's dynamic result sheet and desktop's selected comparison state.
      if(name==='result'){
        const selector=mobile?'[data-action="open-result-region-sheet"]':'[data-pc-summary-mode="change"]';
        await page.locator(selector).first().click({timeout:2500}).catch(()=>{});
      }
      const state=await page.evaluate(()=>{
        const root=document.getElementById('app');
        const main=root?.querySelector('main#main-content');
        const text=main?.textContent||'';
        const names=[...root?.querySelectorAll('[aria-label],[aria-description],[aria-valuetext],[title],[alt],[placeholder]')||[]]
          .flatMap(n=>['aria-label','aria-description','aria-valuetext','title','alt','placeholder'].map(k=>n.getAttribute(k)).filter(Boolean)).join(' ');
        return {text,exposed:text+' '+names,
          injected:[...document.querySelectorAll('iframe,script[onload],[onerror],[onload],[onfocus],a[href^="javascript:"],img[src^="https://mal.invalid"]')]
            .filter(n=>n.closest('#app, #platform-header-root')).map(n=>n.outerHTML.slice(0,120)),
          escaped:window.__e01RouteXss||0};
      });
      assert.ok(state.text.length>10,JSON.stringify({mobile,name,problem:'empty route'}));
      for(const p of SCIENTIFIC_CONCEPTS[name])assert.match(state.text,p,JSON.stringify({mobile,name,missing:String(p)}));
      // Shared scientific meaning; layouts and heading styles may legitimately differ.
      if(name==='result') {
        assert.match(state.text,/100は安全値[、・]正常値/,JSON.stringify({mobile,name}));
        assert.match(state.text,/部位同士の(?:点数や)?順位/,JSON.stringify({mobile,name}));
      }
      if(name==='consultation') assert.match(state.text,/100|診断|自己判断/,JSON.stringify({mobile,name}));
      if(name==='body-timeline') assert.match(state.text,/部位同士の順位や危険度/,JSON.stringify({mobile,name}));
      if(name==='run-measurement') assert.match(state.text,mobile?/活動と測定方法/:/この端末では測定を利用できません/);
      if(name==='privacy') assert.match(state.text,/地図表示ではOpenStreetMap/,JSON.stringify({mobile,name}));
      assert.deepEqual(state.injected,[],JSON.stringify({mobile,name,unsafe:state.injected}));
      assert.equal(state.escaped,0,JSON.stringify({mobile,name}));
      const idMatch=state.exposed.match(/\b(?:BA-DISP-\d+|BFR-\d{3}-[A-Z]+|R(?:0[1-9]|1[0-2])|runload-primary-regional-reference100-[\w.-]+|PRIMARY_REGIONAL_[A-Z0-9_]+|SOURCE_AUTHORED_MODEL|P2_CROSS_SOURCE_BRIDGE|EVIDENCE_INSUFFICIENT|RUNNING_CURRENT)\b/g)||[];
      assert.deepEqual(idMatch,[],JSON.stringify({mobile,name,technical:idMatch}));
      const claims={
        record: /記録/.test(state.text),
        body: /部位|身体/.test(state.text),
        caveat: /安全値|正常値|診断|危険|リスク/.test(state.text),
        data: /保存|データ/.test(state.text),
      };
      trace.push({route:name,claims});
    }
    assert.deepEqual(errors,[],JSON.stringify({mobile,errors}));
    assert.equal(external.filter(s=>s.includes('mal.invalid')).length,0,JSON.stringify({mobile,external}));
    console.log('F02_F05_E01_STORED_RUN_CONDITIONAL_PASS',JSON.stringify({mobile,routes:trace.length,trace,external:external.length}));
    return trace;
  } finally{await context.close();}
}

(async()=>{
  const watchdog=setTimeout(()=>{console.error('E01_ROUTE_PROBE_GLOBAL_TIMEOUT_210S');process.exit(2);},210000);
  const {srv,origin}=await localServer();let browser;
  try{
    console.log('E01_ROUTE_CHROMIUM_LAUNCH');
    browser=await chromium.launch({headless:true,args:['--no-sandbox']});
    console.log('E01_ROUTE_CHROMIUM_READY');
    await platformRun(browser,origin,true);
    await platformRun(browser,origin,false);
    await storedRunSemanticRoutes(browser,origin,true);
    await storedRunSemanticRoutes(browser,origin,false);
    console.log('E01_46_PLATFORM_ROUTE_BROWSER_PROBE_PASS');
  }finally{await browser?.close();await new Promise(ok=>srv.close(ok));clearTimeout(watchdog);}
})().catch(e=>{console.error(e);process.exitCode=1;});
