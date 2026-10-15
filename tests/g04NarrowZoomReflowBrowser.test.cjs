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
  await page.waitForSelector('.mobile-home-dock',{timeout:25000});
  await page.waitForFunction(()=>[...document.querySelectorAll('link[rel=stylesheet]')].some(l=>l.href.includes('mobile-zoom-reflow.css')),{timeout:12000});
  // Visual reviews must show the actual application, not the first-use tour.
  if(width>=320){
    await page.evaluate(()=>{
      const dialog=document.querySelector('[data-mobile-onboarding]');
      if(!dialog)return;
      const next=dialog.querySelector('[data-onboarding-next]');
      for(let i=0;i<3;i++) next?.click();
      const consent=dialog.querySelector('[data-onboarding-consent]');
      if(consent){consent.checked=true;consent.dispatchEvent(new Event('change',{bubbles:true}));}
      dialog.querySelector('[data-onboarding-complete]')?.click();
    });
    await page.waitForTimeout(180);
    if(width===390){
      const image=await page.screenshot({type:'jpeg',quality:68});
      console.log('G04_STANDARD_HOME_390_JPEG_BASE64',image.toString('base64'));
    }
  }
  const home=await page.evaluate(()=>{
    const dock=document.querySelector('.mobile-home-dock');
    const style=getComputedStyle(dock),box=dock.getBoundingClientRect();
    const buttons=[...dock.querySelectorAll('.mobile-home-dock__item')].map(x=>{const b=x.getBoundingClientRect();return {left:b.left,right:b.right,top:b.top,bottom:b.bottom,width:b.width};});
    const grid=document.querySelector('.mobile-home-grid');
    return {width:window.innerWidth,dock:{position:style.position,columns:style.gridTemplateColumns,rect:{left:box.left,right:box.right,top:box.top,bottom:box.bottom}},buttons,
      homeGrid: grid?getComputedStyle(grid).gridTemplateColumns:null};
  });
  assert.equal(home.buttons.length,4,JSON.stringify({width,home}));
  for(let i=0;i<home.buttons.length;i++){
    assert.ok(home.buttons[i].width>=28,JSON.stringify({width,home,i}));
    for(let j=i+1;j<home.buttons.length;j++)
      assert.equal(overlap(home.buttons[i],home.buttons[j]),false,JSON.stringify({width,i,j,home}));
  }
  if(width<=304){
    const magnified=await page.evaluate(()=>{
      const root=document.querySelector('.mobile-home-os');
      const head=root?.querySelector('.mobile-home-os__header');
      const actions=[...head?.querySelectorAll('.mobile-home-os__header-actions > *')||[]]
        .filter(node=>getComputedStyle(node).display!=='none')
        .map(node=>{const r=node.getBoundingClientRect();return {name:node.textContent.trim(),left:r.left,right:r.right,top:r.top,bottom:r.bottom};});
      const firstWidget=root?.querySelector('.mobile-home-widget');
      const widgetBox=firstWidget?.getBoundingClientRect();
      const widgetContents=firstWidget?[...firstWidget.querySelectorAll('strong,span,small')].filter(el=>el.getClientRects().length>0).map(el=>{const r=el.getBoundingClientRect();return {label:el.textContent.trim().slice(0,32),top:r.top,bottom:r.bottom};}):[];
      const state={overflowY:getComputedStyle(root).overflowY,scrollHeight:root.scrollHeight,
        clientHeight:root.clientHeight,actions,widgetBox:widgetBox?{top:widgetBox.top,bottom:widgetBox.bottom}:null,widgetContents};
      root.scrollTop=root.scrollHeight;
      state.scrollTop=root.scrollTop;
      const dock=root.querySelector('.mobile-home-dock').getBoundingClientRect();
      state.dockBottom=dock.bottom;
      return state;
    });
    assert.equal(magnified.overflowY,'auto',JSON.stringify({width,magnified}));
    assert.ok(magnified.scrollHeight>magnified.clientHeight+70,JSON.stringify({width,magnified}));
    assert.ok(magnified.scrollTop>50,JSON.stringify({width,magnified}));
    for(const item of magnified.actions){
      assert.ok(item.left>=-1&&item.right<=width+1,JSON.stringify({width,magnified,problem:'header action outside viewport'}));
    }
    assert.ok(magnified.dockBottom<=470+12,JSON.stringify({width,magnified,problem:'bottom dock unreachable after scroll'}));
    if(magnified.widgetBox)for(const item of magnified.widgetContents){
      assert.ok(item.top>=magnified.widgetBox.top-4 && item.bottom<=magnified.widgetBox.bottom+4,
        JSON.stringify({width,magnified,problem:'home widget text clipped'}));
    }
    console.log('G04_MAGNIFIED_HOME_READABLE_SCROLL_PASS',JSON.stringify({width,actions:magnified.actions.length,scroll:magnified.scrollTop}));
    assert.notEqual(home.dock.position,'fixed',JSON.stringify({width,home}));
    assert.ok(home.dock.rect.left>=-1 && home.dock.rect.right<=width+1,JSON.stringify({width,home}));
    await page.evaluate(()=>document.querySelector('.mobile-home-os')?.classList.add('is-home-editing'));
    const edit=await page.evaluate(()=>{
      const grid=document.querySelector('.mobile-home-grid');
      return {dockPosition:getComputedStyle(document.querySelector('.mobile-home-dock')).position,
        editGrid:grid?{overflowX:getComputedStyle(grid).overflowX,columns:getComputedStyle(grid).gridTemplateColumns}:null};
    });
    assert.notEqual(edit.dockPosition,'fixed',JSON.stringify({width,edit}));
    if(edit.editGrid)assert.equal(edit.editGrid.overflowX,'auto',JSON.stringify({width,edit}));
  } else{
    assert.equal(home.dock.position,'fixed',JSON.stringify({width,home}));
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
  console.log('G04_NARROW_ZOOM_REFLOW_BROWSER_PASS',JSON.stringify({width,homeDock:home.dock.position,recordSaveBar:record.position}));
 }finally{await context.close();}
}
(async()=>{const {srv,origin}=await server();let browser;
 try{browser=await chromium.launch({headless:true});for(const w of [195,205,256,320,390])await run(browser,origin,w);}
 finally{await browser?.close();await new Promise(ok=>srv.close(ok));}
})().catch(e=>{console.error(e);process.exitCode=1;});
