import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { VIEWS, bodyMap, direction } from '../screens/resultScreen.js';
import { ANATOMY_FRONT, ANATOMY_BACK, ANATOMY_SOLE, ANATOMY_REGIONS } from '../ui/anatomicalBodySvg.js';
const EXPECTED = [
 'BA-DISP-014','BA-DISP-016','BA-DISP-019','BA-DISP-021','BA-DISP-024',
 'BA-DISP-015','BA-DISP-018','BA-DISP-023','BA-DISP-025',
 'BA-DISP-029','BA-DISP-028','BA-DISP-027',
];
const ids=VIEWS.flatMap(view=>view.paths.map(([id])=>id));

test('Reference-vector review preserves exact region identity and front/back/sole positions',()=>{
 assert.deepEqual(VIEWS.map(v=>v.key),['front','back','sole']);
 assert.deepEqual(ids,EXPECTED);
 assert.equal(new Set(ids).size,12);
 for(const view of VIEWS){for(const [id,path] of view.paths){assert.ok(path.startsWith('M'),id);}}
 assert.equal(ANATOMY_REGIONS.front.length,5);
 assert.equal(ANATOMY_REGIONS.back.length,4);
 assert.equal(ANATOMY_REGIONS.sole.length,3);
});

test('Reference-vector silhouette uses same 160x430 shared viewbox with no raster or foreign SVG',()=>{
 const html=bodyMap({record_id:'test'},ids.map(regionId=>({row:{regionId,value:null}})),'ref');
 assert.equal((html.match(/viewBox="70 10 160 430"/g)||[]).length,3);
 assert.equal((html.match(/class="body-view"/g)||[]).length,3);
 assert.equal((html.match(/class="region-link"/g)||[]).length,12);
 assert.equal((html.match(/data-direction="unavailable"/g)||[]).length,12);
 for(const k of ['front','back','sole'])assert.match(html,new RegExp(`clip-path="url\\(#body-clip-${k}-ref\\)"`));
 for(const x of [ANATOMY_FRONT,ANATOMY_BACK,ANATOMY_SOLE]){
  assert.doesNotMatch(x,/<(?:image|foreignObject|use|rect|circle|ellipse)\b/i);
  assert.doesNotMatch(x,/https?:|data:|\.png|\.jpg/i);
 }
 assert.equal((ANATOMY_SOLE.match(/<path\b/g)||[]).length,1);
 assert.ok((ANATOMY_SOLE.match(/Q/g)||[]).length>=20);
});

test('Reference-vector retains Reference-100 semantics and the original three-column CSS',()=>{
 assert.equal(direction(null),'unavailable');
 assert.equal(direction(NaN),'unavailable');
 assert.equal(direction(100),'reference');
 assert.equal(direction(120),'above');
 assert.equal(direction(80),'below');
 const mobile=fs.readFileSync(new URL('../styles/mobile-run-lab.css',import.meta.url),'utf8');
 assert.match(mobile,/grid-template-columns:repeat\(3,minmax\(0,1fr\)\)/);
});
