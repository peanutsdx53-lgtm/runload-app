// Real browser smoke against the assembled RunLoad runtime; run with a local HTTP server.
const assert=require("node:assert/strict");
const {chromium}=require("playwright");
const {spawn}=require("node:child_process");
const BASE=process.env.RUNLOAD_TEST_ORIGIN||"http://127.0.0.1:4173";
(async()=>{
 let server=null;
 async function ready(){try{return (await fetch(BASE+"/index.html")).ok;}catch{return false;}}
 if(!await ready()){
  server=spawn("python3",["-m","http.server","4173","--bind","127.0.0.1"],{cwd:process.cwd(),stdio:"ignore"});
  for(let i=0;i<40&&!await ready();i++)await new Promise(resolve=>setTimeout(resolve,150));
  assert.equal(await ready(),true,"local RunLoad HTTP server must be reachable");
 }
 const browser=await chromium.launch({headless:true});
 try{
  for(const [width,height] of [[1600,900],[1280,800],[390,844],[320,640]]){
   const page=await browser.newPage({viewport:{width,height},serviceWorkers:"block"});
   const errors=[];
   page.on("pageerror",e=>errors.push(e.message));
   await page.goto(BASE+"/#/exploration-tree",{waitUntil:"domcontentloaded"});
   await page.locator(".screen--exploration-tree").waitFor({timeout:30000});
   // First-use legal/onboarding gates must be completed before real taps;
   // do not force pointer events through an active consent overlay.
   if(width>=880){
    const gate=page.locator("[data-desktop-first-use]");
    if(await gate.count()){
     await gate.locator("[data-desktop-terms-consent]").check();
     await gate.locator("[data-desktop-terms-accept]").click();
    }
   }else{
    await page.evaluate(()=>{
     const dialog=document.querySelector("[data-mobile-onboarding]");
     if(!dialog)return;
     const next=dialog.querySelector("[data-onboarding-next]");
     for(let i=0;i<3;i++)next?.click();
     const consent=dialog.querySelector("[data-onboarding-consent]");
     if(consent){consent.checked=true;consent.dispatchEvent(new Event("change",{bubbles:true}));}
     dialog.querySelector("[data-onboarding-complete]")?.click();
    });
    await page.waitForFunction(()=>{
     const dialog=document.querySelector("[data-mobile-onboarding]");
     return !dialog||getComputedStyle(dialog).display==="none"||!dialog.getClientRects().length;
    },null,{timeout:7000});
   }
   // Desktop onboarding deliberately opens the introductory Guide after
   // accepting terms. Close it through its real control before tree taps.
   const guide=page.locator(".guide-dialog");
   if(await guide.count()){
    await guide.locator(".guide-dialog__close").click();
    await guide.waitFor({state:"detached",timeout:7000});
   }
   const valid=await page.evaluate(()=>{
    const screen=document.querySelector(".screen--exploration-tree");
    return {categories:screen.querySelectorAll("[data-et-category]").length,
     desktopNavigation:!!document.querySelector(".primary-navigation [data-navigation-screen='exploration-tree']"),
     headings:screen.querySelectorAll("[data-et-detail]").length,
     hasPageOverflow:document.documentElement.scrollWidth>innerWidth+2};
   });
   assert.equal(valid.categories,7,width+" categories");
   assert.equal(valid.headings,56,width+" details duplicated mobile/desktop");
   assert.equal(valid.hasPageOverflow,false,width+" document overflow");
   if(width>=880)assert.equal(valid.desktopNavigation,true,width+" uses real navigation");
   if(width>=880){
    await page.evaluate(()=>document.querySelector('[data-et-topic="01-01"]').click());
    assert.equal(await page.locator(".et-detail [data-et-detail='01-01']").isVisible(),true);
    const article=page.locator(".et-detail [data-et-detail='01-01'] .et-inline-article");
    assert.equal(await article.count(),1);
    await article.locator("summary").click();
    assert.equal(await article.locator(".et-article-content").isVisible(),true);
   }else{
    async function checkSingleRow(routeLabel){
      const layout=await page.locator(".app-shell--w1-mobile > .primary-navigation").evaluate(nav=>{
       const links=[...nav.querySelectorAll(".primary-navigation__link")].filter(el=>getComputedStyle(el).display!=="none");
       const tops=links.map(el=>el.getBoundingClientRect().top);
       const rect=nav.getBoundingClientRect();
       return {names:links.map(el=>el.dataset.navigationScreen),tops,navWidth:rect.width,scrollWidth:nav.scrollWidth,clientWidth:nav.clientWidth};
      });
      assert.deepEqual(layout.names,["home","record-input","exploration-tree","history","settings"],width+" "+routeLabel+" destinations");
      assert.ok(Math.max(...layout.tops)-Math.min(...layout.tops)<2,width+" "+routeLabel+" navigation wrapped to two rows: "+JSON.stringify(layout));
    }
    await checkSingleRow("exploration");
    assert.equal(await page.locator(".et-mini-tree .et-mini-node").count(),7,width+" seven visible tree hubs");
    assert.equal(await page.locator(".et-mini-tree").isVisible(),true);
    await page.locator("[data-et-category='04']").click();
    assert.equal(await page.locator("[data-et-topic-list='04']").isVisible(),true);
    await page.locator("[data-et-mobile-topic='04-01']").click();
    assert.equal(await page.locator("[data-et-mobile-inline-detail]").isVisible(),true);
    assert.equal(await page.locator(".et-mobile-detail-panels [data-et-detail='04-01']").isVisible(),true);
    await page.locator("[data-et-close-detail]").click();
    assert.equal(await page.locator("[data-et-mobile-inline-detail]").isVisible(),false);
    assert.equal(await page.locator("[data-et-topic-list='04']").isVisible(),true);
    await page.goto(BASE+"/#/result",{waitUntil:"domcontentloaded"});
    await page.locator(".screen-layout--result").waitFor({timeout:20000});
    await checkSingleRow("result");
    if(width===390){
     // Exercise the actual stored-record -> Result -> Explore -> Result path.
     await page.evaluate(()=>{
      const record={id:"et-smoke-run",date:"2026-10-22",activityType:"run",distanceKm:5,durationMinutes:30,
       course:{name:"Regression route",gradeKnowledge:"UNKNOWN"}};
      localStorage.setItem("runner-load-app-new-v1-records-v1",JSON.stringify([record]));
     });
     // Complete onboarding at Home before opening a specific stored Result.
     // The completion handler may rerender the app and change its route.
     await page.goto(BASE+"/#/home",{waitUntil:"domcontentloaded"});
     // The onboarding overlay intentionally blocks first-use taps.
     await page.evaluate(()=>{
      const dialog=document.querySelector("[data-mobile-onboarding]");
      if(!dialog)return;
      const next=dialog.querySelector("[data-onboarding-next]");
      for(let i=0;i<3;i++)next?.click();
      const consent=dialog.querySelector("[data-onboarding-consent]");
      if(consent){consent.checked=true;consent.dispatchEvent(new Event("change",{bubbles:true}));}
      dialog.querySelector("[data-onboarding-complete]")?.click();
     });
     await page.waitForFunction(()=>{
      const dialog=document.querySelector("[data-mobile-onboarding]");
      return !dialog||getComputedStyle(dialog).display==="none"||!dialog.getClientRects().length;
     },null,{timeout:7000});
     await page.goto(BASE+"/#/result?recordId=et-smoke-run",{waitUntil:"domcontentloaded"});
     await page.locator(".understanding-link").waitFor({timeout:25000});
     const entry=await page.locator(".understanding-link").getAttribute("href");
     assert.match(entry,/^#\/exploration-tree\?recordId=et-smoke-run/,String(entry));
     await page.locator(".understanding-link").click();
     await page.locator(".screen--exploration-tree").waitFor({timeout:20000});
     assert.match(await page.locator(".et-status").textContent(),/今回の走り/);
     const diag=await page.evaluate(()=>({hash:location.hash,header:document.querySelector(".mobile-topbar")?.outerHTML.slice(0,1100)||"",shell:document.querySelector(".app-shell")?.className||""}));
     console.log("EXPLORATION_RESULT_ROUNDTRIP_DIAG",JSON.stringify(diag));
     assert.match(diag.hash,/^#\/exploration-tree\?recordId=et-smoke-run/);
     const back=page.locator(".mobile-topbar__back");
     assert.match(await back.getAttribute("href"),/^#\/result\?recordId=et-smoke-run/);
    }
   }
   assert.deepEqual(errors,[],width+" JS exceptions");
   await page.close();
  }
  console.log("EXPLORATION_TREE_REAL_BROWSER_PASS=4_VIEWPORTS");
 }finally{await browser.close();server?.kill();}
})().catch(e=>{console.error(e);process.exitCode=1});
