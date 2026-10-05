import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';
import path from 'node:path';

const results=[];
async function test(id,fn){try{await fn();results.push({id,status:'PASS'});}catch(error){results.push({id,status:'FAIL',message:error?.stack||String(error)});}}
const source=async(path)=>readFile(new URL(`../${path}`,import.meta.url),'utf8');
function assetList(sw,name){
  const start=sw.indexOf(`const ${name} = [`);
  if(start<0) return [];
  const block=sw.slice(start,sw.indexOf('];',start)+2);
  return [...block.matchAll(/"(\.\/[^"]+)"/g)].map(m=>m[1]);
}
function commonPrecache(sw){return assetList(sw,'COMMON_PRECACHE_URLS');}
function runtimeAssets(sw){return [
  ...assetList(sw,'COMMON_PRECACHE_URLS'),
  ...assetList(sw,'MOBILE_PLATFORM_URLS'),
  ...assetList(sw,'DESKTOP_PLATFORM_URLS'),
];}

await test('PWA-PRECACHE-INCLUDES-INTERPRETATION-RUNTIME',async()=>{
  const sw=await source('service-worker.js');
  const paths=commonPrecache(sw);
  for(const rel of ['./core/interpretationCore.js','./screens/interpretationRoomScreen.js','./styles/interpretation-room.css','./ui/interpretationRoomPresentation.js','./ui/interpretationReferenceKnowledge.js','./ui/bodyRegionVisuals.js']) assert.ok(paths.includes(rel),rel);
});

await test('PWA-PRECACHE-EXCLUDES-RETIRED-ACTIVATION-SCREEN',async()=>{
  const sw=await source('service-worker.js');
  assert.ok(!runtimeAssets(sw).includes('./screens/activationScreen.js'));
});

await test('PWA-CACHE-NAME-MATCHES-VISIBLE-APP-VERSION',async()=>{
  const sw=await source('service-worker.js');
  const versionModule=await source('ui/appVersionStatus.js');
  const version=versionModule.match(/APP_VERSION = "([^"]+)"/)?.[1]||'';
  assert.match(version,/^\d{4}\.\d{2}\.\d{2}\.\d+$/);
  assert.ok(sw.includes(`const CACHE_NAME = "running-record-app-runtime-${version}";`));
});

await test('PWA-ACTIVATE-PRUNES-OLD-VERSION-CACHES',async()=>{
  const sw=await source('service-worker.js');
  assert.match(sw,/caches\.keys\(\)/);
  assert.match(sw,/key\.startsWith\(CACHE_PREFIX\) && key !== CACHE_NAME/);
  assert.match(sw,/caches\.delete\(key\)/);
  assert.doesNotMatch(sw,/cache\.keys\(\).*PRECACHE_PATHS/s);
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
  for(const rel of runtimeAssets(sw)){
    const file=rel.replace(/^\.\//,'');
    await access(new URL(`../${file}`,import.meta.url));
  }
});

await test('PWA-PRECACHE-EXCLUDES-UNUSED-EXPLANATION-MODULE',async()=>{
  const sw=await source('service-worker.js');
  assert.ok(!runtimeAssets(sw).includes('./ui/hierarchicalExplanation.js'));
});

await test('PWA-HAS-ONE-CANONICAL-REGISTRATION-PATH',async()=>{
  const html=await source('index.html');
  const app=await source('app.js');
  const platform=await source('core/internal/platformInfrastructure.js');
  assert.ok(!html.includes('pwaUpdateBootstrap.js'));
  assert.ok(app.includes('registerPwaServiceWorker({ platform: mobileLayout ? "mobile" : "desktop" });'));
  assert.ok(platform.includes('function registerPwaServiceWorker({ platform = "" } = {})'));
});

await test('PWA-PRECACHE-COVERS-RUNTIME-MODULE-GRAPH',async()=>{
  const sw=await source('service-worker.js');
  const cached=new Set(runtimeAssets(sw).map((item)=>item.replace(/^\.\//,'')));
  const visited=new Set();
  const importPatterns=[
    /\bfrom\s+["']([^"']+)["']/g,
    /\bimport\s*["']([^"']+)["']/g,
    /\bimport\s*\(\s*["']([^"']+)["']\s*\)/g,
  ];
  async function visit(file){
    if(visited.has(file)) return;
    visited.add(file);
    const text=await source(file);
    const specs=new Set();
    for(const pattern of importPatterns){
      for(const match of text.matchAll(pattern)) specs.add(match[1]);
    }
    for(const spec of specs){
      if(!spec.startsWith('.')) continue;
      let resolved=path.posix.normalize(path.posix.join(path.posix.dirname(file),spec));
      if(!path.posix.extname(resolved)) resolved+='.js';
      await visit(resolved);
    }
  }
  await visit('app.js');
  for(const file of visited){
    assert.ok(cached.has(file),`runtime module missing from precache: ${file}`);
  }
});

const failed=results.filter(x=>x.status==='FAIL');
console.log(JSON.stringify({suite:'Interpretation Room PWA Integration',total:results.length,passed:results.length-failed.length,failed:failed.length,status:failed.length?'FAIL':'PASS',results},null,2));
if(failed.length)process.exitCode=1;
