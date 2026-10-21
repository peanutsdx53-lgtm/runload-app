import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {bodyMap,locatorSvg,VIEWS} from '../screens/resultScreen.js';
const source = (path)=>fs.readFileSync(new URL('../'+path, import.meta.url),'utf8');
const viewIds={front:5,back:4,sole:3};

test('clipped fill: 12 result regions preserve ID, state and viewBox',()=>{
 const all=VIEWS.flatMap(v=>v.paths).map(([id],i)=>({row:{regionId:id,value:i===0?null:100+(i%3-1)*12}}));
 const html=bodyMap({record_id:'test'},all,'v132-audit','', {enhancedTouch:true});
 assert.equal((html.match(/viewBox="70 10 160 430"/g)||[]).length,3);
 assert.equal((html.match(/class="region-hit-area"/g)||[]).length,12);
 assert.equal((html.match(/class="region-link"/g)||[]).length,12);
 for(const view of VIEWS){
  assert.equal(view.paths.length,viewIds[view.key]);
  assert.match(html,new RegExp(`<clipPath id="body-clip-${view.key}-v132-audit">`));
  assert.match(html,new RegExp(`<g class="region-layer" clip-path="url\\(#body-clip-${view.key}-v132-audit\\)">`));
 }
 for(const [id] of VIEWS.flatMap(v=>v.paths))assert.match(html,new RegExp(`data-region-id="${id}"`));
 assert.match(html,/data-direction="unavailable"/);
 assert.match(html,/data-direction="reference"/);
 assert.match(html,/data-direction="above"/);
 assert.match(html,/data-direction="below"/);
});

test('all supporting body map surfaces use corresponding silhouette clip paths',()=>{
 for (const [path,selector] of [
  ['screens/resultScreen.js','result-locator-clip-'],
  ['screens/bodyPartDetailScreen.js','detail-locator-clip-'],
  ['screens/historyScreen.js','history-locator-clip-'],
  ['screens/consultationScreen.js','share-body-clip-'],
  ['screens/bodyTimelineScreen.js','timeline-clip-'],
 ]){
  const code=source(path);
  assert.ok(code.includes(`<clipPath id="${selector}`),path);
  assert.ok(code.includes(`clip-path="url(#${selector}`),path);
  assert.ok(code.includes('view.silhouette'),path);
 }
 for (const [id] of VIEWS.flatMap(v=>v.paths)) {
  const html=locatorSvg(id);
  assert.match(html,new RegExp(`id="result-locator-clip-${id}"`));
  assert.match(html,new RegExp(`clip-path="url\\(#result-locator-clip-${id}\\)"`));
 }
});

test('rendering CSS kept: no global fill/color/scientific logic changes',()=>{
 assert.match(source('styles/result-screen-base.css'),/region-path\[data-direction="above"\]/);
 assert.match(source('styles/result-screen-base.css'),/region-path\[data-direction="below"\]/);
 assert.match(source('styles/result-screen-base.css'),/region-path\[data-direction="unavailable"\]/);
 assert.match(source('screens/resultScreen.js'),/BODY_REGION_VIEWS/);
});
