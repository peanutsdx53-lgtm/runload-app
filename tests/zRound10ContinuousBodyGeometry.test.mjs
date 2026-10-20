import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {ANATOMY_FRONT,ANATOMY_BACK,ANATOMY_SOLE,ANATOMY_REGIONS,ANATOMY_MARKINGS} from '../ui/anatomicalBodySvg.js';
import {bodyMap,VIEWS,direction} from '../screens/resultScreen.js';

const ids=VIEWS.flatMap(v=>v.paths.map(([id])=>id));
const sample=(value)=>ids.map(regionId=>({row:{regionId,value}}));

test('Round10 front and back contour paths each close one connected full-body form',()=>{
 for(const contour of [ANATOMY_FRONT,ANATOMY_BACK]){
   const visible=contour.match(/^<path d="([\s\S]*? Z)"\/>/);
   assert.ok(visible,'one outer path should precede the non-rendered legacy geometry marker');
   assert.equal((visible[1].match(/\bM\s*\d/g)||[]).length,1,'no detached scalp or body subpath');
   assert.equal((visible[1].match(/Z/g)||[]).length,1);
   assert.match(visible[1],/^M150 15\b/);
   assert.match(visible[1],/\bQ(?:144 6[45]|156 64)/);
   assert.doesNotMatch(visible[1],/(?:NaN|undefined|Infinity|<image|base64)/);
 }
 assert.notEqual(ANATOMY_FRONT,ANATOMY_BACK);
});

test('Round10 maintains five plantar digit arches with separate curves and outline-only anatomy',()=>{
 assert.equal((ANATOMY_SOLE.match(/<path /g)||[]).length,1);
 assert.ok((ANATOMY_SOLE.match(/Q/g)||[]).length>=20);
 assert.match(ANATOMY_MARKINGS.sole,/anatomy-digits/);
 for(const x of [ANATOMY_FRONT,ANATOMY_BACK,ANATOMY_SOLE]) {
   assert.doesNotMatch(x,/<(?:image|foreignObject|use|rect|circle|ellipse)\b/i);
   assert.doesNotMatch(x,/(?:\.png|\.webp|data:|https?:)/);
 }
});

test('Round10 semantic roles are exactly 12, unavailable never means normal, three views never alternate',()=>{
 assert.deepEqual(VIEWS.map(v=>[v.key,v.paths.length]),[['front',5],['back',4],['sole',3]]);
 assert.equal(new Set(ids).size,12);
 assert.equal(ANATOMY_REGIONS.front.length+ANATOMY_REGIONS.back.length+ANATOMY_REGIONS.sole.length,12);
 for(const value of [null,NaN,undefined])assert.equal(direction(value),'unavailable');
 for(const state of [null,100,70,130]){
  const html=bodyMap({record_id:'review'},sample(state),'round10');
  assert.equal((html.match(/class="region-link"/g)||[]).length,12);
  assert.equal((html.match(/<figure class="body-view"/g)||[]).length,3);
  assert.equal((html.match(/viewBox="70 10 160 430"/g)||[]).length,3);
  assert.equal((html.match(/clip-path="url\(#body-clip-/g)||[]).length,3);
  for(const id of ids) assert.ok(html.includes(`regionId=${id}`));
 }
 const style=fs.readFileSync(new URL('../styles/result-screen-base.css',import.meta.url),'utf8');
 assert.match(style,/region-path\[data-direction="above"\]\{fill:var\(--model\)/);
 assert.match(style,/region-path\[data-direction="below"\]\{fill:var\(--color-info\)/);
 const mobile=fs.readFileSync(new URL('../styles/mobile-run-lab.css',import.meta.url),'utf8');
 assert.match(mobile,/grid-template-columns:repeat\(3,minmax\(0,1fr\)\)/);
});
