import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { isPresentFiniteNumber } from '../shared/valueUtilities.js';
const source=fs.readFileSync(new URL('../screens/consultationScreen.js',import.meta.url),'utf8');
const begin=source.indexOf('function consultationRegionalSummary(');
const end=source.indexOf('function consultationBodyRows(',begin);
assert.ok(begin>=0 && end>begin,'production renderer is reachable');
const ctx={isPresentFiniteNumber,bodyRegionFormalName:(_id,label)=>label,formatNumber:(v)=>String(Number(v).toFixed(1)),formatLocalDate:s=>s};
vm.runInNewContext(source.slice(begin,end)+'\nglobalThis.__render=consultationRegionalSummary;',ctx);
const render=ctx.__render;
const decision=(value,previousValue,pointDelta=null)=>({regional:{regionId:'R07',regionLabel:'下腿後面',displayIndex:value,previousComparable:{status:'COMPARABLE',previous:{displayConditionIndex:previousValue,date:'2026-10-10'},pointDelta}}});
test('F03 consultation: missing current value is not numeric zero',()=>{
 for(const missing of [null,undefined,'',false]){
  const result=render(decision(missing,98,4));
  assert.equal(result.available,false); assert.equal(result.value,'数値なし');
  assert.equal(result.previous,'比較できる過去記録なし');
 }
});
test('F03 consultation: missing previous value never generates numeric comparison',()=>{
 for(const missing of [null,undefined,'',false]){
  const result=render(decision(105,missing,4));
  assert.equal(result.available,true);assert.equal(result.previous,'比較できる過去記録なし');
 }
});
test('F03 consultation: missing delta derives from valid prior/current instead of zero',()=>{
 const result=render(decision(105,98,null));
 assert.match(result.previous,/\+7\.0/);
 assert.doesNotMatch(result.previous,/\+0\.0/);
});
test('F03 consultation: genuine numeric zero remains present, not missing',()=>{
 const result=render(decision(0,0,0));
 assert.equal(result.available,true);assert.equal(result.value,'0.0');assert.match(result.previous,/\+0\.0/);
});
