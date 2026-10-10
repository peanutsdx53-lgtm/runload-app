import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
function files(dir=ROOT){const result=[];for(const e of fs.readdirSync(dir,{withFileTypes:true})){
 if(e.name.startsWith('.')||['tests','docs','node_modules','dist'].includes(e.name))continue;
 const full=path.join(dir,e.name);
 if(e.isDirectory())result.push(...files(full));
 else if(/\.(?:js|mjs|html|css|webmanifest)$/.test(e.name))result.push(full);
}return result;}
function hits(rx){const found=[];for(const file of files()){
 const value=fs.readFileSync(file,'utf8');const rel=path.relative(ROOT,file).replaceAll('\\','/');
 for(const match of value.matchAll(new RegExp(rx.source,rx.flags.includes('g')?rx.flags:rx.flags+'g'))){
   const line=value.slice(0,match.index).split('\n').length;
   found.push({file:rel,line,text:match[0]});
 }
}return found;}
const sort=x=>x.map(z=>z.file+':'+z.line+':'+z.text).sort();
test('network-producing APIs cannot be added silently to first-party runtime',()=>{
 const forbidden=hits(/\b(?:XMLHttpRequest|sendBeacon|EventSource|RTCPeerConnection|WebTransport|RTCSctpTransport|RTCPeerConnection|new\s+Image\s*\(|importScripts\s*\(|navigator\.share\s*\(|window\.open\s*\(|document\.write\s*\()/g);
 // Avoid treating arbitrary comments and documentation as executable endpoints.
 const actual=forbidden.filter(x=>!x.text.startsWith('document.write'));
 assert.deepEqual(actual,[],JSON.stringify(actual));
 const fetch=hits(/\bfetch\s*\(/g);assert.deepEqual(fetch.map(x=>x.file),['service-worker.js','service-worker.js']);
 const sw=fs.readFileSync(path.join(ROOT,'service-worker.js'),'utf8');
 assert.match(sw,/url\.origin\s*!==\s*self\.location\.origin/);
 assert.match(sw,/request\.method\s*!==\s*['"]GET['"]/);
 const imageAssignment=hits(/\bimage\.src\s*=\s*/g);
 assert.deepEqual(imageAssignment.map(x=>x.file).sort(),['ui/rofJPresentation.js','ui/runMeasurementMap.js']);
 assert.match(fs.readFileSync(path.join(ROOT,'ui/runMeasurementMap.js'),'utf8'),/https:\/\/tile\.openstreetmap\.org\/\$\{zoom\}/);
});
test('no externally hosted executable modules, CSS imports, fonts or forms',()=>{
 const remote=hits(/(?:@import\s+(?:url\()?\s*["']?https?:|<script[^>]+src\s*=\s*["']https?:|<link[^>]+href\s*=\s*["']https?:|\bimport\s*\(\s*["']https?:|\bfrom\s*["']https?:|url\(\s*["']?https?:|<form[^>]+action\s*=\s*["']https?:)/gi);
 assert.deepEqual(remote,[],JSON.stringify(remote));
 const map=fs.readFileSync(path.join(ROOT,'ui/runMeasurementMap.js'),'utf8');
 assert.match(map,/if\s*\(!externalTilesEnabled\s*\|\|\s*globalThis\.navigator\?\.onLine\s*===\s*false/);
 assert.match(map,/createElement\("div",\s*"run-map__tile-consent"\)/);
 const html=fs.readFileSync(path.join(ROOT,'index.html'),'utf8');
 assert.match(html,/connect-src 'self' ws:\/\/127\.0\.0\.1:\* ws:\/\/localhost:\*/);
 assert.match(html,/img-src 'self' data: https:\/\/tile\.openstreetmap\.org/);
});
