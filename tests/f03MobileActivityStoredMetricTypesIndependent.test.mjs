import test from 'node:test';
import assert from 'node:assert/strict';
import { installMobileWalkJogHistoryUi } from '../ui/mobileWalkJogHistoryUi.js';

const KEY = 'runner-load-app-mobile-walk-jog-records-v1.3';
const SAMPLE = { id: 'valid', createdAt: '2026-10-12T01:00:00Z', activityId: 'WALK', distanceKm: 0, durationMinutes: 0, analysis: { segments: [] } };

function renderStoredRecord(record, route = '#/history?mobileActivity=1') {
  const globals = ['document', 'window', 'location', 'localStorage', 'MutationObserver', 'queueMicrotask', 'addEventListener', 'removeEventListener'];
  const originals = new Map(globals.map((key) => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
  const head = {classList: {contains: name => name === 'page-head'}, dataset: {}, hidden: false};
  const screen = {children: [head], panel: null,
    querySelector(selector) { return selector === ':scope > [data-mobile-activity-history]' ? this.panel : selector === ':scope > .page-head' ? head : null; },
    prepend(p) { this.panel = p; p.parentElement = this; this.children.unshift(p); },
  };
  head.insertAdjacentElement = (_pos, panel) => { screen.panel=panel; panel.parentElement=screen; screen.children.push(panel); };
  Object.defineProperties(globalThis, {
    document: {configurable:true, writable:true, value: {body: {}, querySelector: selector => selector === '.screen-layout--history' ? screen : null, createElement: () => ({dataset:{},classList:{contains:()=>false},parentElement:null,innerHTML:'',hidden:false})}},
    window: {configurable:true, writable:true, value: {innerWidth:390}},
    location: {configurable:true, writable:true, value: {hash:route}},
    localStorage: {configurable:true, writable:true, value: {getItem: key => key === KEY ? JSON.stringify([record]) : null}},
    MutationObserver: {configurable:true, writable:true, value: class { observe() {} disconnect() {} }},
    queueMicrotask: {configurable:true, writable:true, value: fn => fn()},
    addEventListener: {configurable:true, writable:true, value: () => {}},
    removeEventListener: {configurable:true, writable:true, value: () => {}},
  });
  try { const dispose = installMobileWalkJogHistoryUi(); const markup=screen.panel?.innerHTML || ''; dispose(); return markup; }
  finally { for(const [key, d] of originals) { if(d) Object.defineProperty(globalThis,key,d); else delete globalThis[key]; } }
}

test('F03 missing/invalid distance stays unknown instead of coerced 0 or 1 in archived activity list', () => {
  for (const bad of [null, '', false, true, [], [0], {}]) {
    const html=renderStoredRecord({...SAMPLE, distanceKm:bad});
    assert.match(html, /<dt>距離<\/dt><dd>— km<\/dd>/, `bad distance ${JSON.stringify(bad)}: ${html.slice(0,350)}`);
  }
  const zero=renderStoredRecord({...SAMPLE,distanceKm:0});
  assert.match(zero, /<dt>距離<\/dt><dd>0\.00 km<\/dd>/);
  const text=renderStoredRecord({...SAMPLE,distanceKm:'5.25'});
  assert.match(text, /<dt>距離<\/dt><dd>5\.25 km<\/dd>/);
});

test('F03 invalid duration is never displayed as zero minutes in archived activity list', () => {
  for (const bad of [null,'',false,true,[],[0],{}]) {
    const html=renderStoredRecord({...SAMPLE,durationMinutes:bad});
    assert.match(html, /<dt>時間<\/dt><dd>—<\/dd>/, `bad minutes ${JSON.stringify(bad)}`);
  }
  assert.match(renderStoredRecord({...SAMPLE,durationMinutes:0}), /<dt>時間<\/dt><dd>0分<\/dd>/);
  assert.match(renderStoredRecord({...SAMPLE,durationMinutes:'65'}), /<dt>時間<\/dt><dd>1時間5分<\/dd>/);
});

test('F03 invalid segment elapsed and speed never masquerade as 0:00, 0:01 or 0.00', () => {
  for (const bad of [null,'',false,true,[],[0],{}]) {
    const segment={gaitId:'WALK',distanceKm:bad,durationSeconds:bad,speedKmh:bad};
    const html=renderStoredRecord({...SAMPLE,analysis:{segments:[segment]}}, '#/history?mobileActivity=1&mobileActivityRecordId=valid');
    assert.match(html, /<dt>距離<\/dt><dd>— km<\/dd>/);
    assert.match(html, /<dt>時間<\/dt><dd>—<\/dd>/);
    assert.match(html, /<dt>平均速度<\/dt><dd>— km\/h<\/dd>/);
  }
  const zero={gaitId:'WALK',distanceKm:0,durationSeconds:0,speedKmh:0};
  const html=renderStoredRecord({...SAMPLE,analysis:{segments:[zero]}}, '#/history?mobileActivity=1&mobileActivityRecordId=valid');
  assert.match(html, /<dt>距離<\/dt><dd>0\.00 km<\/dd>/);
  assert.match(html, /<dt>時間<\/dt><dd>0:00<\/dd>/);
  assert.match(html, /<dt>平均速度<\/dt><dd>0\.00 km\/h<\/dd>/);
});
