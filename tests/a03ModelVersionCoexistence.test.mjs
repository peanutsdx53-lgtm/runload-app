
import test from "node:test";
import assert from "node:assert/strict";
import {createApplicationServices,createMemoryStorage} from "../core/appCore.js";
import {internalModules} from "../core/internal/modules.js";
const vOld="runload-primary-regional-reference100-v3.0";
const vNew="runload-primary-regional-reference100-v3.1";
const sOld="runload-primary-regional-reference100-output-v3.0";
const sNew="runload-primary-regional-reference100-output-v3.1";
const record={id:"case1",date:"2026-10-10",createdAt:"2026-10-10T00:00:00.000Z",activityType:"run",distanceKm:6,durationMinutes:40,runningFormat:"CONTINUOUS_RUN",stepsProvenance:"UNKNOWN",course:{gradeKnowledge:"UNKNOWN",modelSurfaceClass:"UNKNOWN"}};
const feedback={checkStatus:"deferred",bodyAreaObservations:[],safetyFlags:{}};
function setup(){
 const svc=createApplicationServices({storage:createMemoryStorage()});
 assert.equal(svc.workflows.records.saveRecordAndFeedback(record,feedback).ok,true);
 return svc;
}
function asPrevious(x){
 const y=structuredClone(x);y.id=y.id.replace("v3.1-result","v3-result");
 y.model_version=vOld;y.output_semantic_version=sOld;
 y.result.model_version=vOld;y.result.outputSemanticVersion=sOld;
 for(const sig of Object.values(y.comparison_signatures)){sig.modelVersion=vOld;sig.outputSemanticVersion=sOld;}
 return y;
}
test("previous results coexist and are never directly comparable",()=>{
 const svc=setup(),current=svc.workflows.records.loadExperience("case1").regionalV2ResultRecord,previous=asPrevious(current);
 assert.equal(current.model_version,vNew);assert.equal(current.output_semantic_version,sNew);
 assert.notEqual(previous.id,current.id);
 assert.equal(svc.storage.modelResultsRegionalV2.saveAll([current,previous]).ok,true);
 assert.deepEqual(svc.storage.modelResultsRegionalV2.loadAll().find(x=>x.id===previous.id),previous);
 assert.equal(svc.storage.modelResultsRegionalV2.loadAll().length,2);
 const a=previous.comparison_signatures["BA-DISP-014"],b=current.comparison_signatures["BA-DISP-014"];
 assert.equal(internalModules.primaryRegionalResultService.comparePrimaryRegionalV2Signatures(a,b).directDeltaAllowed,false);
 assert.equal(svc.workflows.records.loadExperience("case1").regionalV2ResultRecord.model_version,vNew);
});
test("v3.0 backup imports without modifying the previously saved result",()=>{
 const svc=setup(),previous=asPrevious(svc.workflows.records.loadExperience("case1").regionalV2ResultRecord);
 assert.equal(svc.storage.modelResultsRegionalV2.saveAll([previous]).ok,true);
 const orig=JSON.stringify(svc.storage.modelResultsRegionalV2.loadAll());
 const backup=svc.storage.backup.createBackupSnapshot();
 const checked=svc.storage.backup.validateBackupSnapshot(backup);
 assert.equal(checked.canRestore,true,JSON.stringify(checked.issues));
 const dst=createApplicationServices({storage:createMemoryStorage()});
 const result=dst.storage.backup.restoreBackupText(JSON.stringify(backup));
 assert.equal(result.ok,true,JSON.stringify(result));
 assert.equal(JSON.stringify(dst.storage.modelResultsRegionalV2.loadAll()),orig);
});
