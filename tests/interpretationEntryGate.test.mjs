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
  const line=source.split('\n').find((row)=>row.includes('result-next-actions')&&row.includes('understanding-link'))||'';
  assert.ok(line);
  const regional=line.indexOf('renderRegional(');
  const fatigue=line.indexOf('renderFatigue(');
  const gate=line.indexOf('result-next-actions');
  const understand=line.indexOf('understanding-link');
  const history=line.indexOf('history-link');
  assert.ok(regional>=0 && fatigue>regional && gate>fatigue && understand>gate && history>understand);
});

await test('RESULT-GATE-USES-PLAIN-LANGUAGE',()=>{
  const source=read('screens/resultScreen.js');
  const gate=source.match(/<nav class="result-next-actions"[\s\S]*?<\/nav>/)?.[0]||'';
  assert.match(gate,/結果を整理/);
  assert.match(gate,/基準・過去と一緒に見る/);
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

await test('ENTRY-STYLING-IS-CALM-NOT-WARNING',()=>{
  const css=read('styles/mobile.css');
  const start=css.indexOf('.screen-layout--result .result-next-actions {');
  const end=css.indexOf('/* Mobile typography floor',start);
  const block=css.slice(start,end);
  assert.ok(start>=0 && end>start);
  assert.match(block,/border:\s*1px solid var\(--color-line\)/);
  assert.match(block,/background:\s*color-mix\(in srgb, var\(--color-accent-soft\) 42%, var\(--color-surface\)\)/);
  assert.doesNotMatch(block,/urgent|warn|danger|color-danger/i);
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
