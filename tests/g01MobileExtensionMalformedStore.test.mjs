import test from 'node:test';
import assert from 'node:assert/strict';
import { saveMobileExtensionRecord, listMobileExtensionRecords } from '../ui/mobileWalkJogRecordStore.js';

const KEY='runner-load-app-mobile-walk-jog-records-v1.3';
const pending={version:1,distanceKm:1,durationMinutes:12,saveRoute:false,track:[],acceptedPointCount:0,rejectedPointCount:0};
const analysis={version:1,modelVersion:'2026-09-30.v1.3',activityId:'WALK',segments:[]};
function storage(raw=null){const map=new Map(raw===null?[]:[[KEY,raw]]);return {
 getItem(k){return map.has(k)?map.get(k):null},
 setItem(k,v){map.set(k,String(v))},
 snapshot(){return map.get(KEY)??null},
};}
function save(s){return saveMobileExtensionRecord({analysis,pending,storage:s});}

for(const [name,initial] of [['malformed JSON','[{broken'],['object root','{"id":"old"}'],['null root','null'],['string root','"old"']]){
 test(`G01: ${name} is not overwritten on subsequent mobile-activity save`,()=>{
  const s=storage(initial);
  const before=s.snapshot();
  const response=save(s);
  assert.equal(response.ok,false,'saved record must not claim success while prior entries are unreadable');
  assert.equal(response.code,'MOBILE_ACTIVITY_RECORD_READ_FAILED');
  assert.equal(s.snapshot(),before,'raw pre-existing data must remain exactly intact');
 });
}
test('G01: storage read rejection is fail-closed and never creates misleading saved entry',()=>{
 let writes=0;
 const s={getItem(){throw new Error('SecurityError')},setItem(){writes++}};
 const response=save(s);
 assert.equal(response.ok,false);
 assert.equal(response.code,'MOBILE_ACTIVITY_RECORD_READ_FAILED');
 assert.equal(writes,0);
});
test('G01: clean missing and existing array stores still save',()=>{
 const empty=storage();
 assert.equal(save(empty).ok,true);
 assert.equal(listMobileExtensionRecords(empty).length,1);
 const existed=storage(JSON.stringify([{id:'legacy-entry',activityId:'WALK'}]));
 assert.equal(save(existed).ok,true);
 assert.ok(listMobileExtensionRecords(existed).some(x=>x.id==='legacy-entry'));
});
