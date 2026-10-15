import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
function scan(root,ext) { return fs.readdirSync(root,{withFileTypes:true}).flatMap(e=>e.isDirectory()?scan(path.join(root,e.name),ext):e.name.endsWith(ext)?[path.join(root,e.name)]:[]); }
const css=scan(path.join(ROOT,'styles'),'.css');
const runtime=['app.js','service-worker.js','index.html',...['core','ui','screens','shared'].flatMap(d=>scan(path.join(ROOT,d),'.js').map(p=>path.relative(ROOT,p)))];
const combined=runtime.map(name=>fs.readFileSync(path.join(ROOT,name),'utf8')).join('\n');
const selectors=new Set(css.flatMap(file=>[...fs.readFileSync(file,'utf8').matchAll(/\.([a-zA-Z_-][a-zA-Z_0-9-]*)/g)].map(m=>m[1])));
const unknown=[...selectors].filter(c=>!combined.includes(c)).sort();
const known=Object.freeze([
  "about-tags",
  "achievement-card--bronze",
  "achievement-card--gold",
  "achievement-card--silver",
  "condition-compare-carry",
  "drawer",
  "history-records-title-pc",
  "home-state--draft",
  "home-state--saved-rest",
  "home-state--saved-run",
  "interpretation-room-mobile-path",
  "mobile-home-ambient--day",
  "mobile-home-ambient--draft",
  "mobile-home-ambient--evening",
  "mobile-home-ambient--morning",
  "mobile-home-ambient--night",
  "mobile-home-ambient--rest",
  "mobile-home-ambient--saved",
  "mobile-home-tone--blue",
  "mobile-home-tone--cyan",
  "mobile-home-tone--green",
  "mobile-home-tone--indigo",
  "mobile-home-tone--orange",
  "mobile-home-tone--red",
  "mobile-home-tone--violet",
  "mobile-home-tone-blue",
  "mobile-home-tone-cyan",
  "mobile-home-tone-green",
  "mobile-home-tone-indigo",
  "mobile-home-tone-orange",
  "mobile-home-tone-violet",
  "mobile-home-widget--tone-achievement",
  "mobile-home-widget--tone-blue",
  "mobile-home-widget--tone-cyan",
  "mobile-home-widget--tone-fatigue",
  "mobile-home-widget--tone-green",
  "mobile-home-widget--tone-indigo",
  "mobile-home-widget--tone-latest",
  "mobile-home-widget--tone-orange",
  "mobile-home-widget--tone-plan",
  "mobile-home-widget--tone-violet",
  "previous-reflection-note",
  "reading-detail__back",
  "reading-detail__footer",
  "region-copy-mobile",
  "region-copy-pc",
  "region-metric-pc",
  "restore-preview--restore_blocked",
  "rl-appearance-dark",
  "rl-color-natural",
  "rl-color-standard",
  "rl-text-large",
  "run-measurement-energy",
  "self-understanding-rail",
  "self-understanding-rail--compact",
  "share-preview",
  "status-label--attention",
  "status-label--info",
  "status-label--model",
  "status-label--neutral",
  "status-label--success"
]);
test('B01 independent full CSS selector inventory: 112 files and 61 explicitly owned retained names',()=>{
 assert.equal(css.length,112);
 assert.deepEqual(unknown,known,'Unexplained CSS class requires dynamic generator provenance or reviewed deletion');
});
test('B01 independent runtime generator witnesses for retained dynamic classes',()=>{
 for(const prefix of ['achievement-card--','home-state--','mobile-home-ambient--','mobile-home-tone--','mobile-home-tone-','mobile-home-widget--tone-','restore-preview--','status-label--','rl-appearance-','rl-color-','rl-text-']){
   assert.ok(combined.includes(prefix),`Missing class generator ${prefix}`);
 }
});
test('B01 complete CSS/JS file-level ownership uses loader, HTML root and SW cache',()=>{
 const loader=fs.readFileSync(path.join(ROOT,'ui/platformStyles.js'),'utf8');
 const html=fs.readFileSync(path.join(ROOT,'index.html'),'utf8');
 const sw=fs.readFileSync(path.join(ROOT,'service-worker.js'),'utf8');
 for(const file of css){const ref='./styles/'+path.basename(file);
   assert.ok(loader.includes(ref)||html.includes(ref),`unreferenced stylesheet ${ref}`);
   assert.ok(sw.includes(ref),`stylesheet not cached ${ref}`);
 }
});
