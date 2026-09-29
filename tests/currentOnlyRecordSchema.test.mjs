import fs from 'node:fs';
import assert from 'node:assert/strict';

const versionModule = fs.readFileSync('ui/appVersionStatus.js', 'utf8');
const worker = fs.readFileSync('service-worker.js', 'utf8');
const platform = fs.readFileSync('core/internal/platformInfrastructure.js', 'utf8');
const rofConstants = fs.readFileSync('core/rofJConstants.js', 'utf8');
const rofCore = fs.readFileSync('core/rofJCore.js', 'utf8');
const tutorial = fs.readFileSync('ui/screenTutorial.js', 'utf8');
const recordInput = fs.readFileSync('ui/interactions/recordInputInteractions.js', 'utf8');
const mobileAutofill = fs.readFileSync('ui/mobileMeasurementRecordAutofill.js', 'utf8');
const inputSupport = fs.readFileSync('core/internal/inputSupport.js', 'utf8');
const primaryResults = fs.readFileSync('core/internal/primaryModelResults.js', 'utf8');

const results = [];
function test(id, fn) {
  try {
    fn();
    results.push({ id, status: 'PASS' });
  } catch (error) {
    results.push({ id, status: 'FAIL', message: String(error?.stack || error) });
  }
}

const version = versionModule.match(/APP_VERSION = "([^"]+)"/)?.[1] || '';

test('PRE-RELEASE-BUILD-HAS-NO-STORED-DATA-COMPATIBILITY-SHIM', () => {
  assert.equal(fs.existsSync('core/legacyCompatibility.js'), false);
  assert.ok(!platform.includes('legacyCompatibility'));
  assert.ok(!worker.includes('./core/legacyCompatibility.js'));
});

test('PWA-CACHE-USES-CURRENT-RELEASE-CONTRACT', () => {
  assert.equal(version, '2026.09.29.3');
  assert.ok(worker.includes(`running-record-app-runtime-${version}`));
  assert.ok(worker.includes('const CACHE_PREFIX = "running-record-app-";'));
  assert.ok(platform.includes('registration.unregister()'));
});

test('SERVICE-WORKER-DOES-NOT-AUTO-ACTIVATE-DURING-BOOT', () => {
  const installBlock = worker.match(/self\.addEventListener\("install"[\s\S]*?\n\}\);/)?.[0] || '';
  assert.ok(installBlock.includes('cache.addAll(PRECACHE_URLS)'));
  assert.ok(!installBlock.includes('self.skipWaiting()'));
  assert.ok(worker.includes('if (event.data?.type === "SKIP_WAITING") self.skipWaiting();'));
});

test('ROF-J-ACCEPTS-CURRENT-SCHEMA-ONLY', () => {
  assert.ok(!rofConstants.includes('LEGACY_ROF_J_'));
  assert.ok(rofConstants.includes('return value === ROF_J_SEMANTIC_VERSION;'));
  assert.ok(rofConstants.includes('return value === ROF_J_STORAGE_SCHEMA_VERSION;'));
  assert.ok(rofConstants.includes('return value === ROF_J_LIFECYCLE_SCHEMA_VERSION;'));
  assert.ok(!rofCore.includes('normalizeRofJStorageEnvelope'));
  assert.ok(!rofCore.includes('normalizeRofJLifecycleEnvelope'));
  assert.ok(!rofCore.includes('hasLegacyRofJSourceMetadata'));
});

test('TUTORIAL-USES-CURRENT-STORAGE-KEY-ONLY', () => {
  assert.ok(tutorial.includes('running-record.screenTutorial.seen.v1'));
  assert.ok(!tutorial.includes('runload.screenTutorial.seen.v1'));
  assert.ok(!tutorial.includes('LEGACY_TUTORIAL_STORAGE_KEY'));
});

test('SHARED-PC-MOBILE-RECORD-PATH-USES-CURRENT-FIELDS', () => {
  for (const token of [
    'distanceKm,',
    'durationMinutes: numberValue(formData, "durationMinutes")',
    'steps: numberValue(formData, "steps")',
    'stepsProvenance: String(formData.get("stepsProvenance") || "UNKNOWN")',
    'course: readCourse(formData, distanceKm)',
    'personalContext: readPersonalContext(formData)',
  ]) assert.ok(recordInput.includes(token), token);
});

test('SMARTPHONE-GPS-AUTOFILL-WRITES-CURRENT-FORM-FIELDS', () => {
  assert.ok(mobileAutofill.includes('const MOBILE_QUERY = "(max-width: 54.99rem)"'));
  for (const token of [
    'setValue(form, "steps"',
    'setValue(form, "stepsProvenance", "ESTIMATED")',
    'setValue(form, "courseName"',
    'setValue(form, "gradeInputMode"',
    'setValue(form, "gradeKnowledge"',
    'setValue(form, "upPercent"',
    'setValue(form, "downPercent"',
    'setValue(form, "upGradePercent"',
    'setValue(form, "downGradePercent"',
    'setValue(form, "modelSurfaceClass", "UNKNOWN")',
  ]) assert.ok(mobileAutofill.includes(token), token);
});

test('NORMALIZER-NO-LONGER-READS-PRE-RELEASE-RECORD-ALIASES', () => {
  for (const retired of [
    'input.dist_km',
    'input.distKm',
    'input.time_min',
    'input.timeMin',
    'rawRecord.course_name',
    'course.up_pct',
    'course.down_pct',
    'item.distance_km',
    'item.share_pct',
    'item.grade_pct',
    'input.profile_sex',
    'input.profile_age_band',
    'input.plan_outcome_status',
    'input.planned_dist_km',
    'input.planned_time_min',
  ]) assert.ok(!inputSupport.includes(retired), retired);
  assert.ok(inputSupport.includes('toFiniteNumber(input.distanceKm, 0)'));
  assert.ok(inputSupport.includes('toFiniteNumber(input.durationMinutes, 0)'));
  assert.ok(inputSupport.includes('course: normalizeCourse(input.course)'));
});


test('PRIMARY-REGIONAL-RESULT-NO-LONGER-DEPENDS-ON-FIXED-93-TRACE', () => {
  assert.ok(!primaryResults.includes('INPUT_TRACE_93_REQUIRED'));
  assert.ok(!primaryResults.includes('TRACE_APP_CONTEXT_19_REQUIRED'));
  assert.ok(!primaryResults.includes('input_trace:'));
  assert.ok(!primaryResults.includes('formal_input_snapshot:'));
  assert.ok(!primaryResults.includes('buildAppRetainedInputTrace'));
  assert.ok(primaryResults.includes('engine_input_snapshot'));
});

const failed = results.filter((item) => item.status !== 'PASS');
console.log(JSON.stringify({
  suite: 'Current-only record schema / PC-mobile parity guard',
  version,
  total: results.length,
  passed: results.length - failed.length,
  failed: failed.length,
  status: failed.length ? 'FAIL' : 'PASS',
  results,
}, null, 2));
if (failed.length) process.exit(1);
