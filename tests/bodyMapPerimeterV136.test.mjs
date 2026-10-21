import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { VIEWS, bodyMap, direction } from '../screens/resultScreen.js';
const read = path => fs.readFileSync(new URL('../'+path, import.meta.url),'utf8');
const ids=VIEWS.flatMap(view=>view.paths.map(([id])=>id));

test('v136 12 selection rings represent intersected body regions, with no global clip over the overlay',()=>{
 for(const [state,value] of Object.entries({reference:100,above:120,below:80,unavailable:null})){
  const html=bodyMap({record_id:'v136'},ids.map(regionId=>({row:{regionId,value}})),`v136-${state}`,'',{enhancedTouch:true});
  assert.equal((html.match(/class="region-path"/g)||[]).length,12);
  assert.equal((html.match(/class="region-feedback" /g)||[]).length,12);
  assert.equal((html.match(/class="region-link" /g)||[]).length,12);
  assert.equal((html.match(/class="region-feedback-layer" /g)||[]).length,3);
  assert.equal((html.match(/filterUnits="userSpaceOnUse" x="60" y="0" width="180" height="450"/g)||[]).length,3);
  assert.equal((html.match(/<feComposite in="outer-dilation" in2="SourceAlpha" operator="out"/g)||[]).length,3);
  assert.equal((html.match(/<feComposite in="inner-dilation" in2="SourceAlpha" operator="out"/g)||[]).length,3);
  assert.equal((html.match(/<feMergeNode in="SourceGraphic"/g)||[]).length,0,'ring must not paint over original colors');
  assert.equal((html.match(new RegExp(`data-direction="${state}"`,'g'))||[]).length,12);
  for(const view of VIEWS){
   assert.match(html,new RegExp(`<g class="region-layer" clip-path="url\\(#body-clip-${view.key}-v136-${state}\\)"`));
   assert.match(html,new RegExp(`<g class="region-feedback-layer" aria-hidden="true" pointer-events="none">`));
  }
 }
});

test('v136 focus highlight is separate from every fill, and is drawn after seams so it cannot be visually interrupted',()=>{
 const html=bodyMap({record_id:'v136'},ids.map(regionId=>({row:{regionId,value:120}})),'z','',{enhancedTouch:true});
 for(const view of VIEWS){
  const segment=html.match(new RegExp(`<figure class="body-view" data-view="${view.key}">([\\s\\S]*?)</figure>`))?.[1];
  assert.ok(segment,view.key);
  assert.ok(segment.indexOf('class="region-layer"')<segment.indexOf('class="body-region-seams"'),view.key);
  assert.ok(segment.indexOf('class="body-region-seams"')<segment.indexOf('class="region-feedback-layer"'),view.key);
  assert.equal((segment.match(/class="region-feedback" /g)||[]).length,view.paths.length);
  for(const [id] of view.paths){
   assert.match(segment,new RegExp(`class="region-feedback" data-region-id="${id}" pointer-events="none"`));
  }
 }
 const css=read('styles/result-screen-base.css');
 for(let i=1;i<=5;i++) assert.ok(css.includes(`.region-link:nth-child(${i}):is(:active,:focus-visible,.is-pressing)`),`selector ${i}`);
 assert.match(css,/\.region-feedback-layer,\s*\.screen-layout--result \.region-feedback \{pointer-events:none\}/);
 assert.match(css,/\.region-feedback \{\s*opacity:0/);
});

test('v136 no geometry, analysis classification or reference palette change',()=>{
 const baseline='259417b238242ae0552f194a5160d717b2d9ee0436f8f9f2b4f0420f617e93eb';
 assert.equal(crypto.createHash('sha256').update(fs.readFileSync(new URL('../ui/bodyRegionVisuals.js',import.meta.url))).digest('hex'),baseline);
 assert.equal(ids.length,12);
 assert.deepEqual([100,120,80,null].map(direction),['reference','above','below','unavailable']);
 const css=read('styles/result-screen-base.css');
 assert.match(css,/\.region-path\[data-direction="above"\]\{fill:var\(--color-model\)\}/);
 assert.match(css,/\.region-path\[data-direction="below"\]\{fill:var\(--color-info\)\}/);
 assert.match(css,/\.region-path\[data-direction="unavailable"\]\{fill:var\(--color-neutral-soft\)\}/);
});
