import assert from 'node:assert/strict';
import fs from 'node:fs';
const read=(p)=>fs.readFileSync(p,'utf8');
const screen=read('screens/resultScreen.js');
const interactions=read('ui/interactions/resultInteractions.js');
const css=read('styles/interpretation-room-compact.css');
const results=[];
function test(id,fn){try{fn();results.push({id,status:'PASS'});}catch(error){results.push({id,status:'FAIL',message:error?.stack||String(error)});}}

test('PC-RESULT-PRIORITIZES-RECORDED-BODY-AREA-FOR-INITIAL-REGION',()=>{
  assert.match(screen,/SELF_UNDERSTANDING_BODY_AREA_TO_DISPLAY_REGION/);
  assert.match(screen,/observedRegionId/);
  assert.match(screen,/infos\.find\(\(info\) => info\.row\.regionId === observedRegionId\)/);
});

test('PC-RESULT-HAS-DIRECT-NEXT-RUN-BRIDGE',()=>{
  assert.match(screen,/class="pc-result-next"/);
  assert.match(screen,/data-result-next-interpretation/);
  assert.match(screen,/今回を見比べる/);
  assert.match(screen,/regionId=\$\{encodeURIComponent\(selectedInfo\?\.row\?\.regionId/);
});

test('PC-REGION-SELECTION-CARRIES-INTO-INTERPRETATION',()=>{
  assert.match(interactions,/data-result-next-interpretation/);
  assert.match(interactions,/hash\.set\("regionId", regionId\)/);
  assert.match(interactions,/#\/interpretation-room\?\$\{hash\.toString\(\)\}/);
});

test('PC-NEXT-BRIDGE-IS-DESKTOP-SPECIFIC',()=>{
  assert.match(css,/@media \(min-width: 80rem\)[\s\S]*\.pc-result-next/);
});

const failed=results.filter(x=>x.status==='FAIL');
console.log(JSON.stringify({suite:'Desktop Result Interpretation Bridge',total:results.length,passed:results.length-failed.length,failed:failed.length,status:failed.length?'FAIL':'PASS',results},null,2));
if(failed.length)process.exit(1);