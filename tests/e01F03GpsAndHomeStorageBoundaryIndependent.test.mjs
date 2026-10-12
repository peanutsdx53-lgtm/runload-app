import test from 'node:test';
import assert from 'node:assert/strict';
import { renderRunRouteScreen } from '../screens/runRouteScreen.js';
import { renderResultScreen as renderMobileResult } from '../screens/mobile/resultScreen.js';
import { nextPlan } from '../screens/shared/homeScreenSupport.js';

const key='runner-load-app-new-v1-run-measurements-v1';
const payload='<img src=x onerror=alert(1)>';
const record={id:'saved-route',date:'2026-10-12',activityType:'run',runningFormat:'CONTINUOUS_RUN',distanceKm:3,durationMinutes:18};
function withRoute(distanceKm,durationMinutes,callback){
 const descriptor=Object.getOwnPropertyDescriptor(globalThis,'localStorage');
 const track=[{lat:35,lon:139},{lat:35.001,lon:139.001}];
 const item={recordId:'saved-route',distanceKm,durationMinutes,track};
 Object.defineProperty(globalThis,'localStorage',{configurable:true,value:{getItem:k=>k===key?JSON.stringify([item]):null}});
 try{return callback();}finally{if(descriptor)Object.defineProperty(globalThis,'localStorage',descriptor);else delete globalThis.localStorage;}
}
const context={parameters:new URLSearchParams('recordId=saved-route')};
const routeServices={storage:{records:{findById:id=>id==='saved-route'?record:null}}};
const resultServices={workflows:{records:{loadExperience:()=>({record,feedback:{}}),loadLatestExperience:()=>({record,feedback:{}}),loadAllExperiences:()=>[{record,feedback:{}}]}},fatigue:{summarizeRun:()=>null},storage:{selfInterpretations:{findByRecordId:()=>null}},achievements:{}};

test('F03 saved GPS route distance distinguishes unknown from genuine zero',()=>{
 for(const value of [null,'',false,[],{},payload]){
  const html=withRoute(value,12,()=>renderRunRouteScreen({services:routeServices,context}));
  assert.match(html, /<small>測定距離<\/small><strong>—<\/strong>/, `distance ${JSON.stringify(value)}`);
  assert.doesNotMatch(html, /NaN km|Infinity km|<img\s+src=x\s+onerror/i);
 }
 for(const val of [0,'0']) assert.match(withRoute(val,12,()=>renderRunRouteScreen({services:routeServices,context})),/<small>測定距離<\/small><strong>0\.00 km<\/strong>/);
});
test('F03 saved GPS route duration distinguishes unknown from genuine zero',()=>{
 for(const value of [null,'',false,[],{},payload]){
  const html=withRoute(3,value,()=>renderRunRouteScreen({services:routeServices,context}));
  assert.match(html, /<small>測定時間<\/small><strong>—<\/strong>/, `duration ${JSON.stringify(value)}`);
  assert.doesNotMatch(html, /NaN|Infinity|<img\s+src=x\s+onerror/i);
 }
 for(const val of [0,'0']) assert.match(withRoute(3,val,()=>renderRunRouteScreen({services:routeServices,context})),/<small>測定時間<\/small><strong>0:00<\/strong>/);
});
test('F03 mobile results linked GPS distance is unknown rather than artificial 0',()=>{
 for(const value of [null,'',false,[],{},payload]){
  const html=withRoute(value,12,()=>renderMobileResult({services:resultServices,context}));
  assert.match(html, /<small>位置情報の記録<\/small><strong>走行軌跡を見る<\/strong><em>—・保存地点 2点<\/em>/, `distance ${JSON.stringify(value)}`);
  assert.doesNotMatch(html, /<img\s+src=x\s+onerror|href="javascript:/i);
 }
 for(const val of [0,'0'])assert.match(withRoute(val,12,()=>renderMobileResult({services:resultServices,context})),/走行軌跡を見る<\/strong><em>0\.00 km・保存地点 2点<\/em>/);
});
test('G01 corrupted plan rows must not block later valid scheduled plan',()=>{
 const valid={id:'next',scheduledDate:'2099-12-31',planType:'run',plannedSession:{}};
 for(const bad of [null,false,{},'invalid',42]){
  assert.deepEqual(nextPlan({storage:{plans:{loadAll:()=>[bad,valid]}}}),valid);
 }
 assert.equal(nextPlan({storage:{plans:{loadAll:()=>null}}}),null);
});
