import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const results=[];
async function test(id,fn){try{await fn();results.push({id,status:'PASS'});}catch(error){results.push({id,status:'FAIL',message:error?.stack||String(error)});}}
const source=async(path)=>readFile(new URL(`../${path}`,import.meta.url),'utf8');
function precache(sw){const block=sw.slice(sw.indexOf('const PRECACHE_URLS = ['),sw.indexOf('];',sw.indexOf('const PRECACHE_URLS = ['))+2);return [...block.matchAll(/"(\.\/[^\"]+)"/g)].map(m=>m[1]);}

await test('PWA-PRECACHE-INCLUDES-INTERPRETATION-RUNTIME',async()=>{
  const sw=await source('service-worker.js');
  const paths=precache(sw);
  for(const rel of ['./core/interpretationCore.js','./screens/interpretationRoomScreen.js','./styles/interpretation-room.css','./ui/interpretationRoomPresentation.js','./ui/prototypeBodyRegionVisuals.js']) assert.ok(paths.includes(rel),rel);
});

await test('PWA-PRECACHE-EXCLUDES-RETIRED-ACTIVATION-SCREEN',async()=>{
  const sw=await source('service-worker.js');
  assert.ok(!precache(sw).includes('./screens/activationScreen.js'));
});

await test('PWA-STABLE-CACHE-NAME-RETAINED',async()=>{
  const sw=await source('service-worker.js');
  assert.match(sw,/const CACHE_NAME = "runload-app-current"/);
});

await test('PWA-ACTIVATE-PRUNES-STALE-SAME-CACHE-RESOURCES',async()=>{
  const sw=await source('service-worker.js');
  assert.match(sw,/caches\.open\(CACHE_NAME\)/);
  assert.match(sw,/cache\.keys\(\)/);
  assert.match(sw,/!PRECACHE_PATHS\.has\(new URL\(request\.url\)\.pathname\)/);
  assert.match(sw,/cache\.delete\(request\)/);
});

await test('PWA-INTERPRETATION-STYLESHEET-IS-SAME-ORIGIN-EXTERNAL',async()=>{
  const html=await source('index.html');
  assert.match(html,/<link rel="stylesheet" href="\.\/styles\/interpretation-room\.css">/);
  assert.doesNotMatch(html,/<script(?![^>]*\bsrc=)[^>]*>\s*[^<]/i);
  assert.match(html,/script-src 'self'/);
  assert.match(html,/style-src 'self'/);
});

await test('RUNTIME-HASH-MANIFEST-CONTAINS-INTERPRETATION-RUNTIME',async()=>{
  const manifest=await source('RUNTIME_SHA256SUMS.txt');
  const expected=[
    '20fc3b838f4251d08c765c46fa07d29b905e38e2b38474cea85bcf0dd77845a8  core/interpretationCore.js',
    '56eb4ff3d5e4c826d45bd283f6b7378ba2e50632e380b9d37bc238ddcc73cd34  screens/interpretationRoomScreen.js',
    '5a6358fb9b1556c8e5787f6755ac27a1be231a8082243394017bf0c58b67b5f7  styles/interpretation-room.css',
    '40f1bd61d27b96efdfcdceda5233e4a7b7b68511b60ac5d7ef4f1eed4911a265  ui/interpretationRoomPresentation.js',
    '044d9a07dfda7cf01c6b98088892d2ef2f8a057595bf43fc3a9d68d637c039d4  ui/prototypeBodyRegionVisuals.js',
  ];
  for(const line of expected) assert.ok(manifest.includes(line),line);
});

await test('RUNTIME-HASH-MANIFEST-TRACKS-CURRENT-SERVICE-WORKER',async()=>{
  const manifest=await source('RUNTIME_SHA256SUMS.txt');
  assert.match(manifest,/1b8bea4d03298290352915fa2721642980ecb3148dee61c79501456d2aab87de  service-worker\.js/);
});

const failed=results.filter(x=>x.status==='FAIL');
console.log(JSON.stringify({suite:'Interpretation Room PWA Integration V1',total:results.length,passed:results.length-failed.length,failed:failed.length,status:failed.length?'FAIL':'PASS',results},null,2));
if(failed.length)process.exitCode=1;
