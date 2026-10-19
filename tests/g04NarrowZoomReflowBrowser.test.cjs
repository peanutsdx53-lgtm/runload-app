'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs/promises');
const http=require('node:http');
const path=require('node:path');
const {chromium}=require('playwright');
const ROOT=path.resolve(__dirname,'..');
const MIME={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.webmanifest':'application/manifest+json'};
function overlap(a,b){
 const w=Math.min(a.right,b.right)-Math.max(a.left,b.left);
 const h=Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top);
 return w>2&&h>2;
}
async function server(){
 const srv=http.createServer(async(req,res)=>{
  try {
   const p=decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname);
   const target=path.resolve(ROOT,'.'+(p==='/'?'/index.html':p));
   if(!target.startsWith(ROOT+path.sep))return res.writeHead(403).end();
   res.writeHead(200,{'content-type':MIME[path.extname(target)]||'application/octet-stream','cache-control':'no-store'}).end(await fs.readFile(target));
  }catch{return res.writeHead(404).end();}
 });
 return await new Promise(resolve=>srv.listen(0,'127.0.0.1',()=>resolve({srv,origin:'http://127.0.0.1:'+srv.address().port})));
}
async function run(browser,origin,width) {
 const context=await browser.newContext({viewport:{width,height:470},serviceWorkers:'block'});
 await context.route('**/*',route=>route.request().url().startsWith(origin+'/')?route.continue():route.abort('blockedbyclient'));
 const page=await context.newPage();
 const errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 try{
  await page.goto(origin+'/index.html#/home',{waitUntil:'domcontentloaded',timeout:20000});
  await page.waitForSelector('.w1-mobile-home .home-dashboard-cards',{timeout:25000});
  await page.waitForSelector('.app-shell--w1-mobile > .primary-navigation',{timeout:12000});
  // Finish the product's first-use tutorial through its actual controls.
  // Otherwise its modal legitimately intercepts later settings clicks.
  await page.evaluate(()=>{
    const dialog=document.querySelector('[data-mobile-onboarding]');
    if(!dialog)return;
    const next=dialog.querySelector('[data-onboarding-next]');
    for(let i=0;i<3;i++)next?.click();
    const consent=dialog.querySelector('[data-onboarding-consent]');
    if(consent){consent.checked=true;consent.dispatchEvent(new Event('change',{bubbles:true}));}
    dialog.querySelector('[data-onboarding-complete]')?.click();
  });
  await page.waitForFunction(()=>{
    const dialog=document.querySelector('[data-mobile-onboarding]');
    return !dialog||getComputedStyle(dialog).display==='none'||!dialog.getClientRects().length;
  },null,{timeout:5000});
  await page.waitForFunction(()=>[...document.querySelectorAll('link[rel=stylesheet]')].some(l=>l.href.includes('mobile-zoom-reflow.css')),{timeout:12000});
  // Test the APPROVED W6 dashboard and four primary destinations, not retired
  // OS-like home widgets or the deleted mobile-home-dock implementation.
  const home=await page.evaluate(()=>{
    const nav=document.querySelector('.app-shell--w1-mobile > .primary-navigation');
    const box=nav.getBoundingClientRect();
    const items=[...nav.querySelectorAll('[data-navigation-screen]')].map(x=>{
      const r=x.getBoundingClientRect();
      return {route:x.getAttribute('data-navigation-screen'),label:x.textContent.trim(),
        left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:r.width,height:r.height};
    });
    return {width:innerWidth,documentWidth:document.documentElement.scrollWidth,
      pageHeight:document.documentElement.scrollHeight,viewportHeight:innerHeight,
      navPosition:getComputedStyle(nav).position,
      navRect:{left:box.left,right:box.right,top:box.top,bottom:box.bottom},items,
      cards:document.querySelectorAll('.home-dashboard-cards .home-dashboard-card').length,
      editor:!!document.querySelector('[data-w1-edit-home]'),
      start:!!document.querySelector('.w1-mobile-hero [href="#/record-input"]')};
  });
  assert.deepEqual(home.items.map(x=>x.route),['home','record-input','history','settings'],JSON.stringify({width,home}));
  assert.ok(home.cards>0&&home.editor&&home.start,JSON.stringify({width,home,problem:'W6 dashboard not rendered'}));
  assert.ok(home.documentWidth<=width+2,JSON.stringify({width,home,problem:'unwanted horizontal scroll'}));
  for(let i=0;i<home.items.length;i++){
    const item=home.items[i];
    assert.ok(item.width>=28&&item.height>=40,JSON.stringify({width,item}));
    assert.ok(item.left>=-1&&item.right<=width+1,JSON.stringify({width,item,problem:'navigation outside viewport'}));
    for(let j=i+1;j<home.items.length;j++)
      assert.equal(overlap(home.items[i],home.items[j]),false,JSON.stringify({width,home,i,j}));
  }
  // At <=350px, the dashboard's 2x2 nav is in the document flow so that it
  // cannot hide content. At ordinary width it is a fixed four-item dock.
  assert.equal(home.navPosition,width<=350?'static':'fixed',JSON.stringify({width,home}));
  if(width<=350){
    assert.ok(home.pageHeight>home.viewportHeight+50,JSON.stringify({width,home,problem:'page should be scrollable'}));
    const scroll=await page.evaluate(()=>{
      window.scrollTo(0,document.documentElement.scrollHeight);
      return {scrollY:window.scrollY,navBottom:document.querySelector('.primary-navigation').getBoundingClientRect().bottom};
    });
    assert.ok(scroll.scrollY>20,JSON.stringify({width,scroll,problem:'dashboard cannot be scrolled'}));
    assert.ok(scroll.navBottom<=470+12,JSON.stringify({width,scroll,problem:'navigation unreachable'}));
    console.log('G04_W6_NARROW_DASHBOARD_SCROLL_PASS',JSON.stringify({width,scrollY:scroll.scrollY}));
  }
  if(width===390){
    // The actual browser screenshot is retained by CI on failure; the test
    // intentionally avoids logging a large base64 image into H01 logs.
    console.log('G04_W6_STANDARD_HOME_PASS',JSON.stringify({width,cards:home.cards}));
  }
  await page.goto(origin+'/index.html#/record-input',{waitUntil:'domcontentloaded',timeout:20000});
  await page.waitForSelector('.screen-layout--record .mobile-save-bar',{timeout:25000});
  const record=await page.evaluate(()=>{
    const bar=document.querySelector('.screen-layout--record .mobile-save-bar');
    const style=getComputedStyle(bar),r=bar.getBoundingClientRect();
    const rects=[...bar.querySelectorAll('button')].map(node=>{const x=node.getBoundingClientRect();return {left:x.left,right:x.right,top:x.top,bottom:x.bottom};});
    const progress=document.querySelector('.mobile-record-progress');
    return {position:style.position,columns:style.gridTemplateColumns,width:window.innerWidth,
      bar:{left:r.left,right:r.right,top:r.top,bottom:r.bottom},buttons:rects,
      progress:progress?getComputedStyle(progress).gridTemplateColumns:null};
  });
  if(width<=304){
    assert.equal(record.position,'static',JSON.stringify({width,record}));
    assert.ok(record.bar.left>=-1&&record.bar.right<=width+1,JSON.stringify({width,record}));
    assert.equal(record.buttons.length,2,JSON.stringify({width,record}));
    assert.equal(overlap(record.buttons[0],record.buttons[1]),false,JSON.stringify({width,record}));
  }else{
    assert.equal(record.position,'fixed',JSON.stringify({width,record}));
  }

  if(width>=320){
    await page.goto(origin+'/index.html#/settings',{waitUntil:'domcontentloaded',timeout:20000});
    await page.waitForSelector('.screen--settings .head p:not(.eyebrow)',{timeout:20000});
    const standard=await page.evaluate(()=>{
      const el=document.querySelector('.screen--settings .head p:not(.eyebrow)');
      return {font:parseFloat(getComputedStyle(el).fontSize),html:document.documentElement.className,
        pageScroll:document.documentElement.scrollWidth};
    });
    if(width===390){
      const image=await page.screenshot({type:'jpeg',quality:68});
      console.log('G04_STANDARD_SETTINGS390_JPEG_BASE64',image.toString('base64'));
    }
    // Choose the actual RunLoad setting through the visible form, not
    // a synthetic CSS-class toggle and not Safari's page zoom.
    await page.locator('details.display-setting').first().locator('summary').click();
    await page.locator('label.display-choice').filter({
      has:page.locator('input[name="textSize"][value="large"]')
    }).click();
    await page.waitForFunction(()=>document.documentElement.classList.contains('rl-text-large'),{timeout:5000});
    assert.equal(await page.locator('[data-display-setting-value="textSize"]').textContent(),'大きめ');
    const large=await page.evaluate(()=>{
      const el=document.querySelector('.screen--settings .head p:not(.eyebrow)');
      return {font:parseFloat(getComputedStyle(el).fontSize),html:document.documentElement.className,
        pageScroll:document.documentElement.scrollWidth};
    });
    assert.ok(large.font>=standard.font+1.5,JSON.stringify({width,standard,large,problem:'in-app text size is ineffective'}));
    assert.ok(large.html.includes('rl-text-large'),JSON.stringify({width,large}));
    assert.ok(large.pageScroll<=width+2,JSON.stringify({width,large,problem:'horizontal overflow'}));
    if(width===390){
      const image=await page.screenshot({type:'jpeg',quality:68});
      console.log('G04_LARGE_SETTINGS390_JPEG_BASE64',image.toString('base64'));
    }
    await page.reload({waitUntil:'domcontentloaded'});
    await page.waitForSelector('.screen--settings .head p:not(.eyebrow)',{timeout:15000});
    const persisted=await page.evaluate(()=>({
      className:document.documentElement.className,
      font:parseFloat(getComputedStyle(document.querySelector('.screen--settings .head p:not(.eyebrow)')).fontSize),
    }));
    assert.ok(persisted.className.includes('rl-text-large')&&persisted.font>=large.font-0.1,
      JSON.stringify({width,standard,large,persisted,problem:'text preference lost on reload'}));
    console.log('G04_100_PERCENT_TEXT_SETTING_BROWSER_PASS',JSON.stringify({width,standard:standard.font,large:large.font,persisted:persisted.font}));
  }
  assert.deepEqual(errors,[],JSON.stringify({width,errors}));
  console.log('G04_NARROW_ZOOM_REFLOW_BROWSER_PASS',JSON.stringify({width,nav:home.navPosition,recordSaveBar:record.position}));
 }finally{await context.close();}
}
(async()=>{const {srv,origin}=await server();let browser;
 try{browser=await chromium.launch({headless:true});for(const w of [195,205,256,320,390])await run(browser,origin,w);}
 finally{await browser?.close();await new Promise(ok=>srv.close(ok));}
})().catch(e=>{console.error(e);process.exitCode=1;});
