import test from 'node:test';
import assert from 'node:assert/strict';
import {bindRunMeasurement} from '../ui/interactions/mobileRunMeasurementInteractions.js';
function harness(geolocationFactory) {
  const names=['document','window','navigator','sessionStorage','localStorage'];
  const old=names.map(name=>({name,descriptor:Object.getOwnPropertyDescriptor(globalThis,name)}));
  const nodes=new Map();
  const el=(key)=>{
    if(!nodes.has(key))nodes.set(key,{textContent:'',hidden:false,disabled:false,value:'',dataset:{},classList:{toggle(){}},handlers:new Map(),addEventListener(name,handler){this.handlers.set(name,handler)},removeEventListener(name){this.handlers.delete(name)},async fire(name){return this.handlers.get(name)?.()},querySelector:el,querySelectorAll:()=>[]});
    return nodes.get(key);
  };
  const root=el('root');root.dataset={};let timers=0;
  const win={isSecureContext:true,scrollTo(){},setInterval(){timers++;return timers},clearInterval(){},setTimeout(){return 2;}};
  const doc={querySelector:()=>root,addEventListener(){},removeEventListener(){},visibilityState:'visible'};
  Object.defineProperty(globalThis,'window',{configurable:true,value:win,writable:true});
  Object.defineProperty(globalThis,'document',{configurable:true,value:doc,writable:true});
  const nav={};Object.defineProperty(nav,'geolocation',{get:geolocationFactory});
  Object.defineProperty(globalThis,'navigator',{configurable:true,value:nav,writable:true});
  const values=new Map();const storage={getItem:key=>values.get(key)??null,setItem:(key,val)=>values.set(key,val),removeItem:key=>values.delete(key)};
  for(const name of ['sessionStorage','localStorage'])Object.defineProperty(globalThis,name,{configurable:true,value:storage,writable:true});
  const services={storage:{settings:{load:()=>({})},profile:{load:()=>({weightKg:70})}}};
  const dispose=bindRunMeasurement({router:{navigateToScreen(){}},services});
  return {el,root,timers:()=>timers,async cleanup(){try{dispose?.()}finally{for(const {name,descriptor} of old){if(!descriptor)delete globalThis[name];else Object.defineProperty(globalThis,name,descriptor)}}}};
}
test('E-07: throwing browser GPS property getter is a controlled start refusal',async()=>{
  const h=harness(()=>{throw Object.assign(Error('blocked'),{name:'SecurityError'});});
  try{await assert.doesNotReject(h.el('[data-action="start-measurement"]').fire('click'));
    assert.equal(h.timers(),0);
    assert.match(h.el('[data-measurement-prep-status]').textContent,/GPS|位置情報/);
  }finally{await h.cleanup();}
});
test('E-07: GPS getter fails during watch setup without an unhandled promise rejection',async()=>{
  let calls=0;
  const h=harness(()=>{calls++;if(calls===1)return {watchPosition(){return 9},clearWatch(){}};throw Object.assign(Error('denied'),{code:1,name:'SecurityError'});});
  try{await assert.doesNotReject(h.el('[data-action="start-measurement"]').fire('click'));
    assert.equal(h.timers(),1);
    assert.match(h.el('[data-measurement-status]').textContent,/位置情報|取得/);
  }finally{await h.cleanup();}
});
test('E-07: clearWatch throwing during pause cannot leave measurement without control',async()=>{
  const geo={watchPosition(){return 9},clearWatch(){throw Error('revoked permission')}};
  const h=harness(()=>geo);
  try{await h.el('[data-action="start-measurement"]').fire('click');
    await assert.doesNotReject(h.el('[data-action="pause-measurement"]').fire('click'));
    assert.match(h.el('[data-measurement-status]').textContent,/一時停止/);
  }finally{await h.cleanup();}
});

test('E-07 asynchronous GPS callback tolerates a revoked error.code getter',async()=>{
  let errorCallback;
  const h=harness(()=>({watchPosition(_ok,error){errorCallback=error;return 21;},clearWatch(){}}));
  try {
    await h.el('[data-action="start-measurement"]').fire('click');
    const revoked={};
    Object.defineProperty(revoked,'code',{get(){throw new DOMException('revoked','SecurityError');}});
    assert.doesNotThrow(()=>errorCallback(revoked));
    assert.equal(h.root.dataset.gpsQuality,'error');
    assert.match(h.el('[data-measurement-status]').textContent,/現在地を取得できませんでした/);
  }finally{await h.cleanup();}
});
test('E-07 ordinary GPS permission denied callback retains prior behavior',async()=>{
  let errorCallback;
  const h=harness(()=>({watchPosition(_ok,error){errorCallback=error;return 22;},clearWatch(){}}));
  try {
    await h.el('[data-action="start-measurement"]').fire('click');
    assert.doesNotThrow(()=>errorCallback({code:1}));
    assert.equal(h.root.dataset.gpsQuality,'error');
    assert.match(h.el('[data-measurement-status]').textContent,/位置情報が許可されていません/);
  }finally{await h.cleanup();}
});
