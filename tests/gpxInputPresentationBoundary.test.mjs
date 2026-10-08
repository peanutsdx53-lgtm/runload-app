import test from 'node:test';
import assert from 'node:assert/strict';
import { bindGpxAnalysis } from '../ui/interactions/gpxAnalysisInteractions.js';
import { clearGpxCandidate, peekGpxCandidate } from '../ui/flowSessionState.js';

const makePoint=(lat,lon,ele)=>({
  getAttribute(k){return k==='lat'?lat:k==='lon'?lon:null;},
  querySelector(k){return k==='ele'&&ele!==undefined?{textContent:ele}:null;},
});
function fixture({points,name='',fileName='input.gpx',rejectText=false}={}) {
  const saved={document:globalThis.document,window:globalThis.window,DOMParser:globalThis.DOMParser};
  const elements=new Map();
  function element(id){
    if(!elements.has(id))elements.set(id,{id,hidden:false,disabled:false,value:'',textContent:'',innerHTML:'',files:[],listeners:new Map(),addEventListener(type,fn){this.listeners.set(type,fn);}});
    return elements.get(id);
  }
  const file=element('gpx-file');
  file.files=[{name:fileName,text:()=>rejectText?Promise.reject(new Error('read failed')):Promise.resolve('<gpx/>')}];
  element('gpx-return-to').value='#/record-input?source=local';
  globalThis.document={getElementById:element};
  globalThis.window={location:{hash:''}};
  globalThis.DOMParser=class {parseFromString(){return {
    querySelector(k){return k==='trk > name'?{textContent:name}:null;},
    querySelectorAll(k){return k==='trkpt, rtept'?points:[];},
  };}};
  clearGpxCandidate();
  bindGpxAnalysis();
  return {element,file,async change(){await file.listeners.get('change')();},apply(){element('gpx-apply').listeners.get('click')();},restore(){clearGpxCandidate();for(const [k,v] of Object.entries(saved)){if(v===undefined)delete globalThis[k];else globalThis[k]=v;}}};
}
const p0=[makePoint('35','139'),makePoint('35','139.001')];
const p1=[makePoint('35','139','0'),makePoint('35','139.001','0')];

await test('GPX UI: absent elevation leaves slope unknown and SVG with no line',async()=>{
  const f=fixture({points:p0});try{await f.change();assert.equal(f.element('gpx-candidate-state').textContent,'標高不足');assert.equal(f.element('gpx-flat-share').textContent,'—');assert.equal(f.element('gpx-gain-loss').textContent,'—');assert.match(f.element('gpx-profile-svg').innerHTML,/標高データが不足/);assert.equal(f.element('gpx-apply').disabled,false);}finally{f.restore();}
});
await test('GPX UI: explicit zero elevation remains known and renders zero gain/loss',async()=>{
  const f=fixture({points:p1});try{await f.change();assert.equal(f.element('gpx-candidate-state').textContent,'候補');assert.equal(f.element('gpx-flat-share').textContent,'100%');assert.equal(f.element('gpx-gain-loss').textContent,'0 / 0 m');assert.match(f.element('gpx-profile-svg').innerHTML,/<polyline/);}finally{f.restore();}
});
await test('GPX UI: untrusted GPX name is text, not HTML markup',async()=>{
  const attack='<img src=x onerror=alert(1)>';
  const f=fixture({points:p1,name:attack});try{await f.change();assert.equal(f.element('gpx-source-name').textContent,attack);assert.doesNotMatch(f.element('gpx-profile-svg').innerHTML,/<img|onerror|alert/);assert.equal(f.element('gpx-source-name').innerHTML,'');}finally{f.restore();}
});
await test('GPX UI: overlong GPX name is truncated before session storage',async()=>{
  const f=fixture({points:p1,name:'あ'.repeat(200)});try{await f.change();f.apply();assert.equal(peekGpxCandidate()?.candidate?.name.length,80);assert.match(globalThis.window.location.hash,/#\/course-editor\?gpx=1/);}finally{f.restore();}
});
await test('GPX UI: unknown grade is preserved in session candidate',async()=>{
  const f=fixture({points:p0});try{await f.change();f.apply();const candidate=peekGpxCandidate()?.candidate;assert.equal(candidate?.gradeKnowledge,'UNKNOWN');assert.equal(candidate?.flatPercent,null);assert.equal(candidate?.elevationGainM,null);assert.equal(candidate?.elevationCoverage,0);}finally{f.restore();}
});
await test('GPX UI: malformed coordinate is rejected without enabling apply',async()=>{
  const f=fixture({points:[makePoint(null,'139','10'),makePoint('35','139.001','10')]});try{await f.change();assert.equal(f.element('gpx-apply').disabled,true);assert.equal(f.element('gpx-result-area').hidden,true);assert.match(f.element('gpx-status').textContent,/解析できません/);}finally{f.restore();}
});
await test('GPX UI: file read failure leaves candidate unavailable',async()=>{
  const f=fixture({points:p1,rejectText:true});try{await f.change();assert.equal(f.element('gpx-apply').disabled,true);assert.equal(f.element('gpx-result-area').hidden,true);assert.equal(peekGpxCandidate(),null);}finally{f.restore();}
});
await test('GPX UI: fallback filename with HTML-like text remains text',async()=>{
  const name='" onmouseover="alert(1)';const f=fixture({points:p1,fileName:name+'.gpx'});try{await f.change();assert.equal(f.element('gpx-source-name').textContent,name);assert.equal(f.element('gpx-source-name').innerHTML,'');}finally{f.restore();}
});
