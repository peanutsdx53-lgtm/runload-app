import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const results=[];
async function test(id,fn){try{await fn();results.push({id,status:'PASS'});}catch(error){results.push({id,status:'FAIL',message:error?.stack||String(error)});}}
const source=async(path)=>readFile(new URL(`../${path}`,import.meta.url),'utf8');
function precache(sw){const block=sw.slice(sw.indexOf('const PRECACHE_URLS = ['),sw.indexOf('];',sw.indexOf('const PRECACHE_URLS = ['))+2);return [...block.matchAll(/"(\.\/[^\"]+)"/g)].map(m=>m[1]);}

await test('PWA-PRECACHE-INCLUDES-INTERPRETATION-RUNTIME',async()=>{
  const sw=await source('service-worker.js');
  const paths=precache(sw);
  for(const rel of ['./core/interpretationCore.js','./screens/interpretationRoomScreen.js','./styles/interpretation-room.css','./ui/interpretationRoomPresentation.js']) assert.ok(paths.includes(rel),rel);
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
    '2cf8624fb993ef7913635180030131ab030652aefc4330da1508b1de6eb97d15  screens/interpretationRoomScreen.js',
    '89a45320c3a8a1f580627c37549d62c15d5c68ee9cdfcbc912bc5c6d719c7033  styles/interpretation-room.css',
    '956d92781c64d0898a014a9bf57f568367dd228206e01698dcc81de891fdf49f  ui/interpretationRoomPresentation.js',
  ];
  for(const line of expected) assert.ok(manifest.includes(line),line);
});

await test('RUNTIME-HASH-MANIFEST-TRACKS-STAGE4-SERVICE-WORKER',async()=>{
  const manifest=await source('RUNTIME_SHA256SUMS.txt');
  assert.match(manifest,/604a1e3f9e03d0fc1566f51bd3457d67bd8a106e1978855356dd5ee000c44771  service-worker\.js/);
});

const failed=results.filter(x=>x.status==='FAIL');
console.log(JSON.stringify({suite:'Interpretation Room PWA Integration V1',total:results.length,passed:results.length-failed.length,failed:failed.length,status:failed.length?'FAIL':'PASS',results},null,2));
if(failed.length)process.exitCode=1;
