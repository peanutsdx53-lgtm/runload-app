import test from 'node:test';
import assert from 'node:assert/strict';
import { renderRunCapsule } from '../ui/mobileInsights.js';
const record={id:'nonexistent-capsule-energy-test',activityType:'run',date:'2026-10-11',
 distanceKm:5,durationMinutes:30,runningFormat:'CONTINUOUS_RUN'};
const services={storage:{records:{loadAll:()=>[record]},plans:{loadAll:()=>[]},courses:{loadAll:()=>[]}}};
test('D05/F03: capsule cannot display missing energy as zero',()=>{
 for(const missing of [null,undefined,'',false,'20']){
  const html=renderRunCapsule(services,record,{measurement:{energyEstimate:{estimatedKcal:missing}}});
  assert.doesNotMatch(html,/推定消費/);
 }
 assert.doesNotMatch(renderRunCapsule(services,record,{measurement:null}),/推定消費/);
});
test('D05/F03: legitimate numeric zero and positive outputs remain',()=>{
 for(const estimatedKcal of [0,312.4]){
  const html=renderRunCapsule(services,record,{measurement:{energyEstimate:{estimatedKcal}}});
  assert.match(html,new RegExp(`推定消費[\\s\\S]*?${Math.round(estimatedKcal)} kcal`));
 }
});