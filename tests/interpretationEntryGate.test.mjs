import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,'..');
const read=(rel)=>fs.readFileSync(path.join(root,rel),'utf8');
const results=[];

async function test(id,fn){
  try{await fn();results.push({id,status:'PASS'});}
  catch(error){results.push({id,status:'FAIL',message:error?.stack||String(error)});}
}

await test('RESULT-GATE-COMES-AFTER-TWO-RESULT-BLOCKS',()=>{
  const source=read('screens/resultScreen.js');
  const line=source.split('\n').find((row)=>row.includes('understanding-link-wrap'))||'';
  assert.ok(line);
  const regional=line.indexOf('renderRegional(');
  const fatigue=line.indexOf('renderFatigue(');
  const gate=line.indexOf('understanding-link-wrap');
  const history=line.indexOf('history-link-wrap');
  assert.ok(regional>=0 && fatigue>regional && gate>fatigue && history>gate);
});

await test('RESULT-GATE-USES-PLAIN-LANGUAGE',()=>{
  const source=read('screens/resultScreen.js');
  const gate=source.match(/<section class="understanding-link-wrap"[\s\S]*?<\/section>/)?.[0]||'';
  assert.match(gate,/今回の結果を整理する/);
  assert.match(gate,/基準・過去・計算に使った情報と一緒に確認します/);
  assert.match(gate,/origin=result/);
  assert.doesNotMatch(gate,/RunLoad解釈|解釈エンジン|計算エンジン|Reference-100/);
});

await test('HOME-LATEST-RUN-SEPARATES-VIEW-AND-UNDERSTAND',()=>{
  const source=read('screens/homeScreen.js');
  const runLine=source.split('\n').find((row)=>row.includes('card-actions')&&row.includes('結果を見る'))||'';
  assert.ok(runLine);
  const view=runLine.indexOf('結果を見る');
  const understand=runLine.indexOf('結果を整理する');
  assert.ok(view>=0 && understand>view);
  assert.match(runLine,/#\/result\?recordId=/);
  assert.match(runLine,/#\/interpretation-room\?recordId=.*origin=home/);
});

await test('HOME-REMOVES-SEPARATE-INTERPRETATION-PROMO',()=>{
  const source=read('screens/homeScreen.js');
  assert.doesNotMatch(source,/RunLoad解釈|最新の結果を確認/);
  assert.doesNotMatch(source,/必要なときに開く[\s\S]*interpretation-room/);
});

await test('REST-RECORD-DOES-NOT-OFFER-UNDERSTANDING-ENTRY',()=>{
  const source=read('screens/homeScreen.js');
  const restLine=source.split('\n').find((row)=>row.includes('REST')&&row.includes('記録を開く'))||'';
  assert.ok(restLine);
  assert.doesNotMatch(restLine,/interpretation-room|結果を整理する|結果を理解する/);
});

await test('ENTRY-STYLING-IS-SECONDARY-NOT-WARNING',()=>{
  const css=read('styles/mobile.css');
  const start=css.indexOf('.screen-layout--result .understanding-link-wrap');
  const end=css.indexOf('.screen-layout--history',start);
  const block=css.slice(start,end);
  assert.ok(start>=0);
  assert.match(block,/background:var\(--surface\)/);
  assert.match(block,/border:1px solid var\(--line\)/);
  assert.doesNotMatch(block,/urgent|warn|danger|color-danger|gradient/i);
});

await test('HOME-UNDERSTANDING-ACTION-IS-VISUALLY-SECONDARY',()=>{
  const css=read('styles/mobile.css');
  const line=css.split('\n').find((row)=>row.includes('.card-link--understanding'))||'';
  assert.match(line,/background:transparent/);
  assert.match(line,/border-color:transparent/);
});

await test('NO-GLOBAL-NAV-ENTRY-IS-ADDED',()=>{
  const shell=read('ui/appShell.js');
  const hrefs=shell.match(/href="[^"]*interpretation-room[^"]*"/g)||[];
  assert.equal(hrefs.length,0);
});

const failed=results.filter((x)=>x.status==='FAIL');
console.log(JSON.stringify({suite:'Interpretation Entry Gate',total:results.length,passed:results.length-failed.length,failed:failed.length,status:failed.length?'FAIL':'PASS',results},null,2));
if(failed.length)process.exitCode=1;
