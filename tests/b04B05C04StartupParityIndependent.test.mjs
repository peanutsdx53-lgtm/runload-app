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

test('B-05: platform CSS begins together and preserves canonical cascade order',async()=>{
  const {loadPlatformStyles}=await import('../ui/platformStyles.js');
  const source=await read('ui/platformStyles.js');
  const index=await read('index.html');
  const originalDocument=globalThis.document;
  const initial=[...index.matchAll(/<link rel="stylesheet" href="([^"]+)"/g)].map(m=>m[1]);
  assert(initial.length>=20);
  function setup(){
    const nodes=initial.map(href=>({rel:'stylesheet',href:new URL(href,'https://runload.test/').href}));
    const waiting=[];
    const document={
      baseURI:'https://runload.test/',
      querySelectorAll:()=>nodes.filter(node=>node.rel==='stylesheet'&&node.href),
      createElement:()=>{
        const handlers={};
        const link={rel:'',dataset:{},addEventListener:(name,fn)=>{handlers[name]=fn;},finish:()=>handlers.load?.()};
        Object.defineProperty(link,'href',{get(){return this._href;},set(value){this._href=new URL(value,document.baseURI).href;}});
        return link;
      },
      head:{
        insertBefore:(node,anchor)=>{
          const i=nodes.indexOf(anchor);
          assert(i>=0,'Missing stylesheet cascade anchor');
          nodes.splice(i,0,node);waiting.push(node);
        },
        appendChild:(node)=>{nodes.push(node);waiting.push(node);},
      },
    };
    return {document,nodes,waiting};
  }
  try{
    for (const platform of ['mobile','desktop']){
      const fixture=setup();
      globalThis.document=fixture.document;
      const promise=loadPlatformStyles(platform);
      // All assets must be requested before any load event is delivered.
      // Sequential group waiting would only add the first group's assets.
      const matches=source.match(new RegExp('const '+(platform==='mobile'?'MOBILE':'DESKTOP')+'_STYLE_GROUPS[\\s\\S]*?(?=const DESKTOP_STYLE_GROUPS|function findStylesheetByHref)'))?.[0]||'';
      const references=(matches.match(/"\\.\\/styles\\/[^"]+\\.css"/g)||[]).length;
      const anchors=(matches.match(/before:\\s*"\\.\\/styles\\/[^"]+\\.css"/g)||[]).length;
      const total=references-anchors;
      assert(total>20 && fixture.waiting.length===total,
        JSON.stringify({platform,expected:total,actual:fixture.waiting.length}));
      const beforeLoad=fixture.nodes.map(node=>node.href);
      for(const link of [...fixture.waiting].reverse())link.finish();
      await promise;
      assert.deepEqual(fixture.nodes.map(node=>node.href),beforeLoad,
        platform+' CSS ordering changed when responses finished in reverse');
      const duplicate=loadPlatformStyles(platform);
      await duplicate;
      assert.deepEqual(fixture.nodes.map(node=>node.href),beforeLoad,
        platform+' reloading existing CSS created duplicate style nodes');
    }
  }finally{
    if(originalDocument===undefined)delete globalThis.document;
    else globalThis.document=originalDocument;
  }
});
