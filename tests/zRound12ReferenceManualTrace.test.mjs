import {test} from 'node:test';
import assert from 'node:assert/strict';
import {ANATOMY_FRONT,ANATOMY_BACK,ANATOMY_SOLE,ANATOMY_REGIONS} from '../ui/anatomicalBodySvg.js';
import {bodyMap,VIEWS} from '../screens/resultScreen.js';
test('Round12 hand-refined continuous contours reach reference-height hands without changing the map',()=>{
 for(const s of [ANATOMY_FRONT,ANATOMY_BACK]) {
  assert.match(s,/M150 15/);
  assert.match(s,/Q144 65/);
  assert.match(s,/\b24[0-9]\b/,'fingers should reach the reference-proportioned wrist/hand length');
  assert.ok((s.match(/<path /g)||[]).length===2); // plus invisible compatibility marker
  assert.ok(!/(<image|base64|data:image)/.test(s));
 }
 assert.deepEqual(VIEWS.map(v=>v.paths.length),[5,4,3]);
 assert.equal(new Set(VIEWS.flatMap(v=>v.paths.map(([id])=>id))).size,12);
 const html=bodyMap({record_id:'r'},VIEWS.flatMap(v=>v.paths.map(([regionId])=>({row:{regionId,value:null}}))),'manual');
 assert.equal((html.match(/class="region-link"/g)||[]).length,12);
 assert.equal((html.match(/data-direction="unavailable"/g)||[]).length,12);
 assert.ok(ANATOMY_SOLE.includes('Q139 73 146 72'));
 assert.equal(ANATOMY_REGIONS.sole.length,3);
});
