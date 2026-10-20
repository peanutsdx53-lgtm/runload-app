import test from 'node:test';
import assert from 'node:assert/strict';
import { renderBodyTimelineScreen } from '../screens/bodyTimelineScreen.js';
import { PRIMARY_REGIONAL_V2_MODEL_VERSION, RUNNING_EVIDENCE_MODEL_VERSION } from '../core/appCore.js';
import { createEvidenceRunningResultRecord } from '../core/runningEvidence/runningEvidenceProductBridge.js';

function record(id, date){return {id,date,createdAt:`${date}T08:00:00.000Z`,activityType:'run',distanceKm:5.5,durationMinutes:30,runningFormat:'CONTINUOUS_RUN'};}
function services(experiences){return {workflows:{records:{loadAllExperiences:()=>experiences}}};}
function render(experiences,id){return renderBodyTimelineScreen({services:services(experiences),context:{parameters:new URLSearchParams(`recordId=${encodeURIComponent(id)}`)}});}
function v4(id,date){const r=record(id,date);const calculated=createEvidenceRunningResultRecord({record:r});assert.equal(calculated.ok,true);assert.equal(calculated.resultRecord.model_version,RUNNING_EVIDENCE_MODEL_VERSION);return {record:r,regionalV2ResultRecord:calculated.resultRecord};}
function v3(id,date){const r=record(id,date);return {record:r,regionalV2ResultRecord:{model_version:PRIMARY_REGIONAL_V2_MODEL_VERSION,result:{regions:[{regionId:'BA-DISP-014',value:98.2},{regionId:'BA-DISP-029',value:101.1}]}}};}

test('v4 newly saved running records are eligible for actual body-timeline navigation, not incorrectly empty',()=>{
 const r=v4('running-evidence-saved','2026-10-19');const html=render([r],r.record.id);
 assert.match(html,/data-body-timeline-card/);assert.match(html,/data-current="true"/);
 assert.match(html,/研究参照 v4/);assert.match(html,/12<\/strong>/);
 assert.match(html,/部位同士の順位や危険度/);
 assert.doesNotMatch(html,/表示できる走行記録がまだありません/);
});
test('legacy v3 and v4 appear only as version-labeled independent snapshots, never implied comparable deltas',()=>{
 const old=v3('legacy','2026-10-18'),current=v4('latest','2026-10-19');const html=render([old,current],'latest');
 assert.equal((html.match(/data-body-timeline-card/g)||[]).length,2);
 assert.match(html,/旧計算 v3/);assert.match(html,/研究参照 v4/);
 assert.match(html,/旧モデルと新モデルの基準・測定対象は異なる/);
 assert.match(html,/別の計算方式をまたいだ増減比較はできません/);
 assert.match(html,/href="#\/result\?recordId=legacy"/);
 assert.match(html,/href="#\/result\?recordId=latest"/);
});
test('absent, malformed and rest entries cannot create false body-timeline cards',()=>{
 const bad=[{record:{id:'rest',activityType:'rest',date:'2026-10-18'},regionalV2ResultRecord:{model_version:RUNNING_EVIDENCE_MODEL_VERSION,result:{regions:[]}}},{record:record('unknown','2026-10-18'),regionalV2ResultRecord:{model_version:'unsupported',result:{regions:[]}}},{record:record('no-result','2026-10-18'),regionalV2ResultRecord:null},null];
 assert.match(render(bad,'rest'),/表示できる走行記録がまだありません/);
});
