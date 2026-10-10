import test from 'node:test';
import assert from 'node:assert/strict';
import {writeLayout, writeWidgetLayout, writePositionLayout} from '../ui/interactions/mobileHomeLayoutState.js';

const KEYS=Object.freeze({
  layout:'running-record-mobile-home-layout-v1',
  positions:'running-record-mobile-home-positions-v1',
  widgets:'running-record-mobile-home-widgets-v1',
});
const page={ querySelector(name){return name==='.mobile-home-grid'?{children:[]}:null;},querySelectorAll(){return [];} };
const root={querySelectorAll(name){
  if(name==='.mobile-home-page')return [page];
  if(name==='[data-home-widget-id]')return [{dataset:{homeWidgetId:'today',homeWidgetSize:'medium'},hidden:false,closest:()=>({dataset:{homePageIndex:'0'}})}];
  return [];
}};
const dock={querySelectorAll(){return [];}};
const writers={layout:()=>writeLayout(root,dock,0),positions:()=>writePositionLayout(root),widgets:()=>writeWidgetLayout(root)};
function runWithStorage(storage,fn){const old=Object.getOwnPropertyDescriptor(globalThis,'localStorage');Object.defineProperty(globalThis,'localStorage',{value:storage,configurable:true,writable:true});try{return fn();}finally{if(old)Object.defineProperty(globalThis,'localStorage',old);else delete globalThis.localStorage;}}

for(const [area,key] of Object.entries(KEYS)){
  test(`G-01 home ${area}: malformed JSON must never be overwritten by a new arrangement`,()=>{
    const data=new Map([[key,'{"oldUnfinished":']]);let writes=0;
    runWithStorage({getItem:k=>data.get(k)??null,setItem(k,v){writes++;data.set(k,String(v));}},()=>writers[area]());
    assert.equal(writes,0);assert.equal(data.get(key),'{"oldUnfinished":');
  });
  test(`G-01 home ${area}: nonobject JSON must not be silently replaced`,()=>{
    const data=new Map([[key,'[1,2,3]']]);let writes=0;
    runWithStorage({getItem:k=>data.get(k)??null,setItem(k,v){writes++;data.set(k,String(v));}},()=>writers[area]());
    assert.equal(writes,0);assert.equal(data.get(key),'[1,2,3]');
  });
  test(`G-01 home ${area}: storage read denial must not attempt a write`,()=>{
    let writes=0;
    runWithStorage({getItem(){throw Error('denied');},setItem(){writes++;}},()=>writers[area]());
    assert.equal(writes,0);
  });
  test(`G-01 home ${area}: missing first-use key remains writable`,()=>{
    const data=new Map();let writes=0;
    runWithStorage({getItem:k=>data.get(k)??null,setItem(k,v){writes++;data.set(k,String(v));}},()=>writers[area]());
    assert.equal(writes,1);assert.ok(JSON.parse(data.get(key)));
  });
}

test('G-01 home layout: legacy valid page/dock format still saves without version migration',()=>{
  const data=new Map([[KEYS.layout,JSON.stringify({pages:[['widget:today','widget:plan','widget:changes','widget:checkpoint']],dock:['record','measure','history','course']})]]);
  let writes=0;
  runWithStorage({getItem:k=>data.get(k)??null,setItem(k,v){writes++;data.set(k,String(v));}},()=>writers.layout());
  assert.equal(writes,1);assert.equal(JSON.parse(data.get(KEYS.layout)).version,3);
});

test('G-01 home position layout: valid old positions remain writable after guarded read',()=>{
 const key=KEYS.positions;const data=new Map([[key,JSON.stringify({pages:[[{token:'app:record',row:1,col:1}]]})]]);let writes=0;
 runWithStorage({getItem:k=>data.get(k)??null,setItem(k,v){writes++;data.set(k,String(v));}},()=>writers.positions());
 assert.equal(writes,1);assert.equal(JSON.parse(data.get(key)).version,1);
});
test('G-01 home widgets: valid legacy partial widget settings remain writable',()=>{
 const key=KEYS.widgets;const data=new Map([[key,JSON.stringify({order:['today','plan'],visible:['today']})]]);let writes=0;
 runWithStorage({getItem:k=>data.get(k)??null,setItem(k,v){writes++;data.set(k,String(v));}},()=>writers.widgets());
 assert.equal(writes,1);assert.equal(JSON.parse(data.get(key)).version,2);
});
test('G-01 home: malformed layout shapes remain intact, rather than being replaced with generated defaults',()=>{
 const malformed={layout:{pages:1,dock:[]},positions:{pages:{bad:true}},widgets:{order:'today',visible:[]}};
 for(const [area,key] of Object.entries(KEYS)){
  const raw=JSON.stringify(malformed[area]);const data=new Map([[key,raw]]);let writes=0;
  runWithStorage({getItem:k=>data.get(k)??null,setItem(k,v){writes++;data.set(k,String(v));}},()=>writers[area]());
  assert.equal(writes,0,area);assert.equal(data.get(key),raw,area);
 }
});
