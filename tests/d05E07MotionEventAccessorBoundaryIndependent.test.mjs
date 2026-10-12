import test from 'node:test';
import assert from 'node:assert/strict';
import { createMotionStepEstimator } from '../ui/mobileRunMeasurementAutoRecord.js';

function makeHarness() {
  const handlers = new Map();
  const target = {
    DeviceMotionEvent: { requestPermission: async () => 'granted' },
    performance: { now: () => 1000 },
    addEventListener(name, handler) { handlers.set(name, handler); },
    removeEventListener(name) { handlers.delete(name); },
  };
  return { target, handlers };
}
function throwing(property) {
  return Object.defineProperty({}, property, {
    get() { throw new DOMException('permission revoked', 'SecurityError'); },
  });
}
test('D05/E07 denied acceleration getter cannot throw from DOM listener',async()=>{
  const {target,handlers}=makeHarness();
  const estimator=createMotionStepEstimator(target);
  assert.equal((await estimator.start()).ok,true);
  assert.doesNotThrow(()=>handlers.get('devicemotion')(throwing('acceleration')));
  assert.equal(estimator.liveSteps(),0);
  assert.equal(estimator.snapshot(60000),null);
  estimator.stop();
});
test('D05/E07 denied gravity fallback getter cannot throw from DOM listener',async()=>{
  const {target,handlers}=makeHarness();
  const estimator=createMotionStepEstimator(target);
  await estimator.start();
  const event=throwing('accelerationIncludingGravity');event.acceleration=null;
  assert.doesNotThrow(()=>handlers.get('devicemotion')(event));
  assert.equal(estimator.snapshot(60000),null);
  estimator.stop();
});
test('D05/E07 denied timestamp getter cannot throw or create steps',async()=>{
  const {target,handlers}=makeHarness();
  const estimator=createMotionStepEstimator(target);
  await estimator.start();
  const event=throwing('timeStamp');event.acceleration={x:2,y:0,z:0};
  assert.doesNotThrow(()=>handlers.get('devicemotion')(event));
  assert.equal(estimator.liveSteps(),0);
  assert.equal(estimator.snapshot(60000),null);
  estimator.stop();
});
test('D05/E07 throwing permission function getter returns controlled DENIED',async()=>{
  const {target,handlers}=makeHarness();
  Object.defineProperty(target.DeviceMotionEvent,'requestPermission',{get(){throw new DOMException('denied','SecurityError')}});
  const estimator=createMotionStepEstimator(target);
  await assert.doesNotReject(async()=>assert.deepEqual(await estimator.start(),{ok:false,status:'DENIED'}));
  assert.equal(handlers.size,0);
  assert.equal(estimator.snapshot(60000),null);
});
test('D05/E07 throwing event registration getter returns controlled DENIED',async()=>{
  const {target,handlers}=makeHarness();
  Object.defineProperty(target,'addEventListener',{get(){throw new DOMException('denied','SecurityError')}});
  const estimator=createMotionStepEstimator(target);
  await assert.doesNotReject(async()=>assert.deepEqual(await estimator.start(),{ok:false,status:'DENIED'}));
  assert.equal(handlers.size,0);
  assert.equal(estimator.snapshot(60000),null);
});
test('D05/E07 normal sample still counts after a rejected accessor sample',async()=>{
  const {target,handlers}=makeHarness();
  const estimator=createMotionStepEstimator(target);
  await estimator.start();
  assert.doesNotThrow(()=>handlers.get('devicemotion')(throwing('acceleration')));
  handlers.get('devicemotion')({acceleration:{x:2,y:0,z:0},timeStamp:1500});
  assert.equal(estimator.liveSteps(),1);
  estimator.stop();
});
