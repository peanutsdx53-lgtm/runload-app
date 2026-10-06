import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,'..');
const read=(p)=>fs.readFileSync(path.join(root,p),'utf8');
const results=[];
async function test(id,fn){try{await fn();results.push({id,status:'PASS'});}catch(error){results.push({id,status:'FAIL',message:error?.stack||String(error)});}}

await test('READING-USES-KNOWLEDGE-FIRST-ARTICLE-STRUCTURE',()=>{
  const source=read('screens/readingScreen.js');
  assert.ok(source.includes('const READING_COPY = Object.freeze('));
  assert.ok(source.includes('ランニングを知る、記録を理解する'));
  assert.ok(source.includes('短い記事でまとめています'));
  assert.ok(source.includes('まず知っておきたいこと'));
  assert.ok(source.includes('<h2>要約</h2>'));
  assert.ok(source.includes('<h2>本文</h2>'));
  assert.ok(source.includes('<h3>出典元</h3>'));
  assert.ok(source.includes('renderReadingSources(copy.sources)'));
  assert.ok(source.includes('続けて読む'));
  assert.ok(!source.includes('class="caution"'));
  assert.ok(!source.includes('まずここだけ'));
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
  const mobile=read('styles/mobile-screen-layouts.css');
  const desktop=read('styles/desktop-screen-layouts.css');
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

await test('READING-INTERACTIONS-KEEP-FILTER-AND-SEARCH-STATE-LOCAL',()=>{
  const source=read('ui/interactions/readingInteractions.js');
  assert.ok(source.includes('setAttribute("aria-pressed"'));
  assert.ok(source.includes('count.textContent'));
  assert.ok(source.includes('normalize(card.dataset.readingSearch'));
  assert.ok(!source.includes('returnFocus'));
  assert.ok(!source.includes('drawer.hidden'));
  assert.ok(!source.includes('event.key === "Escape"'));
});

await test('READING-LAST-ODD-CARD-KEEPS-ACTION-ALIGNED',()=>{
  const desktop=read('styles/desktop-screen-layouts.css');
  const finalFix=desktop.lastIndexOf('.screen--reading.screen-layout--reading .grid > .article-card:last-child:nth-child(odd)');
  assert.ok(finalFix>=0);
  const tail=desktop.slice(finalFix,finalFix+420);
  assert.ok(tail.includes('display:flex !important'));
  assert.ok(tail.includes('flex-direction:column !important'));
  assert.ok(tail.includes('align-items:stretch !important'));
});

await test('READING-ARTICLE-USES-DEDICATED-ROUTE-VIEW',()=>{
  const source=read('screens/readingScreen.js');
  const interactions=read('ui/interactions/readingInteractions.js');
  const mobile=read('styles/mobile-screen-layouts.css');
  const desktop=read('styles/desktop-screen-layouts.css');
  assert.ok(source.includes('const requestedArticleId = publicArticleId(context.parameters.get("articleId") || "");'));
  assert.ok(source.includes('return renderReadingArticleView(article, items, context);'));
  assert.ok(source.includes('screen--reading-article'));
  assert.ok(source.includes('readingArticleHref(article.id, context)'));
  assert.ok(!source.includes('data-reading-drawer'));
  assert.ok(!source.includes('data-reading-close'));
  assert.ok(!interactions.includes('openArticle'));
  assert.ok(!interactions.includes('data-reading-drawer'));
  assert.ok(mobile.includes('.screen-layout--reading-article .reading-article-page'));
  assert.ok(desktop.includes('.screen--reading-article.screen-layout--reading-article .reading-detail__content'));
});

await test('READING-ARTICLE-KEEPS-KNOWLEDGE-SECTIONS-AND-SOURCES',()=>{
  const source=read('screens/readingScreen.js');
  assert.ok(source.includes('<h2>要約</h2>'));
  assert.ok(source.includes('<h2>本文</h2>'));
  assert.ok(source.includes('<h3>出典元</h3>'));
  assert.ok(source.includes('renderReadingSources(copy.sources)'));
  assert.ok(source.includes('続けて読む'));
  assert.ok(source.includes('読みものへ戻る'));
  const architecture=read('ui/screenArchitecture.js');
  assert.ok(architecture.includes('if (articleId) return { title: "読みもの", backHref: "#/reading", backLabel: "読みもの" };'));
});

const failed=results.filter((item)=>item.status==='FAIL');
console.log(JSON.stringify({suite:'Reading Experience',total:results.length,passed:results.length-failed.length,failed:failed.length,status:failed.length?'FAIL':'PASS',results},null,2));
if(failed.length)process.exitCode=1;
