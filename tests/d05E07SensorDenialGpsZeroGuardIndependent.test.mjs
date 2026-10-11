import test from 'node:test';
import assert from 'node:assert/strict';
import { createMotionStepEstimator } from '../ui/mobileRunMeasurementAutoRecord.js';
import { normalizeGeolocationPosition, evaluateTrackPoint } from '../ui/runMeasurementCore.js';

const coords = (latitude, longitude, accuracy = 5) => ({ coords: { latitude, longitude, accuracy }, timestamp: 1700000000000 });

test('D-05: absent/null/non-numeric GPS coordinate cannot become fictional 0 latitude/longitude', () => {
  for (const input of [null, {}, { coords: {} }, coords(null, 139), coords(35, null), coords('', 139), coords(35, ''), coords('35', 139), coords(35, '139'), coords(91, 139), coords(-91, 139), coords(35, 181), coords(35, -181), coords(Number.NaN, 139), coords(35, Infinity)]) {
    assert.equal(normalizeGeolocationPosition(input), null, JSON.stringify(input));
  }
  assert.deepEqual([normalizeGeolocationPosition(coords(0, 0))?.lat, normalizeGeolocationPosition(coords(0, 0))?.lon], [0, 0], 'Real coordinate origin must remain valid');
  assert.equal(evaluateTrackPoint(null, normalizeGeolocationPosition(coords(null, 139))).accepted, false);
});

test('D-05: absent GPS accuracy cannot be synthesized as reliable zero-meter precision', () => {
  for (const accuracy of [null, undefined, '', '0', -1, Infinity, NaN]) {
    const pos = { coords: { latitude: 35, longitude: 139, accuracy }, timestamp: Date.now() };
    assert.equal(normalizeGeolocationPosition(pos), null, `accuracy ${String(accuracy)} must be rejected`);
  }
  assert.equal(normalizeGeolocationPosition(coords(35, 139, 0))?.accuracyM, 0, 'genuine reported precision zero is valid');
});

test('E-07: denied DeviceMotionEvent getter never throws or asserts success', async () => {
  const target = { addEventListener(){throw Error('must not add');} };
  Object.defineProperty(target, 'DeviceMotionEvent', { get(){throw Object.assign(Error('blocked'), {name:'SecurityError'});} });
  const estimator = createMotionStepEstimator(target);
  assert.deepEqual(await estimator.start(), {ok:false,status:'DENIED'});
  assert.equal(estimator.snapshot(60000), null);
  assert.equal(estimator.liveSteps(), null);
  assert.equal(estimator.status(), 'DENIED');
});

test('E-07: throwing motion listener registration fails closed with no steps or active status', async () => {
  let addCalls=0;
  const estimator = createMotionStepEstimator({DeviceMotionEvent:class{},addEventListener(){addCalls++;throw new DOMException('blocked','SecurityError');}});
  assert.deepEqual(await estimator.start(), {ok:false,status:'DENIED'});
  assert.equal(estimator.snapshot(60000), null);
  assert.equal(estimator.liveSteps(), null);
  assert.equal(estimator.status(), 'DENIED');
  assert.equal(addCalls,1);
});

test('E-07: motion permission rejected/denied is not conflated with a step estimate', async () => {
  for(const mode of ['denied','reject','throw']) {
    let adds=0;
    class Event {}
    Event.requestPermission = mode==='throw' ? ()=>{throw Error('blocked')} : mode==='reject' ? ()=>Promise.reject(Error('blocked')) : ()=>Promise.resolve('denied');
    const estimator=createMotionStepEstimator({DeviceMotionEvent:Event,addEventListener(){adds++}});
    assert.deepEqual(await estimator.start(),{ok:false,status:'DENIED'});
    assert.equal(adds,0);
    assert.equal(estimator.snapshot(60000),null);
  }
});

test('E-07: revoked permission during motion listener cleanup cannot block navigation', async () => {
  const target={DeviceMotionEvent:class{},addEventListener(){},removeEventListener(){throw new DOMException('revoked','SecurityError')}};
  const estimator=createMotionStepEstimator(target);
  assert.equal((await estimator.start()).ok,true);
  assert.doesNotThrow(()=>estimator.stop());
  assert.equal(estimator.liveSteps(),null);
  assert.equal(estimator.snapshot(60000),null);
  assert.equal(estimator.status(),'STOPPED');
});
