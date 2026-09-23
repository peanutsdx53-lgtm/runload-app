import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,'..');
const read=(rel)=>fs.readFileSync(path.join(root,rel),'utf8');
const results=[];
async function test(id,fn){try{await fn();results.push({id,status:'PASS'});}catch(error){results.push({id,status:'FAIL',message:error?.stack||String(error)});}}

function hexRgb(value){
  const match=String(value||'').trim().match(/^#([0-9a-f]{6})$/i);
  if(!match)return null;
  const n=parseInt(match[1],16);
  return [(n>>16)&255,(n>>8)&255,n&255];
}
function luminance(value){
  const rgb=hexRgb(value);
  if(!rgb)return null;
  const channels=rgb.map((v)=>{const x=v/255;return x<=0.04045?x/12.92:Math.pow((x+0.055)/1.055,2.4);});
  return channels[0]*0.2126+channels[1]*0.7152+channels[2]*0.0722;
}
function contrast(a,b){
  const left=luminance(a),right=luminance(b);
  if(left==null||right==null)return null;
  return (Math.max(left,right)+0.05)/(Math.min(left,right)+0.05);
}
function cssBlock(css,selector){
  const start=css.indexOf(selector);
  if(start<0)return '';
  const open=css.indexOf('{',start);
  const close=css.indexOf('}',open+1);
  return open>=0&&close>=0?css.slice(open+1,close):'';
}
function variable(cssBlockText,name){
  const start=cssBlockText.indexOf(name+':');
  if(start<0)return '';
  const valueStart=start+name.length+1;
  const end=cssBlockText.indexOf(';',valueStart);
  return end>=0?cssBlockText.slice(valueStart,end).trim():'';
}

await test('UI-TOKENS-DEFINE-ROLE-SIZES',()=>{
  const css=read('styles/tokens.css');
  for(const token of ['--type-label','--type-caption','--type-body','--type-control','--button-height-medium','--button-min-inline-medium']){
    assert.ok(css.includes(token),token);
  }
});

await test('UI-NO-LEGACY-GLOBAL-FULL-WIDTH-BUTTON-FORCING',()=>{
  const css=read('styles/components.css');
  assert.equal((css.match(/flex:\s*1 1 100%/g)||[]).length,0);
  assert.ok(css.includes('width: fit-content;'));
});

await test('UI-TUTORIAL-ACTIONS-ARE-THREE-COLUMN-ON-MOBILE',()=>{
  const css=read('styles/components.css');
  assert.ok(css.includes('grid-template-columns: repeat(3, minmax(0, 1fr));'));
  const tutorial=read('ui/screenTutorial.js');
  assert.doesNotMatch(tutorial,/title:\s*"[123]\/3 /);
});

await test('UI-JAPANESE-LABELS-USE-NATURAL-WRAPPING',()=>{
  const css=read('styles/base.css');
  const uiLabelRule=css.slice(css.indexOf(':is(h1, h2, h3, button, summary, strong, small)'),css.indexOf('@media (prefers-reduced-motion'));
  assert.doesNotMatch(uiLabelRule,/overflow-wrap:\s*anywhere/);
  assert.match(uiLabelRule,/line-break:\s*strict/);
  assert.match(css,/a\[href\^="http"\]::after[^}]*overflow-wrap:\s*anywhere/);
});

await test('UI-MOBILE-INPUTS-USE-READABLE-TYPE',()=>{
  const css=read('styles/mobile.css');
  assert.ok(css.includes('Mobile typography floor'));
  assert.ok(css.includes('font-size: 1rem !important;'));
});

await test('UI-HOME-REMOVES-REDUNDANT-EMPTY-STATE-COPY',()=>{
  const home=read('screens/homeScreen.js');
  const desktop=read('styles/desktop-foundation.css');
  assert.ok(!home.includes('最新の保存記録'));
  assert.ok(!home.includes('最初の記録'));
  assert.ok(!home.includes('記録すると、ここから結果を開けます'));
  assert.ok(desktop.includes('grid-template-rows: repeat(2, minmax(0, 1fr));'));
});

await test('UI-RECORD-SURFACES-OPTIONAL-ENTRY-STATUS',()=>{
  const screen=read('screens/recordInputScreen.js');
  const interactions=read('ui/interactions/recordInputInteractions.js');
  assert.ok(!screen.includes('今日の記録</h1>'));
  for(const key of ['course','compare','reflection']){
    assert.ok(screen.includes(`data-optional-status="${key}"`),key);
    assert.ok(screen.includes(`data-save-optional="${key}"`),key);
  }
  assert.ok(interactions.includes('function updateOptionalInputStatus(form)'));
  assert.ok(interactions.includes('[data-run-fields], [data-run-optional]'));
  assert.ok(!screen.includes('任意項目は空欄のままでも保存できます。'));
  assert.ok(!screen.includes('入力途中は、この端末に下書きとして保存されます。'));
});

await test('UI-FATIGUE-SLIDER-HAS-DIRECT-MANIPULATION-AFFORDANCE',()=>{
  const screen=read('screens/recordInputScreen.js');
  const interactions=read('ui/interactions/recordInputInteractions.js');
  const css=read('styles/mobile.css');
  assert.ok(screen.includes('class="rof-close-button"'));
  assert.ok(screen.includes('data-rof-slider-wrap'));
  assert.ok(interactions.includes('is-untouched'));
  assert.ok(css.includes('runload-rof-thumb-hint'));
  assert.ok(css.includes('width: 44px !important;'));
});

await test('UI-RESULT-REMOVES-PERSISTENT-EXPLANATION-CLUTTER',()=>{
  const screen=read('screens/resultScreen.js');
  assert.ok(screen.includes('class="result-next-actions"'));
  assert.ok(!screen.includes('rof-boundary-details'));
  assert.ok(!screen.includes('class="compact-boundary"'));
  assert.ok(!screen.includes('色で12部位を確認'));
});

await test('UI-INTERPRETATION-HAS-DESKTOP-WORKSPACE',()=>{
  const css=read('styles/interpretation-room.css');
  const presentation=read('ui/interpretationRoomPresentation.js');
  assert.ok(css.includes('Responsive interpretation workspace'));
  assert.ok(css.includes('grid-template-columns: repeat(12, minmax(0, 1fr));'));
  assert.ok(css.includes('.interpretation-room--selected .interpretation-room-selected'));
  assert.ok(presentation.includes('12部位から選ぶ'));
  assert.ok(presentation.includes('分かること / 分からないこと'));
});

await test('UI-DESKTOP-WIDE-GRIDS-ARE-BALANCED',()=>{
  const css=read('styles/desktop.css');
  assert.ok(css.includes('.screen--history.screen-layout--history .record-list {\n    grid-template-columns: repeat(3'));
  assert.ok(css.includes('.screen--plan.screen-layout--plan .saved-list {\n    grid-template-columns: repeat(3'));
  assert.ok(css.includes('.screen--course-library.screen-layout--course .list {\n    grid-template-columns: repeat(3'));
});

await test('UI-LIGHT-THEME-MUTED-TEXT-MEETS-CONTRAST',()=>{
  const css=read('styles/tokens.css');
  const rootBlock=cssBlock(css,':root');
  const standardMuted=variable(rootBlock,'--color-muted');
  const standardPaper=variable(rootBlock,'--color-paper');
  assert.ok(contrast(standardMuted,standardPaper)>=4.5,'standard');

  for(const selector of ['html.rl-color-green','html.rl-color-blue']){
    const theme=cssBlock(css,selector);
    const muted=variable(theme,'--color-muted')||standardMuted;
    const paper=variable(theme,'--color-paper')||standardPaper;
    assert.ok(contrast(muted,paper)>=4.5,selector);
  }
});


await test('UI-SEMANTIC-COLORS-MEET-CONTRAST-IN-LIGHT-AND-DARK',()=>{
  const css=read('styles/tokens.css');
  const rootBlock=cssBlock(css,':root');
  const darkBlock=cssBlock(css,'html.rl-appearance-dark');
  const names=['info','success','model','attention','danger'];
  for(const name of names){
    const lightForeground=variable(rootBlock,'--color-'+name);
    const lightBackground=variable(rootBlock,'--color-'+name+'-soft');
    assert.ok(contrast(lightForeground,lightBackground)>=4.5,'light '+name);
    const darkForeground=variable(darkBlock,'--color-'+name)||lightForeground;
    const darkBackground=variable(darkBlock,'--color-'+name+'-soft')||lightBackground;
    assert.ok(contrast(darkForeground,darkBackground)>=4.5,'dark '+name);
  }
});


await test('UI-PC-RECORD-STATUS-CARD-CENTERS-AND-USES-READABLE-TYPE',()=>{
  const css=read('styles/desktop.css');
  const marker='PC record status card audit 2026-09-23';
  const start=css.indexOf(marker);
  assert.ok(start>=0,'PC record status audit block');
  const audit=css.slice(start);
  const remSize=(selector)=>{
    let offset=0;
    let maximum=0;
    while(offset<audit.length){
      const startIndex=audit.indexOf(selector,offset);
      if(startIndex<0)break;
      const open=audit.indexOf('{',startIndex);
      const close=audit.indexOf('}',open+1);
      if(open<0||close<0)break;
      const block=audit.slice(open+1,close);
      const match=block.match(/font-size:\s*([0-9.]+)rem(?:\s*!important)?\s*;/i);
      if(match)maximum=Math.max(maximum,Number(match[1]));
      offset=startIndex+selector.length;
    }
    return maximum;
  };

  assert.match(audit,/^PC record status card audit|@media \(min-width: 69rem\)/m);
  assert.match(audit,/justify-items:\s*center\s*!important/);
  assert.match(audit,/width:\s*min\(18\.5rem, 100%\)\s*!important/);
  assert.doesNotMatch(audit,/grid-template-columns/);
  assert.doesNotMatch(audit,/transform:\s*scale/);

  assert.ok(remSize('.screen--record-input.screen-layout--record .desktop-save-area__intro > strong')>=1.3,'title font');
  assert.ok(remSize('.screen--record-input.screen-layout--record .save-readiness__summary > span')>=0.9,'required label font');
  assert.ok(remSize('.screen--record-input.screen-layout--record .save-readiness__summary > strong')>=1.2,'progress font');
  assert.ok(remSize('.screen--record-input.screen-layout--record .save-checklist > div > span')>=0.95,'required item font');
  assert.ok(remSize('.screen--record-input.screen-layout--record .save-checklist > div > b')>=0.85,'required state font');
  assert.ok(remSize('.screen--record-input.screen-layout--record .optional-readiness > p')>=0.9,'optional label font');
  assert.ok(remSize('.screen--record-input.screen-layout--record .optional-readiness span')>=0.9,'optional item font');
  assert.ok(remSize('.screen--record-input.screen-layout--record .optional-readiness b')>=0.85,'optional state font');
  assert.ok(remSize('.screen--record-input.screen-layout--record .desktop-save-area .primary-save')>=1,'save button font');
});


await test('UI-PC-COURSE-LIBRARY-USES-CLEAR-WORKSPACE-HIERARCHY',()=>{
  const screen=read('screens/courseLibraryScreen.js');
  const shared=read('styles/screens.css');
  const css=read('styles/desktop.css');
  const marker='PC course library workspace audit 2026-09-23';
  const start=css.indexOf(marker);
  assert.ok(start>=0,'PC course library audit block');
  const audit=css.slice(start);
  const remSize=(selector)=>{
    let offset=0;
    let maximum=0;
    while(offset<audit.length){
      const startIndex=audit.indexOf(selector,offset);
      if(startIndex<0)break;
      const open=audit.indexOf('{',startIndex);
      const close=audit.indexOf('}',open+1);
      if(open<0||close<0)break;
      const block=audit.slice(open+1,close);
      const match=block.match(/font-size:\s*([0-9.]+)rem(?:\s*!important)?\s*;/i);
      if(match)maximum=Math.max(maximum,Number(match[1]));
      offset=startIndex+selector.length;
    }
    return maximum;
  };

  assert.ok(screen.includes('course-library-pc-only course-library-pc-new'));
  assert.ok(screen.includes('course-current-label--mobile'));
  assert.ok(screen.includes('course-current-label--pc'));
  assert.ok(screen.includes('course-library-pc-count'));
  assert.match(shared,/\.course-library-pc-only\s*\{\s*display:\s*none;/);
  assert.match(audit,/@media \(min-width: 80rem\)/);
  assert.match(audit,/course-derived-frame--library[\s\S]*height:\s*auto\s*!important/);
  assert.match(audit,/course-derived-head > strong[\s\S]*display:\s*none\s*!important/);
  assert.match(audit,/\.course-library-list-new[\s\S]*display:\s*none\s*!important/);
  assert.match(audit,/\.current > b[\s\S]*display:\s*none\s*!important/);
  assert.match(audit,/\.list[\s\S]*grid-template-columns:\s*repeat\(2, minmax\(0, 1fr\)\)\s*!important/);
  assert.match(audit,/\.empty-course-card[\s\S]*grid-column:\s*1 \/ -1\s*!important/);
  assert.match(audit,/\.assist-section > \.section-head[\s\S]*display:\s*none\s*!important/);
  assert.match(audit,/\.boundary[\s\S]*grid-column:\s*2\s*!important/);

  assert.ok(remSize('.screen--course-library.screen-layout--course .head p:last-child')>=0.9,'intro font');
  assert.ok(remSize('.screen--course-library.screen-layout--course .current strong')>=1.05,'current selection font');
  assert.ok(remSize('.screen--course-library.screen-layout--course .section-head h2')>=1.2,'saved courses heading font');
  assert.ok(remSize('.screen--course-library.screen-layout--course .empty-course-card p')>=0.85,'empty state font');
  assert.ok(remSize('.screen--course-library.screen-layout--course .import-helper span')>=0.8,'GPX helper font');
});


await test('UI-PC-COURSE-DERIVED-MATCHES-RECORD-SUBFLOW-CHROME',()=>{
  const screen=read('screens/courseLibraryScreen.js');
  const shell=read('ui/appShell.js');
  const css=read('styles/desktop.css');
  const marker='PC course derived parity audit 2026-09-23';
  const start=css.indexOf(marker);
  assert.ok(start>=0,'PC course derived parity block');
  const audit=css.slice(start);

  assert.ok(screen.includes('course-library-title-mobile'));
  assert.ok(screen.includes('course-library-pc-only course-library-title-pc'));
  assert.ok(screen.includes('今回のコース'));
  assert.ok(shell.includes('["course-library", "course-editor", "gpx-analysis"].includes(currentScreen)'));
  assert.ok(shell.includes('PRIMARY_HEADER_TITLES[primary]'));

  assert.match(audit,/top:\s*4\.75rem\s*!important/);
  assert.match(audit,/right:\s*0\s*!important/);
  assert.match(audit,/left:\s*0\s*!important/);
  assert.match(audit,/padding:\s*1\.35rem 2rem 2rem\s*!important/);
  assert.match(audit,/background:\s*color-mix\(in srgb, var\(--color-paper\) 64%, transparent\)\s*!important/);
  assert.match(audit,/backdrop-filter:\s*blur\(5px\)\s*!important/);
  assert.match(audit,/width:\s*min\(72rem, calc\(100vw - 10rem\)\)\s*!important/);
  assert.match(audit,/height:\s*100%\s*!important/);
  assert.match(audit,/height:\s*3\.7rem\s*!important/);
  assert.match(audit,/grid-template-columns:\s*1fr auto 1fr\s*!important/);
  assert.match(audit,/course-derived-head > strong[\s\S]*display:\s*block\s*!important/);
  assert.match(audit,/course-derived-back[\s\S]*min-height:\s*2\.45rem\s*!important/);
  assert.match(audit,/course-derived-body[\s\S]*border:\s*2px solid var\(--color-line\)\s*!important/);
  assert.match(audit,/border-radius:\s*0 0 1\.35rem 1\.35rem\s*!important/);
  assert.match(audit,/\.head \.eyebrow[\s\S]*display:\s*block\s*!important/);
});


await test('UI-PC-COURSE-EDITOR-INPUTS-ARE-COMPACT-AND-READABLE',()=>{
  const css=read('styles/desktop.css');
  const marker='PC course editor input usability audit 2026-09-23';
  const start=css.indexOf(marker);
  assert.ok(start>=0,'PC course editor usability block');
  const audit=css.slice(start);

  assert.match(audit,/@media \(min-width: 80rem\)/);
  assert.match(audit,/sub\[data-course-grade-summary\][\s\S]*width:\s*min\(100%, 52rem\)\s*!important/);
  assert.match(audit,/\.inputs[\s\S]*grid-template-columns:\s*repeat\(2, minmax\(13rem, 17rem\)\)\s*!important/);
  assert.match(audit,/\.mfield input,[\s\S]*font-size:\s*1\.06rem\s*!important/);
  assert.match(audit,/\.section-row[\s\S]*width:\s*min\(100%, 39rem\)\s*!important/);
  assert.match(audit,/\.section-summary[\s\S]*font-size:\s*0\.98rem\s*!important/);
  assert.match(audit,/sub\[data-course-surface-mixed\] \.comp-head[\s\S]*font-size:\s*1rem\s*!important/);
  assert.match(audit,/\.mix[\s\S]*grid-template-columns:\s*repeat\(2, minmax\(0, 1fr\)\)\s*!important/);
  assert.match(audit,/\.mix-row > span:first-child[\s\S]*font-size:\s*0\.96rem\s*!important/);
  assert.match(audit,/\.mix-row \.percent-control[\s\S]*width:\s*8\.5rem\s*!important/);
  assert.match(audit,/\.editor-actions \.primary[\s\S]*width:\s*min\(100%, 24rem\)\s*!important/);
  assert.doesNotMatch(audit,/transform:\s*scale/);
});


await test('UI-PC-COURSE-EDITOR-PERCENT-UNITS-MATCH-AND-GPX-IS-NOT-DUPLICATED',()=>{
  const css=read('styles/desktop.css');
  const marker='PC course editor unit parity audit 2026-09-23';
  const start=css.indexOf(marker);
  assert.ok(start>=0,'PC course editor percent-unit parity block');
  const audit=css.slice(start);

  assert.match(audit,/\.mfield > div > em,[\s\S]*\.percent-control > em/);
  assert.match(audit,/font-size:\s*0\.95rem\s*!important/);
  assert.match(audit,/font-style:\s*normal\s*!important/);
  assert.match(audit,/font-weight:\s*800\s*!important/);
  assert.match(audit,/\.gpx-inline[\s\S]*display:\s*none\s*!important/);
});

const failed=results.filter((item)=>item.status==='FAIL');
console.log(JSON.stringify({suite:'Global UI System',total:results.length,passed:results.length-failed.length,failed:failed.length,status:failed.length?'FAIL':'PASS',results},null,2));
if(failed.length)process.exitCode=1;
