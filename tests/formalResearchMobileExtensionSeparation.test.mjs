import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createApplicationServices, STORAGE_KEYS } from '../core/appCore.js';
import { normalizeMobileExtensionRecord, saveMobileExtensionRecord, listMobileExtensionRecords } from '../ui/mobileWalkJogRecordStore.js';
import { createMobileSegmentAnalysis } from '../ui/mobileWalkJogMeasurementWiring.js';
import { evaluateMobileWalkJogAllRegions, getMobileWalkJogRoute } from '../core/internal/mobileWalkJogSpeedModel.js';

const userStore=new Map();
const storage={getItem:k=>userStore.has(k)?userStore.get(k):null,setItem:(k,v)=>userStore.set(k,String(v)),removeItem:k=>userStore.delete(k)};
const apps=createApplicationServices({storage});
const pending={version:1,distanceKm:.9,durationMinutes:10,stepEstimate:{steps:1200},energyEstimate:{estimatedKcal:40},track:[],saveRoute:false};
const analysis=gait=>({version:1,modelVersion:'mobile-model',activityId:gait,segments:[{gaitId:gait,distanceKm:.9}],provisionalEnabled:false});

test('WALK record uses dedicated mobile extension store without formal 12-region side effect',()=>{
 const beforeFormal=apps.storage.gateway.readJson(STORAGE_KEYS.modelResultsRegionalV2,[]);
 const beforeRecords=apps.storage.gateway.readJson(STORAGE_KEYS.records,[]);
 const saved=saveMobileExtensionRecord({analysis:analysis('WALK'),pending,storage});
 assert.equal(saved.ok,true);
 assert.equal(saved.record.authority.scope,'SMARTPHONE_EXTENSION_ONLY');
 assert.equal(saved.record.authority.pcThesisCurrent,'UNCHANGED');
 assert.equal(saved.record.authority.runningCurrentInvoked,false);
 assert.equal(saved.record.energyEstimate,null);
 assert.equal(saved.record.stepEstimate.steps,1200);
 assert.deepEqual(apps.storage.gateway.readJson(STORAGE_KEYS.modelResultsRegionalV2,[]),beforeFormal);
 assert.deepEqual(apps.storage.gateway.readJson(STORAGE_KEYS.records,[]),beforeRecords);
 assert.equal(listMobileExtensionRecords(storage).length,1);
 assert.ok([...userStore.keys()].some(k=>k.includes('mobile-walk-jog-records')));
});

test('JOGGING and MIXED remain separate and never aggregate as RUNNING_CURRENT',()=>{
 for(const gait of ['JOGGING','MIXED']){
  const a=analysis(gait);
  if(gait==='MIXED')a.segments=[{gaitId:'WALK'},{gaitId:'JOGGING'}];
  const r=normalizeMobileExtensionRecord({analysis:a,pending,id:gait,createdAt:'2026-10-09T00:00:00Z'});
  assert.ok(r);
  assert.equal(r.authority.regionalAggregation,'NO_CROSS_GAIT_OR_CROSS_CONSTRUCT_AGGREGATION');
  assert.equal(r.authority.runningCurrentInvoked,false);
  assert.equal(r.energyEstimate,null);
 }
});

test('RUNNING_CURRENT is not an extension gait to be recomputed or saved',()=>{
 assert.equal(normalizeMobileExtensionRecord({analysis:analysis('RUNNING_CURRENT'),pending}),null);
 assert.equal(getMobileWalkJogRoute('RUNNING_CURRENT','R01'),null);
 assert.deepEqual(evaluateMobileWalkJogAllRegions({gaitId:'RUNNING_CURRENT',speedMps:2.5}),[]);
 const pointer=createMobileSegmentAnalysis({gaitId:'RUNNING_CURRENT',startDistanceKm:0,endDistanceKm:1,startElapsedSeconds:0,endElapsedSeconds:400});
 assert.equal(pointer.coverage.outputStatus,'USE_EXISTING_RUNNING_CURRENT_ENGINE');
 assert.equal(pointer.coverage.regions,null);
});

test('no extension-specific authority silently imported into formal primary engine',()=>{
 const src=fs.readFileSync(new URL('../core/internal/primaryModelResults.js',import.meta.url),'utf8');
 assert.doesNotMatch(src,/mobileWalkJogSpeedModel|mobileWalkJogRecordStore|mobileWalkJogMeasurementWiring/);
});
