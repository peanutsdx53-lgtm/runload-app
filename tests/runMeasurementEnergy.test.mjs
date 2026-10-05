import assert from 'node:assert/strict';
import {
  RUN_ENERGY_MODEL_ID,
  estimateRunningEnergy,
  selectRunningMetBySpeed,
} from '../ui/mobileRunMeasurementEnergy.js';

const results = [];
function test(id, fn) {
  try { fn(); results.push({ id, status: 'PASS' }); }
  catch (error) { results.push({ id, status: 'FAIL', message: String(error?.stack || error) }); }
}

test('SPEED-SELECTS-OFFICIAL-2024-COMPENDIUM-BAND', () => {
  const category = selectRunningMetBySpeed(9.656064); // 6.0 mph
  assert.equal(category?.code, '12050');
  assert.equal(category?.met, 9.3);
  assert.equal(category?.mapping, 'official-range');
});

test('ESTIMATE-USES-STANDARD-MET-KCAL-CONVERSION', () => {
  const result = estimateRunningEnergy({
    bodyMassKg: 70,
    distanceKm: 4.828032,
    durationMs: 30 * 60 * 1000,
  });
  assert.equal(result.ok, true);
  assert.equal(result.modelId, RUN_ENERGY_MODEL_ID);
  assert.equal(result.compendiumCode, '12050');
  assert.equal(result.met, 9.3);
  assert.equal(result.estimatedKcal, 341.8);
  assert.equal(result.bodyMassKg, 70);
});

test('MISSING-BODY-MASS-DOES-NOT-FABRICATE-ENERGY', () => {
  const result = estimateRunningEnergy({ bodyMassKg: null, distanceKm: 5, durationMs: 30 * 60 * 1000 });
  assert.equal(result.ok, false);
  assert.equal(result.reason, 'BODY_MASS_UNAVAILABLE');
});

test('INSUFFICIENT-GPS-DISTANCE-DOES-NOT-FABRICATE-ENERGY', () => {
  const result = estimateRunningEnergy({ bodyMassKg: 60, distanceKm: 0.009, durationMs: 60 * 1000 });
  assert.equal(result.ok, false);
  assert.equal(result.reason, 'GPS_DISTANCE_INSUFFICIENT');
});

test('NON-RUNNING-AVERAGE-SPEED-IS-OUT-OF-SCOPE', () => {
  const result = estimateRunningEnergy({ bodyMassKg: 60, distanceKm: 1, durationMs: 60 * 60 * 1000 });
  assert.equal(result.ok, false);
  assert.equal(result.reason, 'SPEED_OUT_OF_SUPPORTED_RANGE');
});

test('HEIGHT-IS-NOT-AN-INPUT-TO-THE-INITIAL-MODEL', () => {
  const result = estimateRunningEnergy({
    bodyMassKg: 60,
    distanceKm: 3.218688,
    durationMs: 20 * 60 * 1000,
    heightCm: 210,
  });
  assert.equal(result.ok, true);
  assert.ok(!Object.hasOwn(result, 'heightCm'));
});

const failed = results.filter((item) => item.status !== 'PASS');
console.log(JSON.stringify({ suite: 'Mobile Measurement Energy Estimate', total: results.length, passed: results.length - failed.length, failed: failed.length, status: failed.length ? 'FAIL' : 'PASS', results }, null, 2));
if (failed.length) process.exit(1);
