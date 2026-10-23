const assert=require("node:assert/strict");
const {chromium}=require("playwright");
const {spawn}=require("node:child_process");
const fs=require("node:fs");
const path=require("node:path");
const BASE="http://127.0.0.1:4173";
(async()=>{
 const out="artifacts/exploration-visual-qa";
 fs.mkdirSync(out,{recursive:true});
 const server=spawn("python3",["-m","http.server","4173","--bind","127.0.0.1"],{cwd:process.cwd(),stdio:"ignore"});
 try{
  let ready=false;
  for(let i=0;i<45;i++){
   try{ready=(await fetch(BASE+"/index.html")).ok;}catch{}
   if(ready)break;
   await new Promise(r=>setTimeout(r,180));
  }
  assert.ok(ready);
  const browser=await chromium.launch({headless:true});
  try{
   for(const [width,height,label] of [[1600,900,"desktop"],[390,844,"mobile"],[320,700,"mobile-320"]]){
    const page=await browser.newPage({viewport:{width,height},deviceScaleFactor:1,serviceWorkers:"block"});
    await page.goto(BASE+"/#/exploration-tree",{waitUntil:"domcontentloaded"});
    await page.locator(".screen--exploration-tree").waitFor();
    if(width>=880){
     const gate=page.locator("[data-desktop-first-use]");
     if(await gate.count()){
      await gate.locator("[data-desktop-terms-consent]").check();
      await gate.locator("[data-desktop-terms-accept]").click();
     }
    }else{
     await page.evaluate(()=>{
      const overlay=document.querySelector("[data-mobile-onboarding]");
      if(!overlay)return;
      const next=overlay.querySelector("[data-onboarding-next]");
      for(let i=0;i<3;i++)next?.click();
      const yes=overlay.querySelector("[data-onboarding-consent]");
      if(yes){yes.checked=true;yes.dispatchEvent(new Event("change",{bubbles:true}));}
      overlay.querySelector("[data-onboarding-complete]")?.click();
     });
    }
    const guide=page.locator(".guide-dialog");
    if(await guide.count())await guide.locator("[data-guide-close]").first().click();
    await page.screenshot({path:path.join(out,label+"-map.png"),fullPage:true});
    if(width<880){
     await page.locator("[data-et-category='04']").click();
     await page.screenshot({path:path.join(out,label+"-topics.png"),fullPage:true});
     await page.locator("[data-et-mobile-topic='04-01']").click();
     await page.screenshot({path:path.join(out,label+"-detail.png"),fullPage:true});
    }else{
     await page.locator("[data-et-topic='02-04']").click();
     await page.screenshot({path:path.join(out,label+"-detail.png"),fullPage:true});
    }
    const data=await page.evaluate(()=>({width:innerWidth,height:innerHeight,docWidth:document.documentElement.scrollWidth,treeVisible:!!document.querySelector(".et-mini-tree")&&getComputedStyle(document.querySelector(".et-mini-tree")).display!=="none",articles:document.querySelectorAll(".et-library-entry").length}));
    assert.ok(data.docWidth<=data.width+2,JSON.stringify(data));
    fs.writeFileSync(path.join(out,label+".json"),JSON.stringify(data,null,2));
    await page.close();
   }
  }finally{await browser.close()}
 }finally{server.kill()}
})().catch(err=>{console.error(err);process.exitCode=1});
