import test from 'node:test';
import assert from 'node:assert/strict';
import { installMobileWalkJogHistoryUi } from '../ui/mobileWalkJogHistoryUi.js';

const KEY = 'runner-load-app-mobile-walk-jog-records-v1.3';
const stamp = '2026-10-10T00:00:00Z';
const good = (id, distanceKm, segments = []) => ({
  id, createdAt: stamp, activityId: 'WALK', distanceKm,
  durationMinutes: 13, analysis: { segments },
});
function harness(rows, hash) {
  const saved = new Map([[KEY, JSON.stringify(rows)]]);
  const old = Object.fromEntries(['document','window','location','localStorage','MutationObserver','queueMicrotask','addEventListener','removeEventListener'].map(k=>[k,globalThis[k]]));
  let callback = null;
  const head = { classList:{contains:x=>x==='page-head'}, dataset:{}, hidden:false };
  const screen = { children:[head], panel:null,
    querySelector(s) { return s===':scope > [data-mobile-activity-history]' ? this.panel : s===':scope > .page-head' ? head : null; },
    prepend(p) { this.panel=p;p.parentElement=this;this.children.unshift(p); },
  };
  head.insertAdjacentElement=(_position,p)=>{screen.panel=p;p.parentElement=screen;screen.children.push(p);};
  globalThis.document={body:{},querySelector:s=>s==='.screen-layout--history'?screen:null,createElement:()=>({dataset:{},classList:{contains:()=>false},parentElement:null,innerHTML:'',hidden:false})};
  globalThis.window={innerWidth:390};
  globalThis.location={hash};
  globalThis.localStorage={getItem:k=>saved.get(k)??null,setItem:(k,v)=>saved.set(k,v)};
  globalThis.MutationObserver=class {constructor(fn){callback=fn;} observe(){} disconnect(){}};
  globalThis.queueMicrotask=fn=>fn();
  globalThis.addEventListener=()=>{};
  globalThis.removeEventListener=()=>{};
  return {
    screen,
    update(rows){saved.set(KEY,JSON.stringify(rows));callback?.();},
    raw(){return saved.get(KEY);},
    restore(){for(const [k,v] of Object.entries(old)){if(v===undefined)delete globalThis[k];else globalThis[k]=v;}}
  };
}

test('G-01 refreshed full history displays changed distance for unchanged ID and timestamp',()=>{
 const h=harness([good('fixed-id',1.1)],'#/history?mobileActivity=1');
 try{const uninstall=installMobileWalkJogHistoryUi();
  assert.match(h.screen.panel.innerHTML,/1\.10/);
  h.update([good('fixed-id',8.4)]);
  assert.match(h.screen.panel.innerHTML,/8\.40/,'display must not retain stale distance');
  assert.equal(JSON.parse(h.raw())[0].distanceKm,8.4);
  uninstall();
 }finally{h.restore();}
});

test('G-01 refreshed full history displays changed non-leading row',()=>{
 const h=harness([good('fixed-id',1.1),good('second-id',2.2)],'#/history?mobileActivity=1');
 try{const uninstall=installMobileWalkJogHistoryUi();
  assert.match(h.screen.panel.innerHTML,/2\.20/);
  h.update([good('fixed-id',1.1),good('second-id',7.7)]);
  assert.match(h.screen.panel.innerHTML,/7\.70/,'display must reflect non-leading record update');
  uninstall();
 }finally{h.restore();}
});

test('G-01 refreshed selected detail displays changed segments',()=>{
 const segment=(distanceKm)=>({gaitId:'WALK',distanceKm,durationSeconds:120,speedKmh:3.6});
 const h=harness([good('fixed-id',1.1,[segment(1.1)])],'#/history?mobileActivity=1&mobileActivityRecordId=fixed-id');
 try{const uninstall=installMobileWalkJogHistoryUi();
  assert.match(h.screen.panel.innerHTML,/1\.10/);
  h.update([good('fixed-id',1.1,[segment(8.8)])]);
  assert.match(h.screen.panel.innerHTML,/8\.80/,'detail must not retain stale segment');
  uninstall();
 }finally{h.restore();}
});

test('G-01 unchanged archive rerender does not repeatedly replace DOM',()=>{
 const h=harness([good('fixed-id',1.1)],'#/history?mobileActivity=1');
 try{const uninstall=installMobileWalkJogHistoryUi();
  const panel=h.screen.panel;
  const first=panel.innerHTML;
  h.update([good('fixed-id',1.1)]);
  assert.equal(panel.innerHTML,first);
  uninstall();
 }finally{h.restore();}
});
