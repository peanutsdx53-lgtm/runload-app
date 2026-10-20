import {test} from 'node:test';
import assert from 'node:assert/strict';
import {ANATOMY_REGIONS,ANATOMY_SOLE} from '../ui/anatomicalBodySvg.js';
import {bodyMap,VIEWS} from '../screens/resultScreen.js';

const ids=VIEWS.flatMap(v=>v.paths.map(([id])=>id));
test('Round11 forefoot multi-pad is one scientifically defined interactive region',()=>{
 const fore=ANATOMY_REGIONS.sole.find(([id])=>id==='BA-DISP-029');
 assert.ok(fore);
 assert.equal((fore[1].match(/\bM\d/g)||[]).length,2,'paired subshapes are still one region');
 assert.deepEqual(ANATOMY_REGIONS.sole.map(([id])=>id),['BA-DISP-029','BA-DISP-028','BA-DISP-027']);
 const html=bodyMap({record_id:'foot'},ids.map(regionId=>({row:{regionId,value:72}})),'soletest');
 assert.equal((html.match(/data-region-id="BA-DISP-029"/g)||[]).length,1);
 assert.equal((html.match(/regionId=BA-DISP-029/g)||[]).length,1);
 assert.equal((html.match(/class="region-link"/g)||[]).length,12);
});
test('Round11 five-toed single-path sole respects width and missing values',()=>{
 assert.equal((ANATOMY_SOLE.match(/<path\b/g)||[]).length,1);
 assert.match(ANATOMY_SOLE,/Q139 73 146 72/);
 assert.ok((ANATOMY_SOLE.match(/Q/g)||[]).length>=20);
 const markup=bodyMap({record_id:'foot'},ids.map(regionId=>({row:{regionId,value:null}})),'m');
 assert.equal((markup.match(/data-direction="unavailable"/g)||[]).length,12);
 assert.match(markup,/clip-path="url\(#body-clip-sole-m\)"/);
});
