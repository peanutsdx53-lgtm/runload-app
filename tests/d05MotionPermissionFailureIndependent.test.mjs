import test from 'node:test';
import assert from 'node:assert/strict';
import { createMotionStepEstimator } from '../ui/mobileRunMeasurementAutoRecord.js';

const mock = (config={}) => {
  const listeners = new Map();
  const t = {
    DeviceMotionEvent: config.motion === false ? undefined : { requestPermission: async () => config.permission ?? 'granted' },
    addEventListener(name, fn) { if (config.failListen) throw new DOMException('denied','SecurityError'); listeners.set(name,fn); },
    removeEventListener(name) { if (config.failRemove) throw new DOMException('denied','SecurityError'); listeners.delete(name); },
    performance:{now:()=>2000},
  };
  return {target:t,listeners};
};

test('D05 motion API absent: no invented steps',async()=>{
  const {target}=mock({motion:false});const est=createMotionStepEstimator(target);
  assert.deepEqual(await est.start(),{ok:false,status:'UNAVAILABLE'});
  assert.equal(est.snapshot(60000),null);assert.equal(est.liveSteps(),null);
});
test('D05 motion getter rejects: explicit denied',async()=>{
  const {target}=mock();Object.defineProperty(target,'DeviceMotionEvent',{get(){throw new DOMException('denied','SecurityError')}});
  const est=createMotionStepEstimator(target);assert.deepEqual(await est.start(),{ok:false,status:'DENIED'});assert.equal(est.snapshot(60000),null);
});
test('D05 permission denied: never attaches listener',async()=>{
  const {target,listeners}=mock({permission:'denied'});const est=createMotionStepEstimator(target);
  assert.deepEqual(await est.start(),{ok:false,status:'DENIED'});assert.equal(listeners.size,0);assert.equal(est.snapshot(60000),null);
});
test('D05 permission request rejects: never attaches listener',async()=>{
  const {target,listeners}=mock();target.DeviceMotionEvent.requestPermission=async()=>{throw new DOMException('fail','NotAllowedError')};
  const est=createMotionStepEstimator(target);assert.deepEqual(await est.start(),{ok:false,status:'DENIED'});assert.equal(listeners.size,0);
});
test('D05 addEventListener denied: fails closed',async()=>{
  const {target}=mock({failListen:true});const est=createMotionStepEstimator(target);
  assert.deepEqual(await est.start(),{ok:false,status:'DENIED'});assert.equal(est.snapshot(60000),null);
});
test('D05 accessible but no real samples: estimate null',async()=>{
  const {target,listeners}=mock();const est=createMotionStepEstimator(target);
  assert.deepEqual(await est.start(),{ok:true,status:'ACTIVE'});assert.equal(est.liveSteps(),0);assert.equal(est.snapshot(60000),null);
  listeners.get('devicemotion')?.({acceleration:null,accelerationIncludingGravity:null,timeStamp:1000});
  assert.equal(est.snapshot(60000),null);est.stop();assert.equal(est.status(),'STOPPED');
});
test('D05 paused sensor cannot fabricate a step',async()=>{
  const {target,listeners}=mock();const est=createMotionStepEstimator(target);await est.start();est.pause();
  listeners.get('devicemotion')?.({acceleration:{x:5,y:0,z:0},timeStamp:1000});
  assert.equal(est.liveSteps(),0);assert.equal(est.snapshot(60000),null);
});
test('D05 revoked permission on cleanup: stop still safe and inactive',async()=>{
  const {target,listeners}=mock({failRemove:true});const est=createMotionStepEstimator(target);await est.start();est.stop();
  assert.equal(est.status(),'STOPPED');assert.equal(est.liveSteps(),null);
  listeners.get('devicemotion')?.({acceleration:{x:5,y:0,z:0},timeStamp:1000});
  assert.equal(est.snapshot(60000),null);
});
