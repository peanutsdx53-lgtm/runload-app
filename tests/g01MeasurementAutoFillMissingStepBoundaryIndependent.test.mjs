import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source=fs.readFileSync(new URL('../ui/mobileMeasurementRecordAutofill.js',import.meta.url),'utf8');
const start=source.indexOf('  const steps = measurement.stepEstimate?.steps;');
const end=source.indexOf('  const course = measurement.courseAnalysis;',start);
assert.ok(start>=0&&end>start,'actual measurement autofill step propagation exists');
const block=source.slice(start,end);
function written(steps){
  const writes=[];
  const ctx={
    measurement:{stepEstimate:{steps}},
    form:{querySelector:()=>null,querySelectorAll:()=>[]},
    setValue:(_form,name,value)=>writes.push([name,value]),
  };
  vm.runInNewContext('(function(){'+block+'})()',ctx,{timeout:1000});
  return writes;
}
test('G01 null, blank, invalid, unsafe or negative step values never claim an estimate',()=>{
  for(const value of [null,undefined,'','  ',false,'bad',{},-1,0.5,Infinity,Number.MAX_SAFE_INTEGER+1])
    assert.equal(written(value).length,0,String(value));
});
test('G01 a real estimate of zero remains valid',()=>{
  assert.deepEqual(written(0),[['steps',0],['stepsProvenance','ESTIMATED']]);
});
test('G01 a real positive estimate remains valid',()=>{
  assert.deepEqual(written(1200),[['steps',1200],['stepsProvenance','ESTIMATED']]);
});
