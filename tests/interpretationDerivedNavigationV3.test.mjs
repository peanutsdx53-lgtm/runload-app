import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { resolveScreenContextNavigation } from '../ui/screenArchitecture.js';

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,'..');
const read=(rel)=>fs.readFileSync(path.join(root,rel),'utf8');
const results=[];
async function test(id,fn){try{await fn();results.push({id,status:'PASS'});}catch(error){results.push({id,status:'FAIL',message:error?.stack||String(error)});}}

const derivedParams='recordId=r1&sourceRecordId=r1&regionId=BA-DISP-014&from=interpretation-room&roomOrigin=history';
const location=(query)=>({parameters:new URLSearchParams(query)});

await test('PLAN-DERIVED-BACK-RETURNS-TO-SAME-V3-REGION',()=>{
  const nav=resolveScreenContextNavigation('plan',location(derivedParams));
  assert.equal(nav.title,'次の予定');
  assert.equal(nav.backLabel,'結果の整理');
  assert.match(nav.backHref,/#\/interpretation-room\?/);
  assert.match(nav.backHref,/recordId=r1/);
  assert.match(nav.backHref,/origin=history/);
  assert.match(nav.backHref,/regionId=BA-DISP-014/);
});

await test('CONSULTATION-DERIVED-BACK-RETURNS-TO-SAME-V3-REGION',()=>{
  const nav=resolveScreenContextNavigation('consultation',location(derivedParams));
  assert.equal(nav.title,'共有用にまとめる');
  assert.equal(nav.backLabel,'結果の整理');
  assert.match(nav.backHref,/regionId=BA-DISP-014/);
});

await test('READING-DERIVED-BACK-RETURNS-TO-SAME-V3-REGION',()=>{
  const nav=resolveScreenContextNavigation('reading',location(derivedParams));
  assert.equal(nav.title,'読みもの');
  assert.equal(nav.backLabel,'結果の整理');
  assert.match(nav.backHref,/regionId=BA-DISP-014/);
});

await test('DIRECT-ENTRY-BACK-BEHAVIOR-IS-PRESERVED',()=>{
  assert.deepEqual(resolveScreenContextNavigation('plan',location('')),{
    title:'次の予定',backHref:'#/home',backLabel:'Home',
  });
  assert.deepEqual(resolveScreenContextNavigation('consultation',location('recordId=r1')),{
    title:'共有用にまとめる',backHref:'#/result?recordId=r1',backLabel:'結果',
  });
  assert.deepEqual(resolveScreenContextNavigation('reading',location('')),{
    title:'読みもの',backHref:'#/more',backLabel:'その他',
  });
});

await test('SIMULATION-FROM-DERIVED-PLAN-USES-PRESERVED-PLAN-RETURN',()=>{
  const returnTo='#/plan?sourceRecordId=r1&recordId=r1&regionId=BA-DISP-014&from=interpretation-room&roomOrigin=history';
  const nav=resolveScreenContextNavigation('simulation',location(`from=plan&recordId=r1&returnTo=${encodeURIComponent(returnTo)}`));
  assert.equal(nav.title,'条件比較');
  assert.equal(nav.backLabel,'予定');
  assert.equal(nav.backHref,returnTo);
});

await test('PLAN-USES-SELECTED-SOURCE-RECORD-AND-PRESERVES-SUBFLOW-CONTEXT',()=>{
  const s=read('screens/planScreen.js');
  assert.match(s,/sourceRecordId/);
  assert.match(s,/findById\?\.\(sourceRecordId\)/);
  assert.match(s,/requestedSource\?\.activityType==="run"\?requestedSource:latestRunRecord/);
  assert.match(s,/planContextHref\(context, planId\)/);
  assert.match(s,/simulationQuery\.set\("returnTo",selfHref\)/);
  assert.match(s,/今回の記録/);
  assert.match(s,/結果の整理へ戻る/);
});

await test('CONSULTATION-SUPPORT-ROUNDTRIP-PRESERVES-DERIVED-CONTEXT',()=>{
  const s=read('screens/consultationScreen.js');
  assert.match(s,/from === "interpretation-room"/);
  assert.match(s,/backLabel = "結果の整理へ戻る"/);
  assert.match(s,/selfHref/);
  assert.match(s,/returnTo=\$\{encodeURIComponent\(selfHref\)\}/);
});

await test('READING-DERIVED-INTERNAL-BACK-PRESERVES-V3-CONTEXT',()=>{
  const s=read('screens/readingScreen.js');
  assert.match(s,/from === "interpretation-room"/);
  assert.doesNotMatch(s,/roomExperience|experience=v3/);
  assert.match(s,/backLabel = "結果の整理へ戻る"/);
  assert.match(s,/regionId/);
});

await test('APP-SHELL-KEEPS-DERIVED-SCREENS-IN-RESULT-PRIMARY-CONTEXT',()=>{
  const s=read('ui/appShell.js');
  assert.match(s,/\["plan", "consultation", "reading"\]\.includes\(currentScreen\) && parameter\("from"\) === "interpretation-room"/);
  assert.match(s,/parameter\("returnTo"\)\.includes\("from=interpretation-room"\) \? "result" : "home"/);
});

const failed=results.filter(x=>x.status==='FAIL');
console.log(JSON.stringify({suite:'Interpretation V3 Derived Navigation',total:results.length,passed:results.length-failed.length,failed:failed.length,status:failed.length?'FAIL':'PASS',results},null,2));
if(failed.length)process.exitCode=1;
