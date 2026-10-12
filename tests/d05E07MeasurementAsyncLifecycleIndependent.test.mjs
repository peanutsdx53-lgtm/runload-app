import test from 'node:test';
import assert from 'node:assert/strict';
import { bindRunMeasurement } from '../ui/interactions/mobileRunMeasurementInteractions.js';

function harness({motionDeferred=false, wakeDeferred=false}={}){
  const old=Object.fromEntries(['document','window','navigator','sessionStorage','localStorage'].map(name=>[name,Object.getOwnPropertyDescriptor(globalThis,name)]));
  const nodes=new Map();
  const el=(key)=>{if(!nodes.has(key))nodes.set(key,{textContent:'',hidden:false,disabled:false,value:'',dataset:{},classList:{toggle(){}},handlers:new Map(),addEventListener(event,fn){this.handlers.set(event,fn);},removeEventListener(event){this.handlers.delete(event);},fire(event){return this.handlers.get(event)?.();},querySelector:el,querySelectorAll:()=>[]});return nodes.get(key);};
  const root=el('root');root.dataset={};
  const counters={timers:0,watchStarts:0,motionStarts:0,motionAdds:0,motionRemoves:0,profileLoads:0,wakeReleased:0};
  const grantMotions=[];let resolveWake;
  const win={isSecureContext:true,scrollTo(){},setInterval(){counters.timers++;return counters.timers;},clearInterval(){},setTimeout(){return 3;},performance:{now:()=>1000},
    DeviceMotionEvent:{requestPermission(){counters.motionStarts++;return motionDeferred?new Promise(resolve=>grantMotions.push(resolve)):Promise.resolve('granted');}},
    addEventListener(name){if(name==='devicemotion')counters.motionAdds++;},removeEventListener(name){if(name==='devicemotion')counters.motionRemoves++;}};
  const nav={geolocation:{watchPosition(){counters.watchStarts++;return counters.watchStarts;},clearWatch(){}}};
  if(wakeDeferred)nav.wakeLock={request(){return new Promise(resolve=>resolveWake=()=>resolve({release(){counters.wakeReleased++;}}));}};
  const doc={querySelector:()=>root,addEventListener(){},removeEventListener(){},visibilityState:'visible'};
  const storageMap=new Map();const storage={getItem:key=>storageMap.get(key)??null,setItem:(k,v)=>storageMap.set(k,v),removeItem:k=>storageMap.delete(k)};
  for(const [name,value] of Object.entries({document:doc,window:win,navigator:nav,sessionStorage:storage,localStorage:storage}))
    Object.defineProperty(globalThis,name,{configurable:true,writable:true,value});
  const services={storage:{settings:{load:()=>({measurementSoundEnabled:false})},profile:{load(){counters.profileLoads++;return {weightKg:70};}}}};
  const dispose=bindRunMeasurement({router:{navigateToScreen(){}},services});
  return {el,root,counters,grant:()=>grantMotions.splice(0).forEach(resolve=>resolve('granted')),resolveWake:()=>resolveWake?.(),dispose,
    cleanup(){for(const [name,descriptor] of Object.entries(old)){if(descriptor)Object.defineProperty(globalThis,name,descriptor);else delete globalThis[name];}}};
}
const tick=async()=>{await Promise.resolve();await Promise.resolve();await Promise.resolve();};
test('D05/E07 leaving during permission wait cannot start GPS/timer or leave motion listener',async()=>{
  const h=harness({motionDeferred:true});try{
    const start=h.el('[data-action="start-measurement"]').fire('click');await tick();h.dispose();h.grant();await start;
    assert.equal(h.counters.watchStarts,0);assert.equal(h.counters.timers,0);
    assert.equal(h.counters.motionAdds,h.counters.motionRemoves);
  }finally{h.cleanup();}
});
test('D05/E07 rapid double start serializes permission, timer and profile load',async()=>{
  const h=harness({motionDeferred:true});try{
    const a=h.el('[data-action="start-measurement"]').fire('click');const b=h.el('[data-action="start-measurement"]').fire('click');
    await tick();h.grant();await Promise.all([a,b]);
    assert.equal(h.counters.motionStarts,1);assert.equal(h.counters.timers,1);assert.equal(h.counters.profileLoads,1);h.dispose();
  }finally{h.cleanup();}
});
test('D05/E07 late OS wake lock grant after navigation is released',async()=>{
  const h=harness({wakeDeferred:true});try{
    const start=h.el('[data-action="start-measurement"]').fire('click');await tick();
    h.dispose();h.resolveWake();await start;
    assert.equal(h.counters.wakeReleased,1);
  }finally{h.cleanup();}
});
test('D05/E07 cancel before permission resolves does not restart recording',async()=>{
  const h=harness({motionDeferred:true});try{
    const start=h.el('[data-action="start-measurement"]').fire('click');await tick();
    await h.el('[data-action="cancel-measurement"]').fire('click');
    h.grant();await start;
    assert.equal(h.counters.watchStarts,0);assert.equal(h.counters.timers,0);
    assert.equal(h.counters.motionAdds,h.counters.motionRemoves);
    h.dispose();
  }finally{h.cleanup();}
});
