import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,'..');
const read=(rel)=>fs.readFileSync(path.join(root,rel),'utf8');
const results=[];
async function test(id,fn){try{await fn();results.push({id,status:'PASS'});}catch(error){results.push({id,status:'FAIL',message:error?.stack||String(error)});}}

await test('V3-PREVIEW-IS-EXPLICIT-AND-V2-REMAINS-DEFAULT',()=>{
  const s=read('screens/interpretationRoomScreen.js');
  assert.match(s,/const ALLOWED_EXPERIENCES = new Set\(\["v2", "v3"\]\)/);
  assert.match(s,/safeParameter\(parameters, "experience", ALLOWED_EXPERIENCES, "v2"\)/);
  assert.match(s,/if \(experience === "v3"\)/);
  assert.match(s,/data-experience="v3"/);
  assert.match(s,/data-experience="v2"/);
});

await test('V3-SCREEN-USES-SEPARATE-CORE-AND-PRESENTATION',()=>{
  const s=read('screens/interpretationRoomScreen.js');
  assert.match(s,/buildRunLoadInterpretationV3/);
  assert.match(s,/renderInterpretationRoomV3/);
  assert.match(s,/buildRunLoadInterpretation\(buildArgs\)/);
  assert.match(s,/renderInterpretationRoom\(\{ output, view, mode, topic, intent, origin \}\)/);
});

await test('V3-REGION-SELECTION-PRESERVES-EXPERIENCE',()=>{
  const s=read('ui/interpretationRoomPresentationV3.js');
  assert.match(s,/query\.set\("experience", "v3"\)/);
  assert.match(s,/regionHref\(output, region\.regionId\)/);
});

await test('V3-SIMULATION-LINK-CARRIES-RETURN-EXPERIENCE',()=>{
  const s=read('ui/interpretationRoomPresentationV3.js');
  assert.match(s,/query\.set\("roomExperience", "v3"\)/);
  assert.match(s,/query\.set\("from", "interpretation-room"\)/);
});

await test('SIMULATION-PRESERVES-V3-RETURN-CONTEXT',()=>{
  const s=read('screens/simulationScreen.js');
  assert.match(s,/roomExperience/);
  assert.match(s,/safeRoomExperience=roomExperience==="v3"\?"v3":""/);
  assert.match(s,/experience=v3/);
  assert.match(s,/selfQuery\.set\("roomExperience",safeRoomExperience\)/);
});

await test('SCREEN-ARCHITECTURE-PRESERVES-V3-RETURN-CONTEXT',()=>{
  const s=read('ui/screenArchitecture.js');
  assert.match(s,/const roomExperience = parameter\("roomExperience"\)/);
  assert.match(s,/roomExperience === "v3"/);
  assert.match(s,/experience: "v3"/);
});

await test('V3-CSS-IS-SEPARATE-FROM-V2-CSS',()=>{
  const html=read('index.html');
  assert.match(html,/<link rel="stylesheet" href="\.\/styles\/interpretation-room\.css">/);
  assert.match(html,/<link rel="stylesheet" href="\.\/styles\/interpretation-room-v3\.css">/);
  const css=read('styles/interpretation-room-v3.css');
  assert.match(css,/\.interpretation-v3\b/);
  assert.doesNotMatch(css,/\.interpretation-primary\s*\{/);
});

await test('PWA-PRECACHES-V3-PREVIEW-RUNTIME',()=>{
  const sw=read('service-worker.js');
  for(const asset of [
    './core/interpretationCoreV3.js',
    './ui/interpretationRoomPresentationV3.js',
    './styles/interpretation-room-v3.css',
  ]) assert.ok(sw.includes(`"${asset}"`),asset);
});

await test('V3-PREVIEW-DOES-NOT-ALTER-PRIMARY-NAVIGATION',()=>{
  const s=read('ui/screenArchitecture.js');
  for(const screen of ['home','record-input','result','history','more']) {
    assert.match(s,new RegExp(`screen: "${screen}"`));
  }
  assert.doesNotMatch(s,/screen: "interpretation-room", label:/);
});

const failed=results.filter(x=>x.status==='FAIL');
console.log(JSON.stringify({suite:'Interpretation V3 Preview Integration',total:results.length,passed:results.length-failed.length,failed:failed.length,status:failed.length?'FAIL':'PASS',results},null,2));
if(failed.length)process.exitCode=1;
