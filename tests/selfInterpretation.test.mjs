import assert from "node:assert/strict";
import { normalizeSelfInterpretation } from "../core/selfInterpretationCore.js";
import { createApplicationServices, createMemoryStorage, STORAGE_KEYS } from "../core/appCore.js";

const results=[];
async function test(id,fn){try{await fn();results.push({id,status:"PASS"});}catch(error){results.push({id,status:"FAIL",message:error?.stack||String(error)});}}

function record(id="r1") { return { id, date:"2026-10-02", createdAt:"2026-10-02T09:00:00.000Z", activityType:"run" }; }

await test("INTERPRETATION-STORES-USER-CONFIRMED-MEANING-WITHOUT-SCIENTIFIC-VALUE-COPY",()=>{
  const services=createApplicationServices({storage:createMemoryStorage()});
  const saved=services.storage.selfInterpretations.saveForRecord({
    record:record(),
    findingCode:"BODY_REGION_PAIR",
    findingLabel:"股関節部には、身体の記録と部位表示の両方があります",
    decision:"CONTINUE",
    nextLabel:"股関節部の外側を次回も記録",
    threadId:"thread-1",
    threadType:"REGION_OBSERVATION_PAIR",
    subject:{regionId:"BA-DISP-014",bodyAreaId:"BFR-200-COX"},
    userNote:"次も同じ場所を確認する",
    now:"2026-10-02T10:00:00.000Z",
  });
  assert.equal(saved.ok,true);
  const item=services.storage.selfInterpretations.findByRecordId("r1");
  assert.equal(item.decision,"CONTINUE");
  assert.equal(item.subject.regionId,"BA-DISP-014");
  assert.equal(item.userNote,"次も同じ場所を確認する");
  assert.equal("regionalValue" in item,false);
  assert.equal("rofJ" in item,false);
  assert.equal("score" in item,false);
});

await test("INTERPRETATION-NORMALIZER-REJECTS-INVALID-DECISION",()=>{
  const item=normalizeSelfInterpretation({
    id:"x",recordId:"r1",createdAt:"2026-10-02T10:00:00.000Z",
    findingCode:"OVERVIEW",findingLabel:"今回",decision:"IMPROVED",
  });
  assert.equal(item,null);
});

await test("INTERPRETATION-IS-PART-OF-USER-DATA-KEYS",()=>{
  assert.equal(typeof STORAGE_KEYS.selfInterpretations,"string");
  const services=createApplicationServices({storage:createMemoryStorage()});
  const saved=services.storage.selfInterpretations.saveForRecord({record:record(),findingCode:"OVERVIEW",findingLabel:"今回の記録を次回比較の基準として残せます",decision:"THIS_TIME_ONLY"});
  assert.equal(saved.ok,true);
  assert.equal(services.storage.selfInterpretations.loadAll().length,1);
  const cleared=services.dataManagement.clearAllUserData();
  assert.equal(cleared.ok,true);
  assert.equal(services.storage.selfInterpretations.loadAll().length,0);
});

await test("HISTORY-DELETE-AND-UNDO-PRESERVE-INTERPRETATION-LIFECYCLE",()=>{
  const services=createApplicationServices({storage:createMemoryStorage()});
  const created=services.workflows.records.saveRecordAndFeedback({
    id:"delete-interpretation-test",date:"2026-10-02",createdAt:"2026-10-02T09:00:00.000Z",
    activityType:"run",distanceKm:5,durationMinutes:30,runningFormat:"CONTINUOUS_RUN",stepsProvenance:"UNKNOWN",
    course:{name:"test",gradeKnowledge:"UNKNOWN",modelSurfaceClass:"UNKNOWN"},
  },{checkStatus:"deferred",bodyAreaObservations:[],safetyFlags:{}});
  assert.equal(created.ok,true,JSON.stringify(created));
  const id=created.record.id;
  const saved=services.storage.selfInterpretations.saveForRecord({record:created.record,findingCode:"OVERVIEW",findingLabel:"今回を確認",decision:"THIS_TIME_ONLY"});
  assert.equal(saved.ok,true);
  const deleted=services.workflows.history.deleteRecord(id);
  assert.equal(deleted.ok,true);
  assert.equal(services.storage.selfInterpretations.findByRecordId(id),null);
  const undone=services.workflows.history.undoDelete();
  assert.equal(undone.ok,true);
  assert.equal(services.storage.selfInterpretations.findByRecordId(id)?.findingLabel,"今回を確認");
});

const failed=results.filter((x)=>x.status==="FAIL");
console.log(JSON.stringify({suite:"Self Interpretation",total:results.length,passed:results.length-failed.length,failed:failed.length,status:failed.length?"FAIL":"PASS",results},null,2));
if(failed.length)process.exitCode=1;
