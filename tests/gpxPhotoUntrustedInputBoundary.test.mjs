import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseGpxText } from '../ui/gpxLocalAnalysis.js';

const uiSource = readFileSync(new URL('../ui/interactions/gpxAnalysisInteractions.js', import.meta.url), 'utf8');
function mockParser(nodes, counter) {
  const prev = globalThis.DOMParser;
  globalThis.DOMParser = class { parseFromString() {
    counter.calls++;
    return { querySelector:()=>null, querySelectorAll:(s)=>s==='trkpt, rtept'?nodes:[] };
  } };
  return () => { if(prev===undefined) delete globalThis.DOMParser; else globalThis.DOMParser=prev; };
}
for (const length of [10_000_001,12_000_000]) {
  test(`oversize GPX text (${length} chars) is rejected before DOMParser`,()=> {
    const calls={calls:0};const restore=mockParser([],calls);
    try { assert.throws(()=>parseGpxText('x'.repeat(length)),/GPX_TOO_LARGE/);assert.equal(calls.calls,0); }
    finally {restore();}
  });
}
test('GPX parser rejects too many points before mapping',()=> {
  const calls={calls:0};const nodes={length:100_001,[Symbol.iterator]:function*(){throw Error('MAPPED');}};
  const restore=mockParser(nodes,calls);
  try { assert.throws(()=>parseGpxText('<gpx/>'),/GPX_TOO_MANY_POINTS/);assert.equal(calls.calls,1); }
  finally {restore();}
});
test('GPX UI validates File.size before calling File.text',()=> {
  assert.match(uiSource,/f\.size\s*>\s*GPX_MAX_BYTES/);
  assert.match(uiSource,/10MB以下/);
});
test('GPX parser has explicit text and point budgets',()=> {
  const source=readFileSync(new URL('../ui/gpxLocalAnalysis.js',import.meta.url),'utf8');
  assert.match(source,/GPX_MAX_TEXT_CHARS/);assert.match(source,/GPX_MAX_POINTS/);
});
test('backup import already enforces a file size budget and JSON parse limit',()=> {
  const backup=readFileSync(new URL('../core/internal/backupService.js',import.meta.url),'utf8');
  const safety=readFileSync(new URL('../core/internal/inputSupport.js',import.meta.url),'utf8');
  assert.match(backup,/size > INPUT_LIMITS\.backupBytes/);
  assert.match(backup,/parseJsonText\(text\)/);
  assert.match(safety,/backupBytes: 16 \* 1024 \* 1024/);
});
test('experimental photo store remains local and is not network-backed', () => {
  const source=readFileSync(new URL('../ui/mobilePhotoMemoStore.js',import.meta.url),'utf8');
  assert.match(source,/indexedDB/);
  assert.doesNotMatch(source,/fetch\(|XMLHttpRequest/);
});
