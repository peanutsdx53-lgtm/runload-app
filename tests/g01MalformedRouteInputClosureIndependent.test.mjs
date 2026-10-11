import test from 'node:test';
import assert from 'node:assert/strict';
import { renderPlanScreenWithPresentation } from '../screens/planScreen.js';
import { buildWorkspace } from '../screens/historyScreen.js';
import { bindSimulation } from '../ui/interactions/simulationInteractions.js';

const context = () => ({parameters: new URLSearchParams('')});

test('G01: a corrupt row in saved plans and records cannot blank the plan screen', () => {
  const s = {
    storage:{
      records:{loadAll:()=>[null,{id:'run-safe',date:'2026-10-11',activityType:'run',distanceKm:5,durationMinutes:32}]},
      plans:{loadAll:()=>[null,{id:'plan-safe',scheduledDate:'2026-10-12',planType:'rest',plannedSession:{activityType:'rest'}}],findById:()=>null},
      selfUnderstandingThreads:{loadAll:()=>[null,{id:'thread-ok',userState:'NOT_WATCHING'}]},
    },
    workflows:{records:{loadAllExperiences:()=>[]}},
  };
  const html=renderPlanScreenWithPresentation({services:s,context:context()});
  assert.match(html,/screen--plan/);
  assert.match(html,/plan-safe/);
  assert.doesNotMatch(html,/data-plan-id="null"/);
});

test('G01: a malformed regional row collection cannot crash the history workspace', () => {
  const rec={id:'record-good',date:'2026-10-11',activityType:'run',distanceKm:4,durationMinutes:25};
  const experiences=[{record:rec, feedback:{bodyAreaObservations:[]}, regionalV2ResultRecord:{model_version:'HISTORIC_UNKNOWN',result:{regions:{R01:'invalid-shape'}}}}];
  const s={workflows:{records:{loadAllExperiences:()=>experiences}},storage:{plans:{loadAll:()=>[]},modelResultsRegionalV2:{latestByRecord:()=>new Map()}}};
  const w=buildWorkspace(s,context());
  assert.equal(w.rows.length,1);
  assert.equal(w.rows[0].row,null);
});

test('G01: a malformed regional result collection cannot break the simulation binder', () => {
  const oldDocument=globalThis.document,oldFormData=globalThis.FormData;
  const form={
    querySelector(selector){
      if(selector==='[name="sourceRecordId"]') return {value:''};
      if(selector==='[data-simulation-run-walk]') return {hidden:false};
      return null;
    },
    querySelectorAll(){return [];},
    addEventListener(){},
    closest(){return null;},
  };
  const target={innerHTML:'',querySelector(){return null;}};
  globalThis.document={getElementById:id=>id==='simulation-form'?form:id==='simulation-result'?target:null,querySelector:()=>null};
  globalThis.FormData=class {get(name){return {distanceKm:'5',durationMinutes:'30',runningFormat:'CONTINUOUS_RUN',courseJson:'{}',sourceConditionJson:'{}',sourceEngineInputJson:'{}'}[name]??null;}};
  try {
    const services={
      workflows:{records:{loadLatestExperience:()=>({regionalV2ResultRecord:{result:{regions:[null,{regionId:'BA-DISP-001',value:101}]}}})}},
      model:{primaryRegionalV2:{calculatePrimaryRegionalV2:()=>({regions:{},state:'NO_OUTPUT'})}},
    };
    bindSimulation({services});
    assert.match(target.innerHTML,/simulation-result|simulation/);
  } finally {
    if(oldDocument===undefined) delete globalThis.document; else globalThis.document=oldDocument;
    if(oldFormData===undefined) delete globalThis.FormData; else globalThis.FormData=oldFormData;
  }
});
