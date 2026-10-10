import test from 'node:test';
import assert from 'node:assert/strict';
import {bindRunMeasurement} from '../ui/interactions/mobileRunMeasurementInteractions.js';
function harness(geolocation) {
  const saved=Object.fromEntries(['document','window','navigator','sessionStorage','localStorage'].map(k=>[k,globalThis[k]]));
  const nodes=new Map();
  function el(key) {
    if(!nodes.has(key)) nodes.set(key,{textContent:'',hidden:false,disabled:false,value:'',dataset:{},
      classList:{toggle(){}},handlers:new Map(),addEventListener(n,fn){this.handlers.set(n,fn);},
      removeEventListener(n){this.handlers.delete(n);},async fire(n){return this.handlers.get(n)?.();},
      querySelector:el,querySelectorAll:()=>[]});
    return nodes.get(key);
  }
  const root=el('root');root.dataset={};
  let timers=0;
  globalThis.window={isSecureContext:true,scrollTo(){},setInterval(){timers++;return 3;},clearInterval(){},setTimeout(){return 2;}};
  globalThis.document={querySelector:()=>root,addEventListener(){},removeEventListener(){},visibilityState:'visible'};
  Object.defineProperty(globalThis,'navigator',{configurable:true,writable:true,value:{geolocation}});
  const values=new Map();
  globalThis.sessionStorage={getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,v),removeItem:k=>values.delete(k)};
  globalThis.localStorage={getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,v),removeItem:k=>values.delete(k)};
  const services={storage:{settings:{load:()=>({})},profile:{load:()=>({weightKg:70})}}};
  const dispose=bindRunMeasurement({router:{navigateToScreen(){}},services});
  return {el,root,timers:()=>timers,cleanup(){dispose?.();for(const [k,v] of Object.entries(saved))
    if(v===undefined) delete globalThis[k];else Object.defineProperty(globalThis,k,{configurable:true,writable:true,value:v});}};
}
test('E-07: synchronously thrown GPS watchPosition error follows existing error state',async()=>{
  const h=harness({watchPosition(){throw Object.assign(new Error('Permission denied'),{name:'SecurityError',code:1});},clearWatch(){}});
  try {
    await assert.doesNotReject(h.el('[data-action="start-measurement"]').fire('click'));
    assert.match(h.el('[data-measurement-status]').textContent,/位置情報が許可されていません/);
    assert.equal(h.root.dataset.gpsQuality,'error');
    assert.equal(h.timers(),1);
  }finally{h.cleanup();}
});
test('E-07: asynchronous GPS permission callback still works',async()=>{
  let rejectCallback;
  const h=harness({watchPosition(_ok,err){rejectCallback=err;return 17;},clearWatch(){}});
  try {
    await assert.doesNotReject(h.el('[data-action="start-measurement"]').fire('click'));
    rejectCallback({code:1});
    assert.match(h.el('[data-measurement-status]').textContent,/位置情報が許可されていません/);
    assert.equal(h.root.dataset.gpsQuality,'error');
  }finally{h.cleanup();}
});
test('E-07: absent GPS prevents timer startup',async()=>{
  const h=harness(null);
  try {
    await assert.doesNotReject(h.el('[data-action="start-measurement"]').fire('click'));
    assert.match(h.el('[data-measurement-prep-status]').textContent,/GPS測定を開始できません/);
    assert.equal(h.timers(),0);
  }finally{h.cleanup();}
});
