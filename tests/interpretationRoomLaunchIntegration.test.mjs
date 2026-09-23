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
  assert.match(html,/保存記録を基準に条件を比べる/);
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

await test('SIMULATION-EMBEDS-SOURCE-RECORD-ID-AND-SAVED-RUN-CONDITIONS',()=>{
  const records=[{
    id:'old',date:'2026-09-10',createdAt:'2026-09-10T08:00:00Z',activityType:'run',
    distanceKm:3,durationMinutes:20,runningFormat:'RUN_WALK',runningDistanceKm:2.4,runningDurationMinutes:14,
    course:{name:'Saved course',gradeKnowledge:'KNOWN_PROFILE',upPercent:20,downPercent:10,pavedPercent:100},
  }];
  const experiences={old:{regionalV2ResultRecord:{engine_input_snapshot:{runningFormat:'RUN_WALK',distanceKm:3,durationMinutes:20,runningDistanceKm:2.4,runningDurationMinutes:14,averageCadenceSpm:172,footStrikeObservation:{value:'RFS'}}}}};
  const services={
    storage:{records:{loadAll:()=>records,findById:(id)=>records.find((r)=>r.id===id)||null}},
    workflows:{records:{loadExperience:(id)=>experiences[id]||null}},
  };
  const context={parameters:new URLSearchParams('from=interpretation-room&recordId=old&roomOrigin=result')};
  const html=renderSimulationScreen({services,context});
  assert.match(html,/name="sourceRecordId" value="old"/);
  assert.match(html,/name="sourceEngineInputJson" value="[^"]*averageCadenceSpm[^"]*172/);
  assert.match(html,/name="sourceConditionJson" value="[^"]*Saved course/);
  assert.match(html,/name="runningFormat"[^>]*>[\s\S]*value="RUN_WALK" selected/);
  assert.match(html,/name="runningDistanceKm"[^>]*value="2\.4"/);
  assert.match(html,/name="runningDurationMinutes"[^>]*value="14"/);
  assert.match(html,/Saved course/);
  assert.match(html,/元の記録を初期値に使用/);
});

await test('SIMULATION-INTERACTION-COMPARES-AGAINST-SOURCE-EXPERIENCE-NOT-LATEST',()=>{
  const source=read('ui/interactions/simulationInteractions.js');
  assert.match(source,/function sourceValues\(services,recordId=""\)/);
  assert.match(source,/recordId\?services\.workflows\.records\.loadExperience\(recordId\):services\.workflows\.records\.loadLatestExperience\(\)/);
  assert.match(source,/sourceEngineInputFrom\(data\)/);
  assert.match(source,/\.\.\.source/);
  assert.match(source,/changedConditionLabels\(data\)/);
  assert.match(source,/変更なし/);
  assert.match(source,/name="sourceRecordId"/);
  assert.doesNotMatch(source,/function latestValues/);
  assert.match(source,/元の記録からの変化/);
});

await test('PC-CONDITION-COMPARISON-USES-READABLE-TYPE',()=>{
  const css=read('styles/desktop.css');
  const marker='PC interpretation-derived condition comparison V2 2026-09-23';
  const start=css.indexOf(marker);
  assert.ok(start>=0);
  const audit=css.slice(start);
  assert.match(audit,/\.measure-field > span[\s\S]*font-size:\s*0\.88rem\s*!important/);
  assert.match(audit,/\.measure-field input[\s\S]*font-size:\s*1\.35rem\s*!important/);
  assert.match(audit,/\.region-row strong[\s\S]*font-size:\s*0\.9rem\s*!important/);
  assert.match(audit,/\.region-value b[\s\S]*font-size:\s*1rem\s*!important/);
  assert.match(audit,/\.result-layout[\s\S]*grid-template-columns:\s*minmax\(18rem, 0\.9fr\) minmax\(22rem, 1\.1fr\)\s*!important/);
});

await test('MOBILE-CONDITION-COMPARISON-DOES-NOT-USE-MICRO-TYPE',()=>{
  const css=read('styles/mobile.css');
  const marker='Interpretation-derived simulation readability audit 2026-09-23';
  const start=css.indexOf(marker);
  assert.ok(start>=0);
  const audit=css.slice(start);
  assert.match(audit,/\.region-row small,[\s\S]*font-size:\s*0\.78rem/);
  assert.match(audit,/\.region-row strong[\s\S]*font-size:\s*0\.9rem/);
  assert.match(audit,/\.region-value b[\s\S]*font-size:\s*1rem/);
  assert.match(audit,/\.measure-field input[\s\S]*font-size:\s*1\.3rem/);
  assert.match(audit,/\.primary-action,[\s\S]*font-size:\s*0\.88rem/);
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
