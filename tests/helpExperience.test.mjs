import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,'..');
const read=(rel)=>fs.readFileSync(path.join(root,rel),'utf8');
const results=[];
async function test(id,fn){try{await fn();results.push({id,status:'PASS'});}catch(error){results.push({id,status:'FAIL',message:error?.stack||String(error)});}}

await test('HELP-FIRST-USE-VERSION-UPDATED',()=>{
  const guide=read('ui/guideContent.js');
  assert.match(guide,/guide-context-help-20260923-v2/);
  assert.match(guide,/最初に3つの流れだけ確認します/);
  assert.doesNotMatch(guide,/後から確認できます/);
});

await test('HELP-FIRST-USE-HIDES-TABS-UNTIL-LATER',()=>{
  const guide=read('ui/guideContent.js');
  assert.match(guide,/const tabs = firstVisit\s*\? ""/);
  assert.match(guide,/const normalized = firstVisit \? DEFAULT_GUIDE_SECTION/);
});

await test('HELP-FIRST-USE-HAS-ALWAYS-VISIBLE-DISMISS-CONTROLS',()=>{
  const guide=read('ui/guideContent.js');
  const css=read('styles/components.css');
  assert.match(guide,/guide-dialog__panel--first-visit/);
  assert.match(guide,/data-guide-close/);
  assert.match(guide,/data-guide-complete/);
  assert.match(css,/\.guide-dialog__panel--first-visit\s*\{[^}]*grid-template-rows:\s*auto minmax\(0, 1fr\) auto;/s);
});

await test('HELP-STANDALONE-SHELL-RENDERS-GUIDE',()=>{
  const shell=read('ui/appShell.js');
  const standalone=shell.slice(shell.indexOf('if (standalone)'),shell.indexOf('const immersive'));
  assert.match(standalone,/renderGuideDialog/);
});

await test('HELP-IMMERSIVE-SHELL-RENDERS-GUIDE',()=>{
  const shell=read('ui/appShell.js');
  const immersive=shell.slice(shell.indexOf('if (immersive)'),shell.indexOf('return `',shell.indexOf('if (immersive)')+50));
  assert.match(shell,/context-help-button--immersive/);
  assert.match(shell,/app-shell--immersive[\s\S]*renderGuideDialog/);
});

await test('HELP-CONTEXT-BUTTONS-USE-SCREEN-SPECIFIC-TUTORIALS',()=>{
  const shell=read('ui/appShell.js');
  const tutorial=read('ui/screenTutorial.js');
  for(const mapping of [
    'home: "home"',
    '"record-input": "record-input"',
    'result: "result"',
    'history: "history"',
    'more: "more"',
    '"body-part-detail": "body-part-detail"',
    'simulation: "simulation"',
    'consultation: "consultation"',
    'reading: "reading"',
    'privacy: "privacy"',
    'settings: "settings"',
  ]) assert.ok(shell.includes(mapping),mapping);
  for(const tutorialId of ['home','record-input','result','history','more','body-part-detail','simulation','consultation','reading','privacy','settings']){
    assert.ok(tutorial.includes(`${JSON.stringify(tutorialId)}: Object.freeze`) || tutorial.includes(`${tutorialId}: Object.freeze`),tutorialId);
  }
  assert.match(shell,/data-screen-tutorial-start/);
  assert.match(shell,/アプリ説明/);
});

await test('HELP-START-SCREEN-USES-SHARED-QUESTION-BUTTON',()=>{
  const start=read('screens/startScreen.js');
  assert.match(start,/class="context-help-button app-utility-button"/);
  assert.match(start,/data-screen-tutorial-start="start"/);
  assert.match(start,/app-utility-button__question/);
});

await test('HELP-GPS-SCREEN-HAS-OPERATION-GUIDE',()=>{
  const screen=read('screens/runMeasurementScreen.js');
  const tutorial=read('ui/screenTutorial.js');
  assert.match(screen,/class="context-help-button app-utility-button context-help-button--measurement"/);
  assert.match(screen,/data-screen-tutorial-start="run-measurement"/);
  assert.match(tutorial,/"run-measurement": Object\.freeze/);
  assert.match(tutorial,/GPS測定の使い方/);
  assert.doesNotMatch(screen,/直近20秒のペースが予定平均より速い状態が10秒続いた場合/);
});

await test('HELP-DESKTOP-TUTORIAL-BINDING-IS-PRESENT',()=>{
  const app=read('app.js');
  assert.match(app,/bindScreenTutorial\(\{ root: desktopHeaderRoot, screenName \}\)/);
});

await test('HELP-STYLES-ARE-THEME-AWARE',()=>{
  const css=read('styles/components.css');
  assert.match(css,/\.context-help-button\s*\{/);
  assert.match(css,/var\(--color-surface\)/);
  assert.match(css,/var\(--color-accent-strong\)/);
});

const failed=results.filter((x)=>x.status==='FAIL');
console.log(JSON.stringify({suite:'Help Experience',total:results.length,passed:results.length-failed.length,failed:failed.length,status:failed.length?'FAIL':'PASS',results},null,2));
if(failed.length)process.exitCode=1;
