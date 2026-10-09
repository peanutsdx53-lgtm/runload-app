import test from 'node:test';
import assert from 'node:assert/strict';
import { createApplicationServices, createMemoryStorage, STORAGE_KEYS } from '../core/appCore.js';

const record = {
  id: 'g03-old-model', date: '2026-10-08', createdAt: '2026-10-08T07:00:00.000Z',
  activityType: 'run', distanceKm: 5, durationMinutes: 30,
  runningFormat: 'CONTINUOUS_RUN', stepsProvenance: 'UNKNOWN',
  course: { gradeKnowledge: 'UNKNOWN', modelSurfaceClass: 'UNKNOWN' },
};
const feedback = { checkStatus: 'deferred', bodyAreaObservations: [], safetyFlags: {} };

function storedLegacyFixture() {
  const storage = createMemoryStorage();
  const services = createApplicationServices({storage});
  assert.equal(services.workflows.records.saveRecordAndFeedback(record, feedback).ok, true);
  const current = services.workflows.records.loadExperience(record.id);
  const old = structuredClone(current.regionalV2ResultRecord);
  old.id = 'legacy-regional-result';
  old.model_version = 'historical-model-v1';
  old.output_semantic_version = 'historical-semantic-v1';
  old.result.regions[0].value = 999999; // explicit sentinel: never reinterpret as current Reference-100
  storage.setItem(STORAGE_KEYS.modelResultsRegionalV2, JSON.stringify([old]));
  return {services, old, storage};
}

test('G-03 old-model result is not reinterpreted as current on loading an experience', () => {
  const {services, old, storage} = storedLegacyFixture();
  const before = storage.getItem(STORAGE_KEYS.modelResultsRegionalV2);
  const first = services.workflows.records.loadExperience(record.id);
  const second = services.workflows.records.loadExperience(record.id);
  assert.equal(first.record.id, record.id);
  assert.equal(first.regionalV2ResultRecord, null);
  assert.equal(first.regionalV2Result, null);
  assert.equal(first.regionalSemanticState, 'NONE');
  assert.equal(first.regionalV2Recovery, null);
  assert.deepEqual(second, first);
  assert.equal(storage.getItem(STORAGE_KEYS.modelResultsRegionalV2), before);
  assert.equal(JSON.parse(before)[0].result.regions[0].value, 999999);
  assert.equal(JSON.parse(before)[0].model_version, old.model_version);
});

test('G-03 missing current-model result does not cause a silent write or retroactive calculation', () => {
  const {services, storage} = storedLegacyFixture();
  const beforeResults = storage.getItem(STORAGE_KEYS.modelResultsRegionalV2);
  const experience = services.workflows.records.loadExperience(record.id);
  assert.equal(experience.regionalV2Result, null);
  assert.equal(storage.getItem(STORAGE_KEYS.modelResultsRegionalV2), beforeResults);
});
