import fs from 'node:fs';
import assert from 'node:assert/strict';
import {
  COURSE_ANALYSIS_MODEL_ID,
  STEP_ESTIMATE_MODEL_ID,
  analyzeMeasuredCourse,
  createMotionStepEstimator,
} from '../ui/runMeasurementAutoRecord.js';

const stateText = fs.readFileSync('ui/runMeasurementState.js', 'utf8');
const interactionText = fs.readFileSync('ui/interactions/runMeasurementInteractions.js', 'utf8');
const screenText = fs.readFileSync('screens/runMeasurementScreen.js', 'utf8');
const autofillText = fs.readFileSync('ui/mobileMeasurementRecordAutofill.js', 'utf8');
const coreText = fs.readFileSync('ui/runMeasurementCore.js', 'utf8');
const indexText = fs.readFileSync('index.html', 'utf8');
const workerText = fs.readFileSync('service-worker.js', 'utf8');

const results = [];
async function test(id, fn) {
  try { await fn(); results.push({ id, status: 'PASS' }); }
  catch (error) { results.push({ id, status: 'FAIL', message: String(error?.stack || error) }); }
}

await test('DEVICE-MOTION-STEP-ESTIMATE-IS-EXPLICITLY-ESTIMATED', async () => {
  const listeners = new Map();
  const target = {
    DeviceMotionEvent: class DeviceMotionEvent {},
    performance: { now: () => 0 },
    addEventListener: (name, handler) => listeners.set(name, handler),
    removeEventListener: (name) => listeners.delete(name),
  };
  const estimator = createMotionStepEstimator(target);
  const started = await estimator.start();
  assert.equal(started.ok, true);
  const emit = (signal, timeStamp) => listeners.get('devicemotion')?.({ acceleration: { x: signal, y: 0, z: 0 }, timeStamp });
  emit(2, 1000); emit(0, 1100);
  emit(2, 1400); emit(0, 1500);
  emit(2, 1800); emit(0, 1900);
  emit(2, 2200); emit(0, 2300);
  const snapshot = estimator.snapshot(60000);
  assert.equal(snapshot?.modelId, STEP_ESTIMATE_MODEL_ID);
  assert.equal(snapshot?.method, 'DEVICE_MOTION_ESTIMATE');
  assert.equal(snapshot?.steps, 4);
  assert.equal(snapshot?.cadenceSpm, 4);
  estimator.stop();
});

await test('PAUSE-STOPS-STEP-ACCUMULATION', async () => {
  const listeners = new Map();
  const target = {
    DeviceMotionEvent: class DeviceMotionEvent {},
    addEventListener: (name, handler) => listeners.set(name, handler),
    removeEventListener: (name) => listeners.delete(name),
  };
  const estimator = createMotionStepEstimator(target);
  await estimator.start();
  const emit = (signal, timeStamp) => listeners.get('devicemotion')?.({ acceleration: { x: signal, y: 0, z: 0 }, timeStamp });
  emit(2, 1000); emit(0, 1100);
  estimator.pause();
  emit(2, 1400); emit(0, 1500);
  estimator.resume();
  emit(2, 1800); emit(0, 1900);
  emit(2, 2200); emit(0, 2300);
  emit(2, 2600); emit(0, 2700);
  assert.equal(estimator.snapshot(60000)?.steps, 4);
  estimator.stop();
});

await test('GPS-ONE-WAY-COURSE-IS-AUTO-ANALYZED-WITH-SURFACE-UNKNOWN', async () => {
  const track = Array.from({ length: 5 }, (_, index) => ({
    lat: 35,
    lon: 139 + index * 0.001,
    timestamp: index * 60000,
    altitudeM: 10,
    altitudeAccuracyM: 5,
  }));
  const result = analyzeMeasuredCourse({ track, durationMs: 24 * 60 * 1000 });
  assert.equal(result?.modelId, COURSE_ANALYSIS_MODEL_ID);
  assert.equal(result?.routePattern, 'ONE_WAY');
  assert.equal(result?.gradeKnowledge, 'KNOWN_PROFILE');
  assert.equal(result?.flatPercent, 100);
  assert.equal(result?.surfaceInputMode, 'UNKNOWN');
  assert.equal(result?.modelSurfaceClass, 'UNKNOWN');
  assert.equal(result?.pavedPercent, 0);
});

await test('GPS-LOOP-COURSE-IS-DETECTED-CONSERVATIVELY', async () => {
  const track = [
    { lat: 35, lon: 139, altitudeM: 10, altitudeAccuracyM: 5 },
    { lat: 35, lon: 139.001, altitudeM: 10, altitudeAccuracyM: 5 },
    { lat: 35.001, lon: 139.001, altitudeM: 10, altitudeAccuracyM: 5 },
    { lat: 35.001, lon: 139, altitudeM: 10, altitudeAccuracyM: 5 },
    { lat: 35, lon: 139, altitudeM: 10, altitudeAccuracyM: 5 },
  ].map((point, index) => ({ ...point, timestamp: index * 60000 }));
  const result = analyzeMeasuredCourse({ track, durationMs: 20 * 60 * 1000 });
  assert.equal(result?.routePattern, 'LOOP');
});

await test('COURSE-ANALYSIS-USES-MEASUREMENT-DISTANCE-INSTEAD-OF-READDING-SMALL-GPS-MOVES', async () => {
  const track = Array.from({ length: 11 }, (_, index) => ({
    lat: 35,
    lon: 139 + index * 0.00002,
    timestamp: index * 6000,
    cumulativeDistanceM: index,
  }));
  const result = analyzeMeasuredCourse({ track, durationMs: 60 * 1000 });
  assert.equal(result?.distanceKm, 0.01);
});

await test('IMPLAUSIBLE-GRADE-SEGMENTS-DO-NOT-COUNT-AS-ELEVATION-COVERAGE-OR-FLAT', async () => {
  const track = Array.from({ length: 7 }, (_, index) => ({
    lat: 35,
    lon: 139 + index * 0.0001,
    timestamp: index * 10000,
    cumulativeDistanceM: index * 10,
    altitudeM: index * 100,
    altitudeAccuracyM: 5,
  }));
  const result = analyzeMeasuredCourse({ track, durationMs: 60 * 1000 });
  assert.equal(result?.elevationCoverage, 0);
  assert.equal(result?.gradeKnowledge, 'UNKNOWN');
  assert.equal(result?.flatPercent, null);
  assert.equal(result?.elevationGainM, null);
});

await test('MISSING-ALTITUDE-DOES-NOT-FABRICATE-SLOPE', async () => {
  const track = Array.from({ length: 5 }, (_, index) => ({ lat: 35, lon: 139 + index * 0.001, timestamp: index * 60000 }));
  const result = analyzeMeasuredCourse({ track, durationMs: 20 * 60 * 1000 });
  assert.equal(result?.gradeKnowledge, 'UNKNOWN');
  assert.equal(result?.elevationGainM, null);
  assert.equal(result?.flatPercent, null);
});

await test('ALTITUDE-IS-PRESERVED-FOR-POST-RUN-COURSE-ANALYSIS', async () => {
  assert.ok(coreText.includes('altitudeAccuracyM'));
  assert.ok(coreText.includes('altitudeM: finite(point.altitudeM)'));
  assert.ok(coreText.includes('altitudeAccuracyM: finite(point.altitudeAccuracyM)'));
});

await test('MEASUREMENT-PERSISTS-STEPS-AND-COURSE-ANALYSIS-SEPARATELY', async () => {
  assert.ok(interactionText.includes('createMotionStepEstimator'));
  assert.ok(interactionText.includes('analyzeMeasuredCourse({ track, durationMs: elapsed })'));
  assert.ok(interactionText.includes('stepEstimate,'));
  assert.ok(interactionText.includes('courseAnalysis,'));
  assert.ok(stateText.includes('function normalizeStepEstimate'));
  assert.ok(stateText.includes('function normalizeCourseAnalysis'));
  assert.ok(stateText.includes('stepEstimate: normalizeStepEstimate(payload.stepEstimate)'));
  assert.ok(stateText.includes('courseAnalysis: normalizeCourseAnalysis(payload.courseAnalysis)'));
});

await test('SMARTPHONE-UI-SHOWS-AUTO-FACTS-AND-KEEPS-SURFACE-MANUAL', async () => {
  assert.ok(screenText.includes('推定歩数'));
  assert.ok(screenText.includes('data-measurement-post-course'));
  assert.ok(screenText.includes('路面は自動判定しません'));
  assert.ok(screenText.includes('路面はGPSから決めず'));
});

await test('MEASUREMENT-RECORD-AUTOFILL-IS-MOBILE-ONLY', async () => {
  assert.ok(autofillText.includes('max-width: 54.99rem'));
  assert.ok(autofillText.includes('parameters.get("measurement") !== "1"'));
  assert.ok(autofillText.includes('setValue(form, "stepsProvenance", "ESTIMATED")'));
  assert.ok(autofillText.includes('setValue(form, "surfaceInputMode", "UNKNOWN")'));
  assert.ok(autofillText.includes('name="savePlanCourseToLibrary" value="1"'));
  assert.ok(indexText.includes('./ui/mobileMeasurementRecordAutofill.js'));
  assert.ok(workerText.includes('"./ui/mobileMeasurementRecordAutofill.js"'));
  assert.ok(workerText.includes('"./ui/runMeasurementAutoRecord.js"'));
});

const failed = results.filter((item) => item.status !== 'PASS');
console.log(JSON.stringify({ suite: 'Mobile Measurement Auto Record', total: results.length, passed: results.length - failed.length, failed: failed.length, status: failed.length ? 'FAIL' : 'PASS', results }, null, 2));
if (failed.length) process.exit(1);
