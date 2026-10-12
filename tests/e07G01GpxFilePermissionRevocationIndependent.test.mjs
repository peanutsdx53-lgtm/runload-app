import test from 'node:test';
import assert from 'node:assert/strict';
import { bindGpxAnalysis } from '../ui/interactions/gpxAnalysisInteractions.js';
import { clearGpxCandidate, peekGpxCandidate } from '../ui/flowSessionState.js';
const denied=()=>{throw Object.assign(new Error('revoked file access'),{name:'SecurityError'})};
function deferred(){let resolve;const promise=new Promise(done=>resolve=done);return {promise,resolve}}
function setup({filesDenied=false,sizeDenied=false,delayed=false}={}){
  const old={document:globalThis.document,window:globalThis.window,DOMParser:globalThis.DOMParser},nodes=new Map();
  function el(id){if(!nodes.has(id))nodes.set(id,{value:'',textContent:'',innerHTML:'',disabled:false,hidden:false,handlers:new Map(),addEventListener(n,fn){this.handlers.set(n,fn)}});return nodes.get(id)}
  const input=el('gpx-file'),wait=deferred(),f={name:'sample.gpx',text:()=>delayed?wait.promise:Promise.resolve('<gpx/>')};
  if(sizeDenied)Object.defineProperty(f,'size',{get:denied});else f.size=100;
  if(filesDenied)Object.defineProperty(input,'files',{configurable:true,get:denied});else input.files=[f];
  const parent={},points=['35','35.001'].map(lat=>({parentElement:parent,getAttribute(n){return n==='lat'?lat:'139'},querySelector(){return {textContent:'0'}}}));
  let parsed=0;
  globalThis.DOMParser=class{parseFromString(){parsed++;return {querySelector(){return null},querySelectorAll(n){return n==='trkpt, rtept'?points:[]}}}};
  globalThis.document={getElementById:el};globalThis.window={location:{hash:''}};clearGpxCandidate();bindGpxAnalysis();
  return {input,f,wait,el,parsed:()=>parsed,change:()=>input.handlers.get('change')(),apply:()=>el('gpx-apply').handlers.get('click')(),cleanup(){clearGpxCandidate();for(const [k,v]of Object.entries(old))if(v===undefined)delete globalThis[k];else globalThis[k]=v}};
}
test('E07 denied native FileList getter does not reject GPX selection',async()=>{
 const h=setup({filesDenied:true});try{await assert.doesNotReject(h.change());assert.equal(h.el('gpx-apply').disabled,true);assert.equal(peekGpxCandidate(),null)}finally{h.cleanup()}
});
test('E07 denied File.size getter does not parse or enable stale GPX',async()=>{
 const h=setup({sizeDenied:true});try{await assert.doesNotReject(h.change());assert.equal(h.el('gpx-apply').disabled,true);assert.equal(h.parsed(),0);assert.equal(peekGpxCandidate(),null)}finally{h.cleanup()}
});
test('E07 denied FileList getter after awaited File.text cannot accept stale GPX',async()=>{
 const h=setup({delayed:true});try{const promise=h.change();Object.defineProperty(h.input,'files',{configurable:true,get:denied});h.wait.resolve('<gpx/>');await assert.doesNotReject(promise);assert.equal(h.el('gpx-apply').disabled,true);assert.equal(h.parsed(),0)}finally{h.cleanup()}
});
test('G01 denied FileList getter at approval cannot commit previously parsed GPX',async()=>{
 const h=setup();try{await h.change();assert.equal(h.el('gpx-apply').disabled,false);Object.defineProperty(h.input,'files',{configurable:true,get:denied});assert.doesNotThrow(h.apply);assert.equal(peekGpxCandidate(),null)}finally{h.cleanup()}
});
test('G01 valid GPX File still allows true zero elevation candidate',async()=>{
 const h=setup();try{await h.change();assert.equal(h.el('gpx-apply').disabled,false);h.apply();assert.equal(peekGpxCandidate()?.candidate?.gradeKnowledge,'KNOWN_PROFILE')}finally{h.cleanup()}
});

test('G01 GPX above 10MB remains rejected before text read or parse',async()=>{
 const h=setup();try{
   h.f.size=10_000_001;
   let reads=0;h.f.text=()=>{reads++;return Promise.resolve('<gpx/>')};
   await h.change();
   assert.equal(h.el('gpx-apply').disabled,true);assert.equal(h.parsed(),0);
   assert.equal(reads,0);assert.match(h.el('gpx-status').textContent,/10MB以下/);
 }finally{h.cleanup()}
});
