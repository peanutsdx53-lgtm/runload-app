import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { renderSameCourseComparison, renderRunCapsule } from '../ui/mobileInsights.js';
import { isPresentFiniteNumber as finite } from '../shared/valueUtilities.js';

const oldStorage=globalThis.localStorage;
const entries=new Map();
globalThis.localStorage={getItem:k=>entries.get(k)??null,setItem:(k,v)=>entries.set(k,String(v)),removeItem:k=>entries.delete(k)};
const before={id:'p',activityType:'run',date:'2026-10-01',createdAt:'2026-10-01T09:00:00Z',course:{id:'course-one',name:'河川敷'},runningFormat:'CONTINUOUS_RUN',distanceKm:4,durationMinutes:28};
const after={...before,id:'c',date:'2026-10-03',createdAt:'2026-10-03T09:00:00Z',distanceKm:5,durationMinutes:30};
function compare(current,previous){return renderSameCourseComparison(current,[{record:previous},{record:current}]);}

// Parse and execute actual production home helpers without creating a DOM or changing stored records.
const homeSource=fs.readFileSync(new URL('../screens/mobile/homeScreen.js',import.meta.url),'utf8');
const start=homeSource.indexOf('function recentDistanceChange(services) {');
const end=homeSource.indexOf('function renderOverviewWeek(services) {',start);
const renderStart=homeSource.indexOf('function renderOverviewChange(services) {');
const renderEnd=homeSource.indexOf('function renderOverviewAchievements(services) {',renderStart);
assert.ok(start>=0&&end>start&&renderStart>=0&&renderEnd>renderStart,'production home comparison helpers found');
const ctx={finite,escapeHtml:(v)=>String(v).replace(/&/g,'&amp;').replace(/</g,'&lt;'),formatNumber:(v,n)=>Number(v).toFixed(n),shortDate:v=>String(v)};
vm.runInNewContext(homeSource.slice(start,end)+homeSource.slice(renderStart,renderEnd)+'\nglobalThis.change=renderOverviewChange;',ctx);
const homeDisplay=(current,previous)=>ctx.change({storage:{records:{loadAll:()=>[current,previous]}}});

test('F03 same-course distance comparison does not print unrecorded distance as 0.00 km',()=>{
 for(const missing of [null,undefined,'',false,[],{}]){
  const html=compare(after,{...before,distanceKm:missing});
  assert.match(html,/<small>距離差<\/small><strong>—<\/strong>/);
  assert.match(html,/<span>— → 5\.00 km<\/span>/);
  assert.doesNotMatch(html,/<span>0\.00 → 5\.00 km<\/span>/);
 }
 assert.match(compare({...after,distanceKm:0},{...before,distanceKm:'0'}),/<span>0\.00 → 0\.00 km<\/span>/);
});

test('F03 same-course duration comparison distinguishes missing from actual zero',()=>{
 for(const missing of [null,undefined,'',true,[],{}]){
  const html=compare(after,{...before,durationMinutes:missing});
  assert.match(html,/<small>時間差<\/small><strong>—<\/strong>/);
  assert.match(html,/<span>— → 30\.0 分<\/span>/);
  assert.doesNotMatch(html,/<span>0\.0 → 30\.0 分<\/span>/);
 }
 assert.match(compare({...after,durationMinutes:0},{...before,durationMinutes:'0'}),/<span>0\.0 → 0\.0 分<\/span>/);
});

test('F03 capsule does not convert missing saved distance and duration to measured zero',()=>{
 const services={storage:{records:{loadAll:()=>[]}},workflows:{records:{loadAllExperiences:()=>[]}}};
 const output=renderRunCapsule(services,{...after,distanceKm:null,durationMinutes:false},{measurement:null,fatigue:null});
 assert.match(output,/<small>距離<\/small><strong>—<em>km<\/em>/);
 assert.match(output,/<small>時間<\/small><strong>—<em>分<\/em>/);
 assert.doesNotMatch(output,/<small>距離<\/small><strong>0\.00/);
 assert.doesNotMatch(output,/<small>時間<\/small><strong>0\.0/);
 const zero=renderRunCapsule(services,{...after,distanceKm:0,durationMinutes:'0'},{measurement:null,fatigue:null});
 assert.match(zero,/<small>距離<\/small><strong>0\.00<em>km<\/em>/);
 assert.match(zero,/<small>時間<\/small><strong>0\.0<em>分<\/em>/);
});

test('F03 mobile home distance change does not report missing last distance as 0 km',()=>{
 for(const missing of [null,undefined,'',false,[],{}]){
  const html=homeDisplay(after,{...before,distanceKm:missing});
  assert.match(html,/<span class="mobile-home-overview-card__label">前回との距離差<\/span><strong>—<\/strong>/);
  assert.doesNotMatch(html,/<strong>\+5\.0 km<\/strong>/);
 }
 assert.match(homeDisplay({...after,distanceKm:0},{...before,distanceKm:'0'}),/<strong>0\.0 km<\/strong>/);
});

test.after(()=>{if(oldStorage===undefined) delete globalThis.localStorage;else globalThis.localStorage=oldStorage;});
