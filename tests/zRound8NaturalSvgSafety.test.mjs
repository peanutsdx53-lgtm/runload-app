import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { bodyMap, VIEWS, direction, locatorSvg } from '../screens/resultScreen.js';
import { ANATOMY_FRONT, ANATOMY_BACK, ANATOMY_SOLE, ANATOMY_REGIONS } from '../ui/anatomicalBodySvg.js';

const views=['front','back','sole'];
const ids=VIEWS.flatMap(v=>v.paths.map(([id])=>id));
const make=(value)=>ids.map(regionId=>({row:{regionId,value}}));

test('Round8 SVG remains simultaneous 3-view and twelve ID namespace without loss of provenance',()=>{
 assert.deepEqual(VIEWS.map(v=>v.key),views);
 assert.deepEqual(VIEWS.map(v=>v.paths.length),[5,4,3]);
 assert.equal(ids.length,12);
 assert.equal(new Set(ids).size,12);
 for(const v of VIEWS){
  for(const [regionId,d] of v.paths){
   assert.match(regionId,/^BA-DISP-\d{3}$/);
   assert.match(d,/^M\d/);
   assert.ok(locatorSvg(regionId).includes('mini-region'));
  }
 }
});

test('Round8 clipped colour overlays are scoped per view and render instance; no runaway path beyond base form',()=>{
 for(const instance of ['round8a','round8b']){
  const markup=bodyMap({record_id:'record / #1'},make(100),instance);
  assert.equal((markup.match(/<figure class="body-view"/g)||[]).length,3);
  assert.equal((markup.match(/class="region-link"/g)||[]).length,12);
  for(const view of views){
   assert.ok(markup.includes(`id="body-clip-${view}-${instance}"`));
   assert.ok(markup.includes(`clip-path="url(#body-clip-${view}-${instance})"`));
   assert.ok(markup.includes(`id="hatch-${view}-${instance}"`));
  }
  for(const id of ids)assert.ok(markup.includes(`regionId=${id}`));
  assert.match(markup,/recordId=record%20%2F%20%231/);
 }
});

test('Round8 absent values never masquerade as normal and selection remains attached to same data region',()=>{
 assert.equal(direction(null),'unavailable');
 assert.equal(direction(0),'below');
 assert.equal(direction(100),'reference');
 assert.equal(direction(101),'above');
 const html=bodyMap({record_id:'r'},make(null),'missing',ids[3],{enhancedTouch:true});
 assert.equal((html.match(/data-direction="unavailable"/g)||[]).length,12);
 assert.equal((html.match(/class="region-hit-area"/g)||[]).length,12);
 assert.equal((html.match(/is-selected"/g)||[]).length,1);
 assert.equal((html.match(/数値なし/g)||[]).length,24);
 assert.equal((html.match(/class="region-link" tabindex="-1"/g)||[]).length,12);
});

test('Round8 original scalable contours use SVG vectors, not raster/photo references',()=>{
 assert.notEqual(ANATOMY_FRONT,ANATOMY_BACK);
 for(const shape of [ANATOMY_FRONT,ANATOMY_BACK,ANATOMY_SOLE]){
  assert.match(shape,/<path d="M/);
  assert.doesNotMatch(shape,/<(?:image|foreignObject|rect|circle|ellipse|use)\b/i);
  assert.doesNotMatch(shape,/(?:https?:|data:|base64|\.png|\.jpg)/i);
 }
 assert.equal((ANATOMY_SOLE.match(/<path\b/g)||[]).length,1);
 assert.ok((ANATOMY_SOLE.match(/Q/g)||[]).length>=20,'Five-toe plantar Béziers are needed');
 const mobile=fs.readFileSync(new URL('../styles/mobile-run-lab.css',import.meta.url),'utf8');
 assert.match(mobile,/grid-template-columns:repeat\(3,minmax\(0,1fr\)\)/);
 assert.match(mobile,/\.body-view\[data-view="sole"\] \{[\s\S]*?grid-column:auto/);
});
