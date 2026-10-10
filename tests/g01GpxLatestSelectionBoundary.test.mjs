import test from 'node:test';
import assert from 'node:assert/strict';
import { bindGpxAnalysis } from '../ui/interactions/gpxAnalysisInteractions.js';
import { clearGpxCandidate, peekGpxCandidate } from '../ui/flowSessionState.js';

const deferred = () => { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; };
const points = [
  { getAttribute(key) { return key === 'lat' ? '35' : key === 'lon' ? '139' : null; }, querySelector(key) {return key === 'ele' ? {textContent:'10'} : null; } },
  { getAttribute(key) { return key === 'lat' ? '35' : key === 'lon' ? '139.001' : null; }, querySelector(key) {return key === 'ele' ? {textContent:'12'} : null; } },
];
function harness() {
  const originals = { document:globalThis.document, window:globalThis.window, DOMParser:globalThis.DOMParser, sessionStorage:globalThis.sessionStorage };
  const els = new Map();
  function get(id) {
    if (!els.has(id)) els.set(id, { id, files:[], value:'', textContent:'', innerHTML:'', hidden:false, disabled:false, listeners:new Map(),
      addEventListener(type, fn) { this.listeners.set(type, fn); },
      fire(type) { return this.listeners.get(type)?.(); },
    });
    return els.get(id);
  }
  const writes = new Map();
  globalThis.sessionStorage = { getItem(k) {return writes.get(k) ?? null;}, setItem(k, v) {writes.set(k,v);}, removeItem(k) {writes.delete(k);} };
  globalThis.document = { getElementById: get };
  globalThis.window = { location: { hash:'' } };
  globalThis.DOMParser = class { parseFromString(xml) { return {
    querySelector() {return null;},
    querySelectorAll(selector) {return selector === 'trkpt, rtept' ? points : []; },
  }; }};
  get('gpx-return-to').value = '#/record-input';
  clearGpxCandidate(); bindGpxAnalysis();
  const file = get('gpx-file'), apply = get('gpx-apply');
  const makeFile = (name, reader = deferred()) => ({name:`${name}.gpx`, size:10, reader, text(){ return reader.promise; }});
  return {get, file, apply, makeFile, select(item) { file.files = item ? [item] : []; return file.fire('change'); },
    reset(){return get('gpx-reset').fire('click');}, clickApply(){return apply.fire('click');},
    saved(){return peekGpxCandidate()?.candidate || null;},
    cleanup(){clearGpxCandidate();for(const [k,v] of Object.entries(originals))if(v===undefined)delete globalThis[k];else globalThis[k]=v;}
  };
}

// Every case has a real async file read; we assert against the current public
// binder rather than a copy of its private state.
test('G-01 GPX: a late old file cannot overwrite newer preview and course candidate', async()=>{
  const h=harness();try{
    const a=h.makeFile('A'), b=h.makeFile('B');
    const slow=h.select(a), fast=h.select(b);
    b.reader.resolve('<gpx/>');await fast;
    assert.equal(h.get('gpx-source-name').textContent,'B');
    a.reader.resolve('<gpx/>');await slow;
    assert.equal(h.get('gpx-source-name').textContent,'B');
    h.clickApply();assert.equal(h.saved()?.name,'B');
  }finally{h.cleanup();}
});
test('G-01 GPX: clearing a selection while reading cannot revive apply', async()=>{
  const h=harness();try{
    const a=h.makeFile('A'), p=h.select(a);
    await h.select(null);a.reader.resolve('<gpx/>');await p;
    assert.equal(h.apply.disabled,true);assert.equal(h.get('gpx-result-area').hidden,true);
    h.clickApply();assert.equal(h.saved(),null);
  }finally{h.cleanup();}
});
test('G-01 GPX: reset during a pending read prevents stale navigation', async()=>{
  const h=harness();try{
    const a=h.makeFile('A'), p=h.select(a);h.reset();
    a.reader.resolve('<gpx/>');await p;h.clickApply();
    assert.equal(h.apply.disabled,true);assert.equal(h.saved(),null);assert.equal(globalThis.window.location.hash,'');
  }finally{h.cleanup();}
});
test('G-01 GPX: replacement of same-named file object prevents unreviewed candidate apply', async()=>{
  const h=harness();try{
    const a=h.makeFile('same');const p=h.select(a);a.reader.resolve('<gpx/>');await p;
    h.file.files=[h.makeFile('same')];h.clickApply();
    assert.equal(h.saved(),null);assert.equal(globalThis.window.location.hash,'');
  }finally{h.cleanup();}
});
test('G-01 GPX: a late rejection must not hide newer successful inspection', async()=>{
  const h=harness();try{
    const a=h.makeFile('A'),b=h.makeFile('B');const p=h.select(a),q=h.select(b);
    b.reader.resolve('<gpx/>');await q;a.reader.reject(new Error('late error'));await p;
    assert.equal(h.get('gpx-source-name').textContent,'B');assert.equal(h.apply.disabled,false);
    h.clickApply();assert.equal(h.saved()?.name,'B');
  }finally{h.cleanup();}
});
test('G-01 GPX: new selection must disable apply immediately, not only after read', async()=>{
  const h=harness();try{
    const a=h.makeFile('A'),p=h.select(a);a.reader.resolve('<gpx/>');await p;
    const b=h.makeFile('B'),q=h.select(b);
    assert.equal(h.apply.disabled,true);
    h.clickApply();assert.equal(h.saved(),null);
    b.reader.resolve('<gpx/>');await q;
    h.clickApply();assert.equal(h.saved()?.name,'B');
  }finally{h.cleanup();}
});
