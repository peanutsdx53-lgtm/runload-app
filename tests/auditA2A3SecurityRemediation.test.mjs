import assert from 'node:assert/strict';
import {createApplicationServices, createMemoryStorage} from '../core/appCore.js';
import {renderSimulationScreen as desktop} from '../screens/desktop/simulationScreen.js';
import {renderSimulationScreen as mobile} from '../screens/mobile/simulationScreen.js';
import {rememberInterpretationReferenceSelection, rememberInterpretationReferenceSelectionResult, loadInterpretationReferenceHistory} from '../ui/interpretationReferenceHistory.js';
import {renderSimulationComparisonResult} from '../ui/interactions/simulationInteractions.js';

const services=()=>createApplicationServices({storage:createMemoryStorage()});
const rec=(id,createdAt,distanceKm=5)=>({id,date:'2026-10-07',createdAt,activityType:'run',distanceKm,durationMinutes:30,runningFormat:'CONTINUOUS_RUN',stepsProvenance:'UNKNOWN',course:{name:'公園',gradeKnowledge:'UNKNOWN',modelSurfaceClass:'UNKNOWN'}});
const save=(s,r)=>assert.equal(s.workflows.records.saveRecordAndFeedback(r,{checkStatus:'deferred',bodyAreaObservations:[],safetyFlags:{}}).ok,true);
const context=(p='')=>({parameters:new URLSearchParams(p)});
let checks=0;
function check(name,fn){fn();checks++;console.log('PASS '+name)}
check('A2-01 history sorts same-day records by timestamp then ID',()=>{
  const s=services();save(s,rec('a','2026-10-07T09:00:00Z'));save(s,rec('z','2026-10-07T08:00:00Z'));save(s,rec('b','2026-10-07T09:00:00Z'));
  assert.deepEqual(s.workflows.history.search({period:'all'}).map(x=>x.record.id),['b','a','z']);
});
check('A2-04 consultation selects earlier identical-timestamp ID',()=>{
  const s=services();save(s,rec('a','2026-10-07T09:00:00Z'));save(s,rec('b','2026-10-07T09:00:00Z',6));
  const all=s.workflows.records.loadAllExperiences();
  const got=s.consultation.buildDeterministicConsultation({experience:all.find(x=>x.record.id==='b'),allExperiences:all,regionId:'BA-DISP-014'});
  assert.equal(got.regional.previousComparable.status,'COMPARABLE');
  assert.equal(got.regional.previousComparable.previous.recordId,'a');
});
check('A2-02 history storage failure is not represented as success',()=>{
  const gateway={readJson:()=>({version:1,entries:[]}),writeJson:()=>({ok:false,code:'WRITE_DENIED'})};
  assert.deepEqual(rememberInterpretationReferenceSelection(gateway,{recordId:'r',articleId:'article'}),[]);
  const res=rememberInterpretationReferenceSelectionResult(gateway,{recordId:'r',articleId:'article'});
  assert.equal(res.ok,false); assert.equal(res.code,'WRITE_DENIED');assert.equal(res.entries.length,0);
  assert.equal(loadInterpretationReferenceHistory(gateway).length,0);
});
check('A2-02 real persistent history success remains usable',()=>{
  const s=services(),gateway=s.storage.gateway;
  const res=rememberInterpretationReferenceSelectionResult(gateway,{recordId:'r',articleId:'article'});
  assert.equal(res.ok,true);assert.deepEqual(loadInterpretationReferenceHistory(gateway),[{recordId:'r',articleId:'article'}]);
});
check('A3-01 empty history does not fabricate comparison baseline',()=>{
  for(const render of [desktop,mobile]){
    const html=render({services:services(),context:context()});
    assert.match(html,/比較元の記録がありません/);
    assert.match(html,/最初に走行記録を保存してください/);
    assert.doesNotMatch(html,/id="simulation-form"|value="5\.0"|value="32"/);
  }
});
check('A3-02 unknown record never silently compares a different record',()=>{
  const s=services();save(s,rec('valid','2026-10-07T09:00:00Z'));
  for(const render of [desktop,mobile]){
    const html=render({services:s,context:context('recordId=missing-record')});
    assert.match(html,/指定した走行記録が見つかりません/);
    assert.doesNotMatch(html,/id="simulation-form"|sourceRecordId.*valid/);
  }
});
check('SEC-01 comparison renders untrusted course names as text',()=>{
  const injection='<img src=x onerror=alert(1)>';
  const data=new FormData();data.set('distanceKm','6');data.set('durationMinutes','30');data.set('sourceConditionJson',JSON.stringify({distanceKm:5,durationMinutes:30,course:{name:'元'}}));
  data.set('courseJson',JSON.stringify({name:injection}));
  const html=renderSimulationComparisonResult({state:'OK',regions:{}},new Map(),true,data,{name:injection});
  assert.ok(html.includes('&lt;img src=x onerror=alert(1)&gt;'));
  assert.ok(!html.includes('<img src=x onerror=alert(1)>'));
});
console.log('SUMMARY '+JSON.stringify({checks,failures:0}));
