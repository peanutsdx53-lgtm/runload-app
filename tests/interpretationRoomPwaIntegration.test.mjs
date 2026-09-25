import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';

const results=[];
async function test(id,fn){try{await fn();results.push({id,status:'PASS'});}catch(error){results.push({id,status:'FAIL',message:error?.stack||String(error)});}}
const source=async(path)=>readFile(new URL(`../${path}`,import.meta.url),'utf8');
function precache(sw){const block=sw.slice(sw.indexOf('const PRECACHE_URLS = ['),sw.indexOf('];',sw.indexOf('const PRECACHE_URLS = ['))+2);return [...block.matchAll(/"(\.\/[^\"]+)"/g)].map(m=>m[1]);}

await test('PWA-PRECACHE-INCLUDES-INTERPRETATION-RUNTIME',async()=>{
  const sw=await source('service-worker.js');
  const paths=precache(sw);
  for(const rel of ['./core/interpretationCore.js','./screens/interpretationRoomScreen.js','./styles/interpretation-room.css','./ui/interpretationRoomPresentation.js','./ui/bodyRegionVisuals.js']) assert.ok(paths.includes(rel),rel);
});

await test('PWA-PRECACHE-EXCLUDES-RETIRED-ACTIVATION-SCREEN',async()=>{
  const sw=await source('service-worker.js');
  assert.ok(!precache(sw).includes('./screens/activationScreen.js'));
});

await test('PWA-STABLE-CACHE-NAME-RETAINED',async()=>{
  const sw=await source('service-worker.js');
  assert.match(sw,/const CACHE_NAME = "running-record-app-runtime-v1";/);
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
  assert.doesNotMatch(html,/interpretation-room-v3\.css/);
  assert.doesNotMatch(html,/<script(?![^>]*\bsrc=)[^>]*>\s*[^<]/i);
  assert.match(html,/script-src 'self'/);
  assert.match(html,/style-src 'self'/);
});

await test('PWA-PRECACHE-PATHS-ALL-EXIST',async()=>{
  const sw=await source('service-worker.js');
  for(const rel of precache(sw)){
    const path=rel.replace(/^\.\//,'');
    await access(new URL(`../${path}`,import.meta.url));
  }
});

await test('PWA-PRECACHE-EXCLUDES-UNUSED-EXPLANATION-MODULE',async()=>{
  const sw=await source('service-worker.js');
  assert.ok(!precache(sw).includes('./ui/hierarchicalExplanation.js'));
});

const failed=results.filter(x=>x.status==='FAIL');
console.log(JSON.stringify({suite:'Interpretation Room PWA Integration',total:results.length,passed:results.length-failed.length,failed:failed.length,status:failed.length?'FAIL':'PASS',results},null,2));
if(failed.length)process.exitCode=1;
