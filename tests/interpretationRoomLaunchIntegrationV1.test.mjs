import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { renderSimulationScreen } from '../screens/simulationScreen.js';

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,'..');
const read=(rel)=>fs.readFileSync(path.join(root,rel),'utf8');
const results=[];
async function test(id,fn){try{await fn();results.push({id,status:'PASS'});}catch(error){results.push({id,status:'FAIL',message:error?.stack||String(error)});}}

await test('RESULT-LAUNCHES-CANONICAL-INTERPRETATION',()=>{
  const s=read('screens/resultScreen.js');
  assert.match(s,/#\/interpretation-room\?recordId=\$\{encodeURIComponent\(record\.id\)\}&origin=result/);
  assert.doesNotMatch(s,/experience=v3/);
  assert.match(s,/今回の結果を整理する/);
  assert.match(s,/基準・過去・計算に使った情報と一緒に確認します/);
});

await test('HOME-LATEST-RECORD-SEPARATES-RESULT-AND-ORGANIZATION',()=>{
  const s=read('screens/homeScreen.js');
  assert.match(s,/#\/interpretation-room\?recordId=\$\{encodeURIComponent\(record\.id\)\}&origin=home/);
  assert.doesNotMatch(s,/experience=v3/);
  assert.match(s,/結果を見る/);
  assert.match(s,/結果を整理する/);
});

await test('BODY-DETAIL-HAS-CONTEXTUAL-LAUNCH',()=>{
  const s=read('screens/bodyPartDetailScreen.js');
  assert.match(s,/origin=body-part-detail&regionId=\$\{encodeURIComponent\(regionId\)\}/);
  assert.doesNotMatch(s,/experience=v3/);
  assert.match(s,/この部位の結果を整理する/);
});

await test('HISTORY-SELECTED-RECORD-HAS-CONTEXTUAL-LAUNCH',()=>{
  const s=read('screens/historyScreen.js');
  assert.match(s,/origin=history&regionId=\$\{encodeURIComponent\(workspace\.regionId\)\}/);
  assert.doesNotMatch(s,/experience=v3/);
  assert.match(s,/この記録の結果を整理する/);
});

await test('LEGACY-ACTIVATION-ROUTE-IS-REMOVED',()=>{
  const app=read('app.js');
  assert.doesNotMatch(app,/renderActivationScreen|routeAliases|activation:\s*\(parameters\)\s*=>|#\/activation/);
  const architecture=read('ui/screenArchitecture.js');
  assert.doesNotMatch(architecture,/from === "activation"|screen: "activation"/);
});

await test('SIMULATION-FROM-ROOM-PRESERVES-RETURN-CONTEXT',()=>{
  const records=[
    {id:'old',date:'2026-09-10',createdAt:'2026-09-10T08:00:00Z',activityType:'run',distanceKm:3,durationMinutes:18,course:{name:'Old course'}},
    {id:'latest',date:'2026-09-20',createdAt:'2026-09-20T08:00:00Z',activityType:'run',distanceKm:9,durationMinutes:54,course:{name:'Latest course'}},
  ];
  const services={storage:{records:{loadAll:()=>records,findById:(id)=>records.find((r)=>r.id===id)||null}}};
  const context={parameters:new URLSearchParams('from=interpretation-room&recordId=old&roomOrigin=history')};
  const html=renderSimulationScreen({services,context});
  assert.match(html,/保存記録と条件を比べる/);
  assert.match(html,/選択した記録/);
  assert.match(html,/value="3\.0"/);
  assert.doesNotMatch(html,/value="9\.0"/);
  assert.match(html,/#\/interpretation-room\?recordId=old&amp;origin=history/);
  assert.match(html,/結果の整理へ戻る/);
  assert.doesNotMatch(html,/view=next|intent=condition|experience=v3|roomExperience/);
});

await test('SIMULATION-COURSE-ROUNDTRIP-PRESERVES-SOURCE-RECORD',()=>{
  const records=[{id:'old',date:'2026-09-10',createdAt:'2026-09-10T08:00:00Z',activityType:'run',distanceKm:3,durationMinutes:18,course:{name:'Old course'}}];
  const services={storage:{records:{loadAll:()=>records,findById:(id)=>records.find((r)=>r.id===id)||null}}};
  const context={parameters:new URLSearchParams('from=interpretation-room&recordId=old&roomOrigin=result')};
  const html=renderSimulationScreen({services,context});
  assert.match(html,/returnTo=%23%2Fsimulation%3Ffrom%3Dinterpretation-room%26recordId%3Dold%26roomOrigin%3Dresult/);
});

await test('INTERPRETATION-ACTIONS-CARRY-ROOM-ORIGIN-WITHOUT-VERSION-STATE',()=>{
  const s=read('ui/interpretationRoomPresentation.js');
  assert.match(s,/query\.set\("from", "interpretation-room"\)/);
  assert.match(s,/query\.set\("roomOrigin", output\?\.target\?\.origin \|\| "result"\)/);
  assert.doesNotMatch(s,/roomExperience|experience=v3/);
});

await test('SCREEN-ARCHITECTURE-RETURNS-SIMULATION-TO-CANONICAL-ROOM',()=>{
  const s=read('ui/screenArchitecture.js');
  assert.match(s,/from === "interpretation-room"/);
  assert.match(s,/backLabel: "結果の整理"/);
  assert.match(s,/screenHref\("interpretation-room", \{ recordId, origin: roomOrigin \|\| "result" \}\)/);
  assert.doesNotMatch(s,/roomExperience|view: "next"|intent: "condition"/);
});

await test('APP-SHELL-USES-CANONICAL-INTERPRETATION-WORDING',()=>{
  const s=read('ui/appShell.js');
  assert.match(s,/title: "結果を整理する"/);
  assert.doesNotMatch(s,/結果を理解する/);
});

const failed=results.filter((x)=>x.status==='FAIL');
console.log(JSON.stringify({suite:'Interpretation Launch Integration',total:results.length,passed:results.length-failed.length,failed:failed.length,status:failed.length?'FAIL':'PASS',results},null,2));
if(failed.length)process.exitCode=1;
