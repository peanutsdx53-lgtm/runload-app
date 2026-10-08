import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { parseGpxText } from '../ui/gpxLocalAnalysis.js';

const uiSource = readFileSync(new URL('../ui/interactions/gpxAnalysisInteractions.js', import.meta.url), 'utf8');
const photoSource = readFileSync(new URL('../ui/interactions/mobilePhotoMemoInteractions.js', import.meta.url), 'utf8');
function photoProbes() {
  const code = photoSource.replace(/^import[\s\S]*?from\s+"[^"]+";\s*/gm, '')
    .replace('export function bindMobilePhotoMemo', 'function bindMobilePhotoMemo');
  const sandbox = { Blob, ArrayBuffer, Uint8Array, PHOTO_MEMO_MAX_BYTES: 1_000_000 };
  vm.runInNewContext(code + '\nglobalThis.__probes = { displayBlobForEntry, detectImageMime };', sandbox);
  return sandbox.__probes;
}
function mockParser(nodes, counter) {
  const prev = globalThis.DOMParser;
  globalThis.DOMParser = class { parseFromString() {
    counter.calls++;
    return { querySelector:()=>null, querySelectorAll:(s)=>s==='trkpt, rtept'?nodes:[] };
  } };
  return () => { if(prev===undefined) delete globalThis.DOMParser; else globalThis.DOMParser=prev; };
}
const jpeg = new Uint8Array([0xff,0xd8,0xff,0xe0,0x00,0x10]);
const png = new Uint8Array([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a,0x00]);
const webp = new Uint8Array([0x52,0x49,0x46,0x46,0,0,0,0,0x57,0x45,0x42,0x50,0]);
const unsupported = new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000"><script>alert(1)</script></svg>');
const html = new TextEncoder().encode('<img src=x onerror=alert(1)>');
const arr = (v)=>v.buffer.slice(v.byteOffset,v.byteOffset+v.byteLength);
const photo = photoProbes();
for (const [label,bytes,mime] of [['JPEG',jpeg,'image/jpeg'],['PNG',png,'image/png'],['WEBP',webp,'image/webp']]) {
  test(`corrupted photo metadata does not block genuine ${label} signature`, async()=> {
    const blob=await photo.displayBlobForEntry({imageBytes:arr(bytes),mimeType:'image/svg+xml'});
    assert.equal(blob?.type,mime);
  });
}
for (const [label,bytes,mime] of [['SVG with image/svg+xml',unsupported,'image/svg+xml'],['HTML with text/html',html,'text/html'],['HTML mislabeled JPEG',html,'image/jpeg'],['SVG mislabeled PNG',unsupported,'image/png']]) {
  test(`untrusted IndexedDB photo ${label} is not converted to a displayable blob`,async()=> {
    assert.equal(await photo.displayBlobForEntry({imageBytes:arr(bytes),mimeType:mime}),null);
  });
}
test('missing signature with fallback image/jpeg is not displayed',async()=> {
  assert.equal(await photo.displayBlobForEntry({imageBytes:arr(html)}),null);
});
test('oversize ArrayBuffer photo is rejected before reading',async()=> {
  assert.equal(await photo.displayBlobForEntry({imageBytes:new ArrayBuffer(1_000_001),mimeType:'image/jpeg'}),null);
});
test('oversize Blob photo is rejected before arrayBuffer',async()=> {
  const blob=new Blob([new Uint8Array(1_000_001)],{type:'image/jpeg'});
  blob.arrayBuffer=()=>{throw Error('READ_WAS_NOT_SUPPOSED_TO_HAPPEN');};
  assert.equal(await photo.displayBlobForEntry({blob}),null);
});
test('zero length stored image is ignored',async()=> {
  assert.equal(await photo.displayBlobForEntry({imageBytes:new ArrayBuffer(0)}),null);
});
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
test('photo note and identifier are HTML-escaped before history markup',()=> {
  assert.match(photoSource,/escapeHtml\(entry\.note\)/);
  assert.match(photoSource,/escapeHtml\(entry\.id\)/);
});
test('photo viewer displays note as textContent',()=> {
  assert.match(photoSource,/note\.textContent\s*=\s*String\(entry\.note/);
});
