import assert from 'node:assert/strict';
import { createApplicationServices, createMemoryStorage, STORAGE_KEYS } from '../core/runloadCore.js';
import {
  haversineDistanceMeters,
  evaluateTrackPoint,
  rollingPaceSecondsPerKm,
  averagePaceSecondsPerKm,
  plannedPaceSecondsPerKm,
  updatePaceWarningState,
  simplifyTrackForStorage,
} from '../ui/runMeasurementCore.js';

const results=[];
async function test(id,fn){try{await fn();results.push({id,status:'PASS'});}catch(error){results.push({id,status:'FAIL',message:error?.stack||String(error)});}}

await test('GPS-HAVERSINE-KNOWN-DISTANCE',()=>{
  const distance=haversineDistanceMeters({lat:0,lon:0},{lat:0,lon:1});
  assert.ok(Math.abs(distance-111194.9)<30);
});

await test('GPS-REJECTS-LOW-ACCURACY-FIRST-POINT',()=>{
  const result=evaluateTrackPoint(null,{lat:35,lon:140,timestamp:1000,accuracyM:80});
  assert.equal(result.accepted,false);
  assert.equal(result.reason,'LOW_ACCURACY');
});

await test('GPS-ACCEPTS-FIRST-ACCURATE-POINT',()=>{
  const result=evaluateTrackPoint(null,{lat:35,lon:140,timestamp:1000,accuracyM:8});
  assert.equal(result.accepted,true);
  assert.equal(result.reason,'FIRST_POINT');
});

await test('GPS-REJECTS-IMPLAUSIBLE-SEGMENT-SPEED',()=>{
  const previous={lat:35,lon:140,timestamp:1000,accuracyM:8};
  const current={lat:35.01,lon:140,timestamp:2000,accuracyM:8};
  const result=evaluateTrackPoint(previous,current);
  assert.equal(result.accepted,false);
  assert.equal(result.reason,'IMPLAUSIBLE_SPEED');
});

await test('GPS-ROLLING-AND-AVERAGE-PACE',()=>{
  const rolling=rollingPaceSecondsPerKm([
    {timestamp:1000,cumulativeDistanceM:0},
    {timestamp:21000,cumulativeDistanceM:400},
  ]);
  assert.equal(rolling,50);
  assert.equal(averagePaceSecondsPerKm(5000,30*60*1000),360);
});

await test('GPS-PLAN-PACE-USES-SAVED-DISTANCE-AND-TIME',()=>{
  assert.equal(plannedPaceSecondsPerKm({plannedSession:{distanceKm:5,durationMinutes:30}}),360);
  assert.equal(plannedPaceSecondsPerKm({plannedSession:{distanceKm:0,durationMinutes:30}}),null);
});

await test('GPS-PACE-WARNING-REQUIRES-CONTINUOUS-HOLD',()=>{
  const first=updatePaceWarningState({
    currentPaceSecondsPerKm:300,
    plannedPaceSecondsPerKm:360,
    now:1000,
    holdMs:10000,
  });
  assert.equal(first.shouldWarn,false);
  const held=updatePaceWarningState({
    currentPaceSecondsPerKm:300,
    plannedPaceSecondsPerKm:360,
    exceededAt:first.exceededAt,
    now:11000,
    holdMs:10000,
  });
  assert.equal(held.shouldWarn,true);
  const reset=updatePaceWarningState({
    currentPaceSecondsPerKm:400,
    plannedPaceSecondsPerKm:360,
    exceededAt:held.exceededAt,
    now:12000,
    holdMs:10000,
  });
  assert.equal(reset.exceededAt,null);
  assert.equal(reset.shouldWarn,false);
});

await test('GPS-STORED-TRACK-IS-CAPPED',()=>{
  const points=Array.from({length:3000},(_,index)=>({lat:35+index*1e-6,lon:140,timestamp:index}));
  const stored=simplifyTrackForStorage(points);
  assert.equal(stored.length,2000);
  assert.deepEqual(stored[0],{lat:35,lon:140,timestamp:0,accuracyM:null});
  assert.equal(stored.at(-1).timestamp,2999);
});

await test('GPS-ROUTE-FOLLOWS-RECORD-DELETE-AND-UNDO',()=>{
  const services=createApplicationServices({storage:createMemoryStorage()});
  const saved=services.workflows.records.saveRecordAndFeedback({
    id:'gps-delete-test',
    date:'2026-09-23',
    createdAt:'2026-09-23T08:00:00Z',
    activityType:'run',
    distanceKm:5,
    durationMinutes:30,
    runningFormat:'CONTINUOUS_RUN',
    stepsProvenance:'UNKNOWN',
    course:{gradeKnowledge:'UNKNOWN',modelSurfaceClass:'UNKNOWN'},
  },{checkStatus:'deferred',bodyAreaObservations:[],safetyFlags:{}});
  assert.equal(saved.ok,true,JSON.stringify(saved));

  const route={
    version:1,
    id:'measurement-gps-delete-test',
    recordId:'gps-delete-test',
    capturedAt:'2026-09-23T08:30:00Z',
    startedAt:'2026-09-23T08:00:00Z',
    endedAt:'2026-09-23T08:30:00Z',
    distanceKm:5,
    durationMinutes:30,
    planId:'',
    acceptedPointCount:2,
    rejectedPointCount:0,
    track:[
      {lat:35,lon:140,timestamp:1,accuracyM:5},
      {lat:35.001,lon:140.001,timestamp:2,accuracyM:5},
    ],
  };
  assert.equal(services.storage.gateway.writeJson(STORAGE_KEYS.runMeasurements,[route]).ok,true);

  const deleted=services.workflows.history.deleteRecord('gps-delete-test');
  assert.equal(deleted.ok,true,JSON.stringify(deleted));
  assert.deepEqual(services.storage.gateway.readJson(STORAGE_KEYS.runMeasurements,[]),[]);

  const restored=services.workflows.history.undoDelete();
  assert.equal(restored.ok,true,JSON.stringify(restored));
  const restoredRoutes=services.storage.gateway.readJson(STORAGE_KEYS.runMeasurements,[]);
  assert.equal(restoredRoutes.length,1);
  assert.equal(restoredRoutes[0].recordId,'gps-delete-test');
});

const failed=results.filter((item)=>item.status==='FAIL');
console.log(JSON.stringify({suite:'Run Measurement Core',total:results.length,passed:results.length-failed.length,failed:failed.length,status:failed.length?'FAIL':'PASS',results},null,2));
if(failed.length)process.exitCode=1;
