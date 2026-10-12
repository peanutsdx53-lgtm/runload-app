import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import vm from 'node:vm';

const root = new URL('../',import.meta.url);
const read = (name) => fs.readFileSync(new URL(name,root),'utf8');
const register = read('docs/E01_HTML_SINK_REGISTER_20261011.csv').trim().split(/\r?\n/).slice(1).map(raw=>{
  const m=/^(E01-SINK-\d+),([^,]+),(\d+),([^,]+),(\d+),/.exec(raw);
  const hash=raw.match(/,([a-f0-9]{64})$/);
  assert.ok(m&&hash,`incomplete sink registry line: ${raw.slice(0,80)}`);
  return {id:m[1],file:m[2],line:Number(m[3]),kind:m[4],column:Number(m[5]),sha:hash[1]};
});

test('E01 all HTML writes include optional-chained insertAdjacentHTML and match raw SHA-256',()=>{
  assert.equal(register.length,38);
  const grouped = new Map();
  for(const entry of register) grouped.set(entry.file,[...(grouped.get(entry.file)||[]),entry]);
  let observed=0;
  const pattern=/\.innerHTML\s*=|\.insertAdjacentHTML(?:\?\.)?\s*\(|\.outerHTML\s*=|\.srcdoc\s*=|\.createContextualFragment\s*\(/g;
  for(const [file,rows] of grouped){
    const code=read(file),lines=code.split('\n'),matches=[...code.matchAll(pattern)];
    assert.equal(matches.length,rows.length,`count drift: ${file}`);
    for(let i=0;i<matches.length;i++){
      const match=matches[i];
      const line=code.slice(0,match.index).split('\n').length;
      const column=match.index-code.lastIndexOf('\n',match.index);
      assert.equal(line,rows[i].line,`${file} wrong source line`);
      assert.equal(column,rows[i].column,`${file} wrong source column`);
      assert.equal(crypto.createHash('sha256').update(lines[line-1]).digest('hex'),rows[i].sha,`${file}:${line} original-line hash drift`);
      observed++;
    }
  }
  assert.equal(observed,38);
});

test('E01 optional-chain failure notice is the one inventory delta from naive lexical search',()=>{
  const src=read('ui/interactions/interpretationRoomInteractions.js');
  const entry=register.find(x=>x.file==='ui/interactions/interpretationRoomInteractions.js'&&x.line===27);
  assert.ok(entry,'optional-chained DOM insertion must not disappear from registry');
  assert.match(src,/screen\.insertAdjacentHTML\?\.\("afterbegin", '<p role="status"/);
  const raw=src.split('\n')[entry.line-1];
  assert.ok(raw.includes('insertAdjacentHTML?.'));
  assert.ok(!raw.includes('${'),'notice has no interpolations');
  assert.ok(!raw.includes('articleId'),'attacker article ID must not become HTML');
});

test('E01 hostile selection ID remains data-only when a failed history write displays notice',()=>{
  const src=read('ui/interactions/interpretationRoomInteractions.js')
    .replace(/^import\s+(?:\{[\s\S]*?\}|[^;]+?)\s+from\s+["'][^"']+["'];\s*$/gm,'')
    .replace(/^export\s+function\b/gm,'function');
  const attack='\" autofocus onfocus=alert(9)><img src=x onerror=alert(9)>';
  const notices=[];
  const sandbox={
    loadInterpretationReferenceHistory:()=>[],
    rememberInterpretationReferenceSelectionResult:()=>({ok:false}),
    window:{}, document:{},
  };
  vm.runInNewContext(`${src}\nglobalThis.__test=rememberVisibleInterpretationReference;`,sandbox,{timeout:1500});
  const screen={
    dataset:{interpretationAutoReadingId:attack},
    querySelector:()=>null,
    insertAdjacentHTML(position,html){notices.push({position,html});},
  };
  const room={querySelector:()=>({dataset:{interpretationReferenceArticleId:attack}})};
  const services={storage:{gateway:{}},workflows:{records:{loadLatestExperience:()=>({record:{id:attack}})}}};
  sandbox.__test(screen,room,services,{parameters:new URLSearchParams()});
  assert.equal(notices.length,1);
  assert.equal(notices[0].position,'afterbegin');
  assert.doesNotMatch(notices[0].html,/onerror|onfocus|<img|alert\(9\)/i);
  assert.match(notices[0].html,/関連情報の提示履歴を保存できませんでした/);
});
