import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,'..');
const read=(p)=>fs.readFileSync(path.join(root,p),'utf8');
const results=[];
async function test(id,fn){try{await fn();results.push({id,status:'PASS'});}catch(error){results.push({id,status:'FAIL',message:error?.stack||String(error)});}}

await test('READING-USES-USER-FACING-COPY-LAYER',()=>{
  const source=read('screens/readingScreen.js');
  assert.ok(source.includes('const READING_COPY = Object.freeze('));
  assert.ok(source.includes('記録を見返すヒント'));
  assert.ok(source.includes('テーマで絞る'));
  assert.ok(source.includes('reading-list-head'));
  assert.ok(source.includes('見返すときは'));
  assert.ok(!source.includes('Current App'));
  assert.ok(!source.includes('公開資料・研究文献を背景にした一般情報'));
  assert.ok(!source.includes('class="caution"'));
  assert.ok(!source.includes('class="source-note"'));
});

await test('READING-COPY-USES-PLAIN-LANGUAGE',()=>{
  const source=read('screens/readingScreen.js');
  for(const phrase of [
    '12部位の目安は「その部位の100」と比べる',
    '履歴は、比べられる記録だけをつなぐ',
    '予定と実際は、分けて残す',
    '暑い日は、気温だけを見ない',
    '共有するときは、事実と自分の言葉を分ける',
  ]) assert.ok(source.includes(phrase), phrase);
  assert.ok(!source.includes('一般情報です。安全・危険や運動可否'));
  assert.ok(!source.includes('旧形式の走行全体スコア'));
});

await test('READING-INTERACTIONS-PRESERVE-CONTEXT',()=>{
  const source=read('ui/interactions/readingInteractions.js');
  assert.ok(source.includes('returnFocus'));
  assert.ok(source.includes('event.key === "Escape"'));
  assert.ok(source.includes('setAttribute("aria-pressed"'));
  assert.ok(source.includes('count.textContent'));
});

await test('READING-LAYOUT-HAS-REFRESHED-CARDS-AND-DIALOG',()=>{
  const mobile=read('styles/mobile.css');
  const desktop=read('styles/desktop.css');
  assert.ok(mobile.includes('Reading experience refresh 2026-09-24'));
  assert.ok(mobile.includes('.article-card__open'));
  assert.ok(mobile.includes('.reading-list-head'));
  assert.ok(desktop.includes('Reading experience refresh 2026-09-24'));
  assert.ok(desktop.includes('grid-template-columns:repeat(3,minmax(0,1fr))'));
  assert.ok(desktop.includes('.reading-detail'));
});

const failed=results.filter((item)=>item.status==='FAIL');
console.log(JSON.stringify({suite:'Reading Experience',total:results.length,passed:results.length-failed.length,failed:failed.length,status:failed.length?'FAIL':'PASS',results},null,2));
if(failed.length)process.exitCode=1;
