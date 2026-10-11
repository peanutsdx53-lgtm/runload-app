import test from 'node:test';
import assert from 'node:assert/strict';
import { haversineDistanceMeters, evaluateTrackPoint, simplifyTrackForStorage, isValidRecordedTrackPoint } from '../ui/runMeasurementCore.js';

const valid = { lat: 35, lon: 139, timestamp: 1700000000000, accuracyM: 5 };
const malformed = [
  { lat: null, lon: 139, timestamp: 1700000000000 },
  { lat: '', lon: 139, timestamp: 1700000000000 },
  { lat: false, lon: 139, timestamp: 1700000000000 },
  { lat: 35, lon: null, timestamp: 1700000000000 },
  { lat: 35, lon: '', timestamp: 1700000000000 },
  { lat: 35, lon: 139, timestamp: null },
  { lat: 35, lon: 139, timestamp: '' },
  { lat: 91, lon: 139, timestamp: 1700000000000 },
  { lat: 35, lon: 181, timestamp: 1700000000000 },
  { lat: Number.NaN, lon: 139, timestamp: 1700000000000 },
  { lat: Infinity, lon: 139, timestamp: 1700000000000 },
  null, {}, [], '35,139',
];

test('D05: malformed saved track rows never become synthetic geo points', () => {
  for (const item of malformed) {
    assert.equal(isValidRecordedTrackPoint(item), false, 'validation: ' + JSON.stringify(item));
    assert.equal(evaluateTrackPoint(null, item).accepted, false, 'first point: ' + JSON.stringify(item));
    assert.equal(simplifyTrackForStorage([item]).length, 0, 'archive: ' + JSON.stringify(item));
  }
});
test('D05: haversine rejects missing and out-of-range coordinates rather than measuring fake travel', () => {
  for (const item of malformed.filter(x => x && typeof x === 'object' && !(Number(x?.lat) === 35 && Number(x?.lon) === 139))) {
    assert.ok(Number.isNaN(haversineDistanceMeters(item, valid)), 'haversine: ' + JSON.stringify(item));
  }
});
test('D05: malformed recorded precision is rejected rather than accepting a plausible fix', () => {
  for (const accuracyM of [-1, '', false, 'bad', Number.POSITIVE_INFINITY]) {
    assert.equal(evaluateTrackPoint(null, { ...valid, accuracyM }).accepted, false);
  }
  assert.equal(evaluateTrackPoint(null, { ...valid, accuracyM: 0 }).accepted, true);
});
test('D05: true 0° lat/lon and timestamp 0 remain valid while optional accuracy stays unknown', () => {
  const zero = { lat: 0, lon: 0, timestamp: 0, accuracyM: null };
  assert.equal(isValidRecordedTrackPoint(zero), true);
  assert.equal(evaluateTrackPoint(null, zero).accepted, true);
  assert.equal(simplifyTrackForStorage([zero]).length, 1);
  assert.equal(simplifyTrackForStorage([zero])[0].accuracyM, null);
  assert.equal(haversineDistanceMeters(zero, zero), 0);
});
test('D05: known historic JSON numeric strings preserved if nonempty and finite', () => {
  const historic = { lat: '35', lon: '139', timestamp: '1700000000000', accuracyM: '5' };
  assert.equal(isValidRecordedTrackPoint(historic), true);
  assert.equal(simplifyTrackForStorage([historic]).length, 1);
});
