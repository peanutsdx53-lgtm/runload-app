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

await test('RESULT-REPLACES-ACTIVATION-WITH-INTERPRETATION-LAUNCH',()=>{
  const s=read('screens/resultScreen.js');
  assert.match(s,/#\/interpretation-room\?recordId=\$\{encodeURIComponent\(record\.id\)\}&origin=result/);
  assert.match(s,/今回の結果を理解する/);
  assert.match(s,/表示された内容を順番に整理して確認します/);
  assert.doesNotMatch(s,/#\/activation\?recordId=\$\{encodeURIComponent\(record\.id\)\}/);
});

await test('HOME-LATEST-RECORD-SEPARATES-RESULT-AND-UNDERSTANDING',()=>{
  const s=read('screens/homeScreen.js');
  assert.match(s,/#\/interpretation-room\?recordId=\$\{encodeURIComponent\(record\.id\)\}&origin=home/);
  assert.match(s,/結果を見る/);
  assert.match(s,/結果を理解する/);
  assert.doesNotMatch(s,/>結果の活用</);
});

await test('BODY-DETAIL-HAS-CONTEXTUAL-COMPACT-LAUNCH',()=>{
  const s=read('screens/bodyPartDetailScreen.js');
  assert.match(s,/origin=body-part-detail&regionId=\$\{encodeURIComponent\(regionId\)\}/);
  assert.match(s,/この部位の結果を理解する/);
});

await test('HISTORY-SELECTED-RECORD-HAS-CONTEXTUAL-LAUNCH',()=>{
  const s=read('screens/historyScreen.js');
  assert.match(s,/origin=history&regionId=\$\{encodeURIComponent\(workspace\.regionId\)\}/);
  assert.match(s,/この記録の結果を理解する/);
});

await test('ACTIVATION-IS-ALIAS-NOT-A-PUBLIC-SCREEN',()=>{
  const app=read('app.js');
  assert.doesNotMatch(app,/renderActivationScreen/);
  assert.doesNotMatch(app,/activation:\s*renderActivationScreen/);
  assert.match(app,/activation:\s*\(parameters\)\s*=>/);
  assert.match(app,/screen:\s*"interpretation-room"/);
  assert.match(app,/nextParameters\.set\("origin",\s*"result"\)/);
});

await test('FEATURE-MENU-AND-WORKSPACE-USE-INTERPRETATION-NOT-ACTIVATION',()=>{
  const s=read('ui/screenArchitecture.js');
  assert.match(s,/screen: "interpretation-room", label: "結果を理解する"/);
  assert.match(s,/route\("interpretation-room", \{ recordId, origin: "result" \}\)/);
  assert.doesNotMatch(s,/screen: "activation", label: "結果の活用"/);
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
  assert.match(html,/#\/interpretation-room\?recordId=old&amp;origin=history&amp;view=next&amp;intent=condition/);
  assert.match(html,/結果の理解へ戻る/);
});

await test('SIMULATION-COURSE-ROUNDTRIP-PRESERVES-SOURCE-RECORD',()=>{
  const records=[{id:'old',date:'2026-09-10',createdAt:'2026-09-10T08:00:00Z',activityType:'run',distanceKm:3,durationMinutes:18,course:{name:'Old course'}}];
  const services={storage:{records:{loadAll:()=>records,findById:(id)=>records.find((r)=>r.id===id)||null}}};
  const context={parameters:new URLSearchParams('from=interpretation-room&recordId=old&roomOrigin=result')};
  const html=renderSimulationScreen({services,context});
  assert.match(html,/returnTo=%23%2Fsimulation%3Ffrom%3Dinterpretation-room%26recordId%3Dold%26roomOrigin%3Dresult/);
});

await test('INTERPRETATION-SIMULATION-LINK-CARRIES-ROOM-ORIGIN-WITHOUT-CORE-MUTATION',()=>{
  const s=read('ui/interpretationRoomPresentation.js');
  assert.match(s,/function actionHref\(action, roomOrigin = ""\)/);
  assert.match(s,/query\.set\("roomOrigin", roomOrigin\)/);
  assert.match(s,/output\?\.context\?\.origin \|\| "result"/);
});

await test('SIMULATION-SCREEN-ARCHITECTURE-RETURNS-TO-ROOM',()=>{
  const s=read('ui/screenArchitecture.js');
  assert.match(s,/from === "interpretation-room"/);
  assert.match(s,/backLabel: "結果の理解"/);
  assert.match(s,/view: "next", intent: "condition"/);
});

await test('APP-SHELL-HAS-NO-PUBLIC-ACTIVATION-LABEL',()=>{
  const s=read('ui/appShell.js');
  assert.doesNotMatch(s,/activation: "RESULT USE"/);
});

const failed=results.filter((x)=>x.status==='FAIL');
console.log(JSON.stringify({suite:'Interpretation Room Launch Integration V1',total:results.length,passed:results.length-failed.length,failed:failed.length,status:failed.length?'FAIL':'PASS',results},null,2));
if(failed.length)process.exitCode=1;
