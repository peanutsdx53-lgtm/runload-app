import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { BODY_REGION_VIEWS } from '../ui/bodyRegionVisuals.js';
import { bodyMap, direction } from '../screens/resultScreen.js';
const ids = BODY_REGION_VIEWS.flatMap(v=>v.paths.map(p=>p[0]));
const viewById = Object.fromEntries(BODY_REGION_VIEWS.flatMap(v=>v.paths.map(p=>[p[0],v.key])));
const read=(path)=>fs.readFileSync(new URL('../'+path, import.meta.url),'utf8');
const mirrored=new Set(['BA-DISP-014','BA-DISP-016','BA-DISP-019','BA-DISP-021','BA-DISP-024','BA-DISP-018','BA-DISP-023','BA-DISP-025']);
function pts(path){
 const result=[];const cmds=[...path.matchAll(/([MLC])\s*((?:[-\d.]+\s*)+)|([Z])/g)];
 for(const m of cmds) {if(m[3])continue;const a=m[2].trim().split(/\s+/).map(Number);for(let i=0;i<a.length;i+=2)result.push([a[i],a[i+1]]);}
 return result;
}
test('v134 bilateral colored surfaces are exact coordinate reflections about x=150',()=>{
 for(const view of BODY_REGION_VIEWS)for(const [id,d] of view.paths){
  if(!mirrored.has(id))continue;
  const parts=d.split(/\s+(?=M\d)/);
  assert.equal(parts.length,2,id);
  const left=pts(parts[0]),right=pts(parts[1]);
  assert.equal(left.length,right.length,id);
  for(let i=0;i<left.length;i++){
   assert.ok(Math.abs(left[i][0]+right[i][0]-300)<1e-5, `${id} x ${i}`);
   assert.ok(Math.abs(left[i][1]-right[i][1])<1e-5, `${id} y ${i}`);
  }
 }
});
test('twelve regions retain value state and renderer markers without thick perimeter strokes',()=>{
 assert.equal(ids.length,12);
 for (const [key,value] of Object.entries({reference:100,above:118,below:82,unavailable:null})){
  const html=bodyMap({record_id:'test'},ids.map(regionId=>({row:{regionId,value}})),`q-${key}`);
  for(const regionId of ids){assert.equal((html.match(new RegExp(`data-region-id="${regionId}"`,'g'))||[]).length,1,regionId);
  assert.match(html,new RegExp(`data-direction="${key}"`));}
  assert.equal((html.match(/class="body-region-seams"/g)||[]).length,3);
  assert.equal((html.match(/clip-path="url\(#body-clip-(?:front|back|sole)-q-/g)||[]).length,6);
 }
 const css=read('styles/result-screen-base.css');
 assert.match(css,/stroke:none !important/);
 assert.match(css,/var\(--color-success\) 55%,var\(--color-map-silhouette\)/);
 assert.ok(direction(100)==='reference' && direction(null)==='unavailable');
 assert.match(read('styles/mobile-body-timeline.css'),/stroke: none !important/);
});
