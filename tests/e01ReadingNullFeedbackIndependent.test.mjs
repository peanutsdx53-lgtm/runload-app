import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const content=fs.readFileSync(new URL('../screens/readingScreen.js',import.meta.url),'utf8');
const start=content.indexOf('function bodyAreaObservations(feedback = {}) {');
const end=content.indexOf('function buildRecordHistory(',start);
assert.ok(start>=0&&end>start,'production feedback-reading helper located');
const context={BODY_AREA_BY_ID:{knee:{id:'knee'}}};
vm.runInNewContext(content.slice(start,end)+'\nthis.read=bodyAreaObservations;',context,{timeout:1000});
const read=context.read;

test('E01 reading: null saved feedback is missing, not a fatal property access',()=>{
  assert.deepEqual(Array.from(read(null)),[]);
});
test('E01 reading: wrongly typed saved feedback does not generate observations',()=>{
  for(const invalid of [false,0,'',{},[],{bodyAreaObservations:'untrusted'}]){
    assert.deepEqual(Array.from(read(invalid)),[]);
  }
});
test('E01 reading: saved valid observations preserve known categories',()=>{
  const found=read({bodyAreaObservations:[{areaId:'knee',note:'fine'},{areaId:'unknown'},{areaId:null},null]});
  assert.deepEqual(Array.from(found,item=>item?.areaId),['knee']);
});
