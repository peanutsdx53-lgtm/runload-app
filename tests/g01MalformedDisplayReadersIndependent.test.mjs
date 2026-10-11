import test from 'node:test';
import assert from 'node:assert/strict';
import { renderBodyTimelineScreen } from '../screens/bodyTimelineScreen.js';
import { renderSimulationScreenWithPresentation } from '../screens/simulationScreen.js';
import { findSavedRunMeasurement } from '../ui/runMeasurementState.js';
import { PRIMARY_REGIONAL_V2_MODEL_VERSION } from '../core/appCore.js';

const params=(recordId='')=>({parameters:new URLSearchParams(recordId ? `recordId=${encodeURIComponent(recordId)}` : '')});
const record={id:'run-valid',date:'2026-10-11',createdAt:'2026-10-11T09:00:00Z',activityType:'run',distanceKm:3,durationMinutes:20};

test('G01: corrupted regional result rows do not crash body-timeline rendering',()=>{
  const experience={record,regionalV2ResultRecord:{model_version:PRIMARY_REGIONAL_V2_MODEL_VERSION,result:{regions:{value:99}}}};
  const services={workflows:{records:{loadAllExperiences:()=>[experience]}}};
  const html=renderBodyTimelineScreen({services,context:params('run-valid')});
  assert.match(html,/data-body-timeline-card/);
  assert.match(html,/数値なし/);
  services.workflows.records.loadAllExperiences=()=>[{...experience,regionalV2ResultRecord:{...experience.regionalV2ResultRecord,result:{regions:[null,{regionId:'BA-DISP-014',value:101}]}}}];
  assert.match(renderBodyTimelineScreen({services,context:params()}),/data-body-timeline-card/);
  services.workflows.records.loadAllExperiences=()=>null;
  assert.match(renderBodyTimelineScreen({services,context:params()}),/表示できる走行記録がまだありません/);
});

test('G01: malformed records among saved records do not crash simulation fallback',()=>{
  const services={storage:{records:{loadAll:()=>[null, 0, {}, {activityType:'walk'}]}}};
  const html=renderSimulationScreenWithPresentation({services,context:params()});
  assert.match(html,/比較元の記録がありません/);
  services.storage.records.loadAll=()=>null;
  assert.match(renderSimulationScreenWithPresentation({services,context:params()}),/比較元の記録がありません/);
});

test('G01: invalid saved GPS entries cannot suppress a later valid measurement',()=>{
  const previous=Object.getOwnPropertyDescriptor(globalThis,'localStorage');
  const key='runner-load-app-new-v1-run-measurements-v1';
  const good={recordId:'run-valid',track:[{lat:35,lon:139},{lat:35.1,lon:139.1}]};
  try {
    Object.defineProperty(globalThis,'localStorage',{configurable:true,value:{getItem:(k)=>k===key?JSON.stringify([null,false,'damaged',good]):null}});
    assert.deepEqual(findSavedRunMeasurement('run-valid'),good);
    assert.equal(findSavedRunMeasurement('unknown'),null);
  } finally {
    if(previous) Object.defineProperty(globalThis,'localStorage',previous);
    else delete globalThis.localStorage;
  }
});
