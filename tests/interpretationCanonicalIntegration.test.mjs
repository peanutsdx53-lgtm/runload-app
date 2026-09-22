import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,'..');
const read=(rel)=>fs.readFileSync(path.join(root,rel),'utf8');
const exists=(rel)=>fs.existsSync(path.join(root,rel));
const results=[];
async function test(id,fn){try{await fn();results.push({id,status:'PASS'});}catch(error){results.push({id,status:'FAIL',message:error?.stack||String(error)});}}

await test('INTERPRETATION-SCREEN-USES-ONE-CANONICAL-PRESENTATION',()=>{
  const s=read('screens/interpretationRoomScreen.js');
  assert.match(s,/buildRunLoadInterpretation/);
  assert.match(s,/renderInterpretationRoom/);
  assert.doesNotMatch(s,/ALLOWED_EXPERIENCES|data-experience|buildRunLoadInterpretation\(buildArgs\)/);
  assert.equal(exists('ui/interpretationRoomPresentation.js'),true);
  assert.equal(exists('ui/interpretationRoomPresentationV3.js'),false);
  assert.equal(exists('core/interpretationCoreV3.js'),false);
});

await test('REGION-SELECTION-DOES-NOT-CARRY-VERSION-QUERY',()=>{
  const s=read('ui/interpretationRoomPresentation.js');
  assert.match(s,/regionHref\(output, region\.regionId\)/);
  assert.doesNotMatch(s,/query\.set\("experience"/);
});

await test('DERIVED-ACTIONS-CARRY-ROOM-CONTEXT-WITHOUT-VERSION-STATE',()=>{
  const s=read('ui/interpretationRoomPresentation.js');
  assert.match(s,/query\.set\("from", "interpretation-room"\)/);
  assert.match(s,/query\.set\("roomOrigin"/);
  assert.doesNotMatch(s,/roomExperience|experience=v3/);
});

await test('SIMULATION-USES-CANONICAL-ROOM-RETURN',()=>{
  const s=read('screens/simulationScreen.js');
  assert.match(s,/roomOrigin/);
  assert.match(s,/結果の整理へ戻る/);
  assert.doesNotMatch(s,/roomExperience|safeRoomExperience|view=next|intent=condition|from==="activation"/);
});

await test('SCREEN-ARCHITECTURE-HAS-NO-VERSION-BRANCH',()=>{
  const s=read('ui/screenArchitecture.js');
  assert.match(s,/const interpretationTitle = "結果を整理する"/);
  assert.doesNotMatch(s,/roomExperience|experience === "v3"|view: "next"|intent: "condition"|from === "activation"/);
});

await test('CANONICAL-CSS-REPLACES-LEGACY-INTERPRETATION-CSS',()=>{
  const html=read('index.html');
  assert.match(html,/<link rel="stylesheet" href="\.\/styles\/interpretation-room\.css">/);
  assert.doesNotMatch(html,/styles\/interpretation-room-v3\.css/);
  assert.equal(exists('styles/interpretation-room.css'),true);
  assert.equal(exists('styles/interpretation-room-v3.css'),false);
  const css=read('styles/interpretation-room.css');
  assert.match(css,/\.app-shell--immersive/);
  assert.match(css,/\.interpretation-room-header/);
  assert.match(css,/\.interpretation-room\b/);
});

await test('PWA-PRECACHES-ONLY-CANONICAL-INTERPRETATION-PRESENTATION',()=>{
  const sw=read('service-worker.js');
  assert.match(sw,/\.\/ui\/interpretationRoomPresentation\.js/);
  assert.match(sw,/\.\/styles\/interpretation-room\.css/);
  assert.doesNotMatch(sw,/interpretationRoomPresentationV3\.js/);
  assert.doesNotMatch(sw,/styles\/interpretation-room-v3\.css/);
});

await test('PRIMARY-NAVIGATION-REMAINS-UNCHANGED',()=>{
  const s=read('ui/screenArchitecture.js');
  for(const screen of ['home','record-input','result','history','more']) {
    assert.match(s,new RegExp(`screen: "${screen}"`));
  }
  assert.doesNotMatch(s,/screen: "interpretation-room", label:/);
});

const failed=results.filter(x=>x.status==='FAIL');
console.log(JSON.stringify({suite:'Interpretation Canonical Integration',total:results.length,passed:results.length-failed.length,failed:failed.length,status:failed.length?'FAIL':'PASS',results},null,2));
if(failed.length)process.exitCode=1;
