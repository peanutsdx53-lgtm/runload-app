import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const mime={'.html':'text/html','.css':'text/css','.js':'text/javascript','.mjs':'text/javascript','.webmanifest':'application/manifest+json','.json':'application/json','.png':'image/png','.svg':'image/svg+xml'};
const read=name=>fs.readFile(path.join(ROOT,name),'utf8');
function swPaths(code){const lists=['COMMON_PRECACHE_URLS','MOBILE_PLATFORM_URLS','DESKTOP_PLATFORM_URLS'];return Object.fromEntries(lists.map(name=>{const start=code.indexOf('const '+name+' = [');assert(start>=0,name);const stop=code.indexOf('];',start);assert(stop>start,name);return[name,[...code.slice(start,stop).matchAll(/"(\.\/[^"\n]+)"/g)].map(x=>x[1])]}));}
async function start(prefix=''){
 const server=http.createServer(async(req,res)=>{
  try{const url=new URL(req.url,'http://127.0.0.1');let p=decodeURIComponent(url.pathname);if(prefix){if(!p.startsWith(prefix+'/')&&p!==prefix){res.writeHead(404).end();return;}p=p.slice(prefix.length)}
   if(p==='/'||!p)p='/index.html';const f=path.resolve(ROOT,'.'+p);
   if(!f.startsWith(ROOT+path.sep)){res.writeHead(403).end();return;}
   const data=await fs.readFile(f);res.writeHead(200,{'Content-Type':mime[path.extname(f)]||'application/octet-stream','Cache-Control':'no-store'}).end(data);
  }catch{res.writeHead(404).end('Not Found')}
 });await new Promise(ok=>server.listen(0,'127.0.0.1',ok));return{server,base:`http://127.0.0.1:${server.address().port}${prefix}/`};
}
test('B-04/C-04: root and nested-path HTTP runtime assets resolve with correct MIME, without build',async()=>{
 const [sw,index,manifest]=await Promise.all([read('service-worker.js'),read('index.html'),read('manifest.webmanifest')]);
 const groups=swPaths(sw);const assets=new Set(['./index.html','./manifest.webmanifest','./service-worker.js',...Object.values(groups).flat()]);
 for(const m of index.matchAll(/(?:src|href)="(\.\/[^"?#]+)"/g))assets.add(m[1]);
 for(const icon of JSON.parse(manifest).icons||[])assets.add(icon.src);
 assert(assets.size>=300,'Unexpected lost runtime asset coverage');
 const count={};for(const prefix of ['', '/runload-app']){
  const {server,base}=await start(prefix);let served=0;
  try{for(const asset of assets){const res=await fetch(new URL(asset,base),{cache:'no-store'});assert.equal(res.status,200,`Missing ${asset} at ${base}`);const body=await res.arrayBuffer();assert(body.byteLength>0,`Empty ${asset}`);
    const ext=path.extname(asset);if(ext in mime) assert(res.headers.get('content-type')?.startsWith(mime[ext]),`Wrong MIME ${asset}`);
    served++;
   }
  }finally{await new Promise(ok=>server.close(ok))}count[prefix||'/']=served;
 }
 assert.equal(count['/'],count['/runload-app']);
});
test('B-04/B-05: platform-boot order and local Live Server SW opt-out are explicit',async()=>{
 const [boot,infra,css,sw,readme]=await Promise.all([read('ui/platformBootstrap.js'),read('core/internal/platformInfrastructure.js'),read('ui/platformStyles.js'),read('service-worker.js'),read('README.md')]);
 assert(boot.indexOf('await loadPlatformStyles(platform)')>=0);
 assert(boot.indexOf('await loadPlatformStyles(platform)')<boot.indexOf('await import("../app.js")'));
 assert.match(boot,/if \(platform === "mobile"\) await import\("\.\/mobileRuntimeEntry\.js"\)/);
 assert.match(boot,/else await import\("\.\/desktopRuntimeEntry\.js"\)/);
 assert.match(css,/MOBILE_STYLE_GROUPS/);assert.match(css,/DESKTOP_STYLE_GROUPS/);
 assert.match(infra,/LOCAL_DEVELOPMENT_HOSTS = new Set\(\["127\.0\.0\.1", "localhost", "\[::1\]"\]\)/);
 assert.match(infra,/if \(isLocalLiveServerDevelopment\(\)\)/);
 assert.match(infra,/clearLocalPwaDeliveryState\(\)/);
 assert.match(sw,/event\.data\?\.type !== "CACHE_PLATFORM"/);
 assert.match(sw,/previousVersionMatch\(request\)/);
 assert.match(readme,/VS Code \+ Live Server/);
});
test('B-05: offline resource inventory has no duplicate paths or silent missing assets',async()=>{
 const groups=swPaths(await read('service-worker.js'));
 for(const [name,items] of Object.entries(groups)){
  assert(items.length>0,name);assert.equal(new Set(items).size,items.length,`${name} contains duplicate resource`);
  for(const item of items){assert(item.startsWith('./')&&!item.includes('..')&&!item.includes('?'),`Malformed precache URL ${item}`);
    const f=path.resolve(ROOT,item);assert(f.startsWith(ROOT+path.sep));assert((await fs.stat(f)).size>0,`Missing/empty ${item}`);
  }
 }
 // Shared and per-platform entries may overlap by design; verify duplicates separately.
 assert(Object.values(groups).flat().length>=300);
});
