import assert from 'node:assert/strict';
import '../core/internal/primaryModelEngine.js';
import {internalModules} from '../core/internal/modules.js';
const engine=internalModules.primaryRegionalEngine;
let checks=0;
assert.equal(engine.REGION_DEFS.length,12);checks++;
for(const def of engine.REGION_DEFS){
 const id=def.id;const v=def.referenceSpeedMps;
 for(const speed of [undefined,null,0,-0.01,NaN,'']){
  const actual=engine.evaluateRegionSegment(id,{distanceKm:1,speedMps:speed});
  assert.equal(actual.state,'INVALID_SEGMENT_FACT',`${id}: invalid speed=${String(speed)}`);
  assert.equal(actual.value,undefined);checks++;
 }
 for(const speed of [Infinity,-Infinity,20,100]){
  const actual=engine.evaluateRegionSegment(id,{distanceKm:1,speedMps:speed});
  assert.ok(actual.value==null,`${id}: outside evidence speed must have no numeric value`);
  assert.ok(['EVIDENCE_INSUFFICIENT','INVALID_SEGMENT_FACT'].includes(actual.state));checks++;
 }
 const base=engine.evaluateRegionSegment(id,{distanceKm:1,speedMps:v});
 assert.equal(base.state,'OK');assert.ok(Math.abs(base.value-100)<1e-8);checks++;
 for(const grade of [20,100,-100]){
  const r=engine.evaluateRegionSegment(id,{distanceKm:1,speedMps:v,gradePercent:grade});
  assert.equal(r.state,'OK',`${id} grade:${grade}`);
  assert.equal(r.value,base.value,`${id} out-of-source grade must not affect values`);
  assert.ok(r.trace.unquantified.some(x=>x.axis==='GRADE'),`${id} grade must preserve unsupported evidence`);
  assert.ok(!r.trace.components.some(x=>x.axis==='GRADE'),`${id} grade falsely quantified`);
  checks++;
 }
}
console.log(JSON.stringify({suite:'A05 evidence-range all twelve regions',checks,pass:checks,fail:0}));
