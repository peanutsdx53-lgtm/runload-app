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
  assert.ok(source.includes('自分で読み解くための短いガイド'));
  assert.ok(source.includes('まずここだけ'));
  assert.ok(source.includes('続けて読む'));
  assert.ok(!source.includes('Current App'));
  assert.ok(!source.includes('公開資料・研究文献を背景にした一般情報'));
  assert.ok(!source.includes('class="caution"'));
  assert.ok(!source.includes('class="source-note"'));
});

await test('READING-HAS-SEARCH-FILTER-COUNTS-AND-EMPTY-STATE',()=>{
  const source=read('screens/readingScreen.js');
  const interactions=read('ui/interactions/readingInteractions.js');
  assert.ok(source.includes('data-reading-search'));
  assert.ok(source.includes('filter-count'));
  assert.ok(source.includes('data-reading-empty'));
  assert.ok(source.includes('data-reading-reset'));
  assert.ok(interactions.includes('const applyFilters'));
  assert.ok(interactions.includes('normalize(card.dataset.readingSearch'));
  assert.ok(interactions.includes('visible !== 0'));
  assert.ok(interactions.includes('setFilter("all")'));
});

await test('READING-FILTER-HIDDEN-STATE-CANNOT-BE-OVERRIDDEN',()=>{
  const mobile=read('styles/mobile.css');
  const desktop=read('styles/desktop.css');
  assert.ok(mobile.includes('[data-reading-card][hidden]'));
  assert.ok(mobile.includes('display:none !important'));
  assert.ok(desktop.includes('[data-reading-card][hidden]'));
  assert.ok(desktop.includes('display:none !important'));
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
  assert.ok(!source.includes('旧形式の走行全体スコア'));
});

await test('READING-INTERACTIONS-PRESERVE-CONTEXT',()=>{
  const source=read('ui/interactions/readingInteractions.js');
  assert.ok(source.includes('returnFocus'));
  assert.ok(source.includes('const alreadyOpen = !drawer.hidden'));
  assert.ok(source.includes('event.key === "Escape"'));
  assert.ok(source.includes('setAttribute("aria-pressed"'));
  assert.ok(source.includes('count.textContent'));
});

await test('READING-LAYOUT-HAS-SEARCH-LARGER-TYPE-AND-RELATED-CARDS',()=>{
  const mobile=read('styles/mobile.css');
  const desktop=read('styles/desktop.css');
  assert.ok(mobile.includes('Reading experience refinement 2026-09-24 v2'));
  assert.ok(mobile.includes('.reading-search'));
  assert.ok(mobile.includes('.reading-related-card'));
  assert.ok(desktop.includes('Reading experience refinement 2026-09-24 v2'));
  assert.ok(desktop.includes('font-size:1rem !important'));
  assert.ok(desktop.includes('.reading-related__grid'));
  assert.ok(desktop.includes('.reading-keypoints'));
});

const failed=results.filter((item)=>item.status==='FAIL');
console.log(JSON.stringify({suite:'Reading Experience',total:results.length,passed:results.length-failed.length,failed:failed.length,status:failed.length?'FAIL':'PASS',results},null,2));
if(failed.length)process.exitCode=1;
