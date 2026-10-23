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
    await page.evaluate(()=>document.querySelector('.et-detail [data-et-detail="01-01"] [data-et-tab="article"]').click());
    assert.equal(await page.locator(".et-detail [data-et-detail='01-01'] [data-et-tab-panel='article']").isVisible(),true);
   }else{
    await page.evaluate(()=>document.querySelector("[data-et-category='04']").click());
    assert.equal(await page.locator("[data-et-mobile-page='branch-04']").isVisible(),true);
    await page.evaluate(()=>document.querySelector("[data-et-mobile-topic='04-01']").click());
    assert.equal(await page.locator("[data-et-mobile-page='detail']").isVisible(),true);
    await page.evaluate(()=>document.querySelector("[data-et-back='branch']").click());
    assert.equal(await page.locator("[data-et-mobile-page='branch-04']").isVisible(),true);
   }
   assert.deepEqual(errors,[],width+" JS exceptions");
   await page.close();
  }
  console.log("EXPLORATION_TREE_REAL_BROWSER_PASS=4_VIEWPORTS");
 }finally{await browser.close();server?.kill();}
})().catch(e=>{console.error(e);process.exitCode=1});
