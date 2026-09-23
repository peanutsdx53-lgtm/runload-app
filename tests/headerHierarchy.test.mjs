import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,'..');
const read=(rel)=>fs.readFileSync(path.join(root,rel),'utf8');
const results=[];
async function test(id,fn){try{await fn();results.push({id,status:'PASS'});}catch(error){results.push({id,status:'FAIL',message:error?.stack||String(error)});}}

await test('HEADER-SHELL-REMOVES-DUPLICATE-CONTEXT-LABELS',()=>{
  const shell=read('ui/appShell.js');
  assert.ok(!shell.includes('TOPBAR_CONTEXT_LABELS'));
  assert.ok(!shell.includes('app-screen-context'));
  assert.ok(!shell.includes('app-menu-button__label'));
});

await test('HEADER-MOBILE-USES-BRAND-AND-UTILITY-CONTROLS',()=>{
  const shell=read('ui/appShell.js');
  assert.ok(shell.includes('mobile-topbar__brand'));
  assert.ok(shell.includes('<strong>RunLoad</strong>'));
  assert.ok(shell.includes('app-utility-button'));
  assert.ok(shell.includes('app-utility-button__icon'));
});

await test('HEADER-DESKTOP-USES-BRAND-NOT-SCREEN-NAME',()=>{
  const shell=read('ui/appShell.js');
  assert.ok(shell.includes('class="app-header__brand"'));
  assert.ok(shell.includes('aria-label="RunLoad Home"'));
});

await test('HEADER-IMMERSIVE-HAS-BACK-HELP-AND-MENU',()=>{
  const shell=read('ui/appShell.js');
  assert.ok(shell.includes('interpretation-room-header__actions'));
  assert.ok(shell.includes('idSuffix: "immersive"'));
});

await test('HEADER-UTILITY-CONTROLS-SHARE-GEOMETRY',()=>{
  const css=read('styles/components.css');
  assert.ok(css.includes('.app-utility-button {'));
  assert.ok(css.includes('width: 2.75rem;'));
  assert.ok(css.includes('height: 2.75rem;'));
  assert.ok(css.includes('border-radius: 0.9rem;'));
});

await test('HEADER-HOME-HAS-SINGLE-PAGE-TITLE',()=>{
  const home=read('screens/homeScreen.js');
  assert.ok(home.includes('<section class="page-head"><div><h1>今日</h1></div></section>'));
  assert.ok(!home.includes('<p class="eyebrow">TODAY</p>'));
  assert.ok(home.includes('class="secondary home-measure-link"'));
  assert.ok(home.includes('GPSで測定'));
});

await test('HEADER-PRIMARY-EYEBROWS-ARE-HIDDEN',()=>{
  const css=read('styles/components.css');
  assert.ok(css.includes('.screen > .page-head > div > .eyebrow'));
  assert.ok(css.includes('.screen > .intro > .eyebrow'));
  assert.ok(css.includes('.screen .detail-main > .detail-title > .eyebrow'));
  assert.ok(css.includes('.course-derived-body > .eyebrow'));
});

await test('HEADER-IMMERSIVE-HELP-FOCUS-RESTORES-CORRECTLY',()=>{
  const app=read('app.js');
  assert.ok(app.includes('currentLocation.screen === "interpretation-room"'));
  assert.ok(app.includes('.interpretation-room-header .context-help-button'));
});

const failed=results.filter((item)=>item.status==='FAIL');
console.log(JSON.stringify({suite:'Header Hierarchy',total:results.length,passed:results.length-failed.length,failed:failed.length,status:failed.length?'FAIL':'PASS',results},null,2));
if(failed.length)process.exitCode=1;
