import test from 'node:test';
import assert from 'node:assert/strict';
import { createApplicationServices, createMemoryStorage, STORAGE_KEYS } from '../core/appCore.js';

const services = createApplicationServices({ storage: createMemoryStorage() });
const saved = services.workflows.records.saveRecordAndFeedback({
  id: 'audit-gps-restore-record',
  date: '2026-10-09',
  createdAt: '2026-10-09T00:00:00Z',
  activityType: 'run',
  distanceKm: 5,
  durationMinutes: 30,
  runningFormat: 'CONTINUOUS_RUN',
  stepsProvenance: 'UNKNOWN',
  course: { gradeKnowledge: 'UNKNOWN', modelSurfaceClass: 'UNKNOWN' },
}, { checkStatus: 'deferred', bodyAreaObservations: [], safetyFlags: {} });
assert.equal(saved.ok, true);
const backup = services.storage.backup;
const original = backup.createBackupSnapshot();
const measureKey = STORAGE_KEYS.runMeasurements;

function payload(point) {
  const route = {
    id: 'audit-gps-restore-measurement',
    version: 1,
    recordId: 'audit-gps-restore-record',
    capturedAt: '2026-10-09T00:00:00Z',
    track: [point, { lat: 35.001, lon: 139.001, timestamp: 1000 }],
  };
  return { ...original, data: { ...original.data, [measureKey]: [route] } };
}

const valid = [
  ['true equator and Greenwich origin', { lat: 0, lon: 0, timestamp: 0 }],
  ['negative decimal coordinates', { lat: -35.3, lon: -139.2, timestamp: 200 }],
  ['latitude/longitude upper bounds', { lat: 90, lon: 180, timestamp: 1 }],
  ['legacy explicit decimal strings', { lat: '35.001', lon: '139.02', timestamp: '100' }],
  ['legacy explicit zero strings', { lat: '0', lon: '0', timestamp: '0' }],
];
for (const [name, point] of valid) test(`valid ${name}`, () => {
  const inspection = backup.validateBackupSnapshot(payload(point));
  assert.equal(inspection.canRestore, true, JSON.stringify(inspection.issues));
});
const invalid = [
  ['null latitude', { lat: null, lon: 139, timestamp: 1 }],
  ['missing latitude', { lon: 139, timestamp: 1 }],
  ['empty latitude', { lat: '', lon: 139, timestamp: 1 }],
  ['whitespace latitude', { lat: '   ', lon: 139, timestamp: 1 }],
  ['false latitude', { lat: false, lon: 139, timestamp: 1 }],
  ['array latitude', { lat: [], lon: 139, timestamp: 1 }],
  ['hex latitude', { lat: '0x23', lon: 139, timestamp: 1 }],
  ['latitude out of range', { lat: 90.01, lon: 139, timestamp: 1 }],
  ['empty longitude', { lat: 35, lon: '', timestamp: 1 }],
  ['null longitude', { lat: 35, lon: null, timestamp: 1 }],
  ['empty longitude whitespace', { lat: 35, lon: ' ', timestamp: 1 }],
  ['longitude out of range', { lat: 35, lon: -180.01, timestamp: 1 }],
  ['null timestamp', { lat: 35, lon: 139, timestamp: null }],
  ['empty timestamp', { lat: 35, lon: 139, timestamp: '' }],
  ['boolean timestamp', { lat: 35, lon: 139, timestamp: false }],
  ['nondecimal timestamp', { lat: 35, lon: 139, timestamp: '0x10' }],
  ['missing timestamp', { lat: 35, lon: 139 }],
  ['nonnumeric latitude', { lat: 'NaN', lon: 139, timestamp: 1 }],
];
for (const [name, point] of invalid) test(`reject ${name}`, () => {
  const inspection = backup.validateBackupSnapshot(payload(point));
  assert.equal(inspection.canRestore, false, name);
  assert.equal(inspection.status, 'RESTORE_BLOCKED');
  assert.ok(inspection.issues.some(issue => issue.code === 'RUN_MEASUREMENT_POINT_INVALID'));
  const restored = backup.restoreBackupText(JSON.stringify(payload(point)));
  assert.equal(restored.ok, false, name);
});

test('invalid import leaves records and original running routes untouched', () => {
  const before = backup.createBackupSnapshot();
  const failed = backup.restoreBackupText(JSON.stringify(payload({lat: null, lon: 139, timestamp: 1})));
  assert.equal(failed.ok, false);
  assert.deepEqual(backup.createBackupSnapshot().data[STORAGE_KEYS.records], before.data[STORAGE_KEYS.records]);
  assert.deepEqual(backup.createBackupSnapshot().data[measureKey], before.data[measureKey]);
});
