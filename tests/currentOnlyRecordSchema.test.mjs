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
const appServices = fs.readFileSync('core/internal/applicationServices.js', 'utf8');
const platformInfrastructure = fs.readFileSync('core/internal/platformInfrastructure.js', 'utf8');
const historyWorkflow = fs.readFileSync('core/internal/historyWorkflow.js', 'utf8');
const restoreInspection = fs.readFileSync('core/internal/restoreInspection.js', 'utf8');
const consultationReport = fs.readFileSync('core/internal/consultationReport.js', 'utf8');
const appEntry = fs.readFileSync('app.js', 'utf8');
const planPreview = fs.readFileSync('core/internal/planPreview.js', 'utf8');
const appCore = fs.readFileSync('core/appCore.js', 'utf8');
const primaryModelEngine = fs.readFileSync('core/internal/primaryModelEngine.js', 'utf8');
const courseRepository = fs.readFileSync('core/internal/courseRepository.js', 'utf8');
const recordWorkflow = fs.readFileSync('core/internal/recordWorkflow.js', 'utf8');
const readingScreen = fs.readFileSync('screens/readingScreen.js', 'utf8');
const gradeDomainConfirmation = fs.readFileSync('ui/interactions/gradeDomainConfirmation.js', 'utf8');
const primaryInputProcessing = fs.readFileSync('core/internal/primaryInputProcessing.js', 'utf8');
const surfacePresetCatalog = fs.readFileSync('core/internal/surfacePresetCatalog.js', 'utf8');
const applicationDomain = fs.readFileSync('core/internal/applicationDomain.js', 'utf8');
const readingCatalog = fs.readFileSync('core/internal/readingCatalog.js', 'utf8');
const evidenceData = fs.readFileSync('core/internal/evidenceData.js', 'utf8');
const architectureDoc = fs.readFileSync('docs/CODEBASE_ARCHITECTURE.md', 'utf8');
const recordRepositories = fs.readFileSync('core/internal/recordRepositories.js', 'utf8');

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


test('CURRENT-RUNTIME-NO-LONGER-STORES-OR-EXPOSES-V27-RESULTS', () => {
  assert.ok(!platformInfrastructure.includes('modelResultsV27'));
  assert.ok(!platformInfrastructure.includes('model-results-v2.7'));
  assert.ok(!appServices.includes('modelResultsV27'));
  assert.ok(!appServices.includes('createModelResultV27Repository'));
  assert.ok(!appServices.includes('v27: Object.freeze'));
  assert.ok(!appEntry.includes('modelResultV27Repository'));
  assert.ok(!historyWorkflow.includes('modelResultsV27'));
  assert.ok(!historyWorkflow.includes('modelResultV27Repository'));
  assert.ok(!restoreInspection.includes('inspectV27Results'));
  assert.ok(!restoreInspection.includes('v27Results'));
  assert.ok(!consultationReport.includes('v27ResultRecord'));
  assert.ok(!consultationReport.includes('走り全体の目安'));
});


test('PLAN-PREVIEW-IS-CURRENT-FACTS-ONLY', () => {
  assert.ok(planPreview.includes('PLAN_FACT_PREVIEW_VERSION'));
  assert.ok(planPreview.includes('数値による負荷予測は行いません'));
  assert.ok(!planPreview.includes('legacyLoad'));
  assert.ok(!planPreview.includes('V27_'));
  assert.ok(!planPreview.includes('createV27PlanPreview'));
  assert.ok(!planPreview.includes('calculateV27Session'));
  assert.ok(!planPreview.includes('rpeProvenance'));
});


test('RETIRED-V27-IMPLEMENTATION-FILES-ARE-ABSENT', () => {
  for (const path of [
    'core/internal/modelV27.js',
    'core/internal/v27ApplicationModel.js',
    'core/internal/v27ApplicationServices.js',
  ]) assert.equal(fs.existsSync(path), false, path);
  assert.ok(!worker.includes('./core/internal/modelV27.js'));
  assert.ok(!worker.includes('./core/internal/v27ApplicationModel.js'));
  assert.ok(!worker.includes('./core/internal/v27ApplicationServices.js'));
});

test('CURRENT-MODULE-CHAIN-NO-LONGER-DEPENDS-ON-V27', () => {
  assert.ok(!primaryModelEngine.includes('modelV27.js'));
  assert.ok(primaryResults.includes('recordRepositories.js'));
  assert.ok(!courseRepository.includes('v27ApplicationModel.js'));
  assert.ok(!recordWorkflow.includes('v27ApplicationServices.js'));
  assert.ok(appServices.includes('publicHelpGuidance.js'));
  assert.ok(restoreInspection.includes('applicationDomain.js'));
  assert.ok(!appCore.includes('legacyLoadModelConstants'));
  assert.ok(!appCore.includes('export const V27_'));
  assert.ok(!readingScreen.includes('V27_'));
  assert.ok(!gradeDomainConfirmation.includes('V27_'));
  assert.ok(appCore.includes('BODY_AREA_TO_PRIMARY_REGIONAL_V2'));
  assert.ok(primaryModelEngine.includes('PRIMARY_REGIONAL_GRADE_COMMON_DIRECT_MAX_ABS_PERCENT'));
  assert.ok(primaryModelEngine.includes('PRIMARY_REGIONAL_GRADE_UPHILL_DIRECT_MAX_PERCENT'));
});


test('RETIRED-FIXED-TRACE-AND-RPE-PLUMBING-ARE-ABSENT', () => {
  assert.ok(!primaryModelEngine.includes('primaryRegionalInputTrace'));
  assert.ok(!primaryModelEngine.includes('RETAINED_INPUTS'));
  assert.ok(!primaryModelEngine.includes('Current 93-input trace'));
  assert.ok(!primaryInputProcessing.includes('buildAppRetainedInputTrace'));
  assert.ok(!primaryInputProcessing.includes('primaryRegionalTraceAdapter'));
  assert.ok(!primaryInputProcessing.includes('rawRepairValue'));
  assert.ok(!inputSupport.includes('RPE_PROVENANCE'));
  assert.ok(!inputSupport.includes('normalizeRpeProvenance'));
  assert.ok(!inputSupport.includes('reportedRpeValue'));
  assert.ok(!inputSupport.includes('validateProvidedNumber(errors, input, "perceivedExertion"'));
  assert.ok(!recordWorkflow.includes('assumeExplicitRpe'));
  assert.ok(!recordRepositories.includes('assumeExplicitRpe'));
});


test('DEAD-FORMAL-INPUT-SYSTEM-IS-RETIRED-WHILE-SURFACE-PRESETS-REMAIN', () => {
  assert.equal(fs.existsSync('core/internal/primaryInputCatalog.js'), false);
  assert.equal(fs.existsSync('core/internal/surfacePresetCatalog.js'), true);
  assert.ok(surfacePresetCatalog.includes('const SURFACE_PRESETS = Object.freeze({'));
  assert.ok(primaryInputProcessing.includes('surfacePresetCatalog.js'));
  assert.ok(primaryInputProcessing.includes('internalModules.surfacePresetCatalog'));
  assert.ok(!primaryInputProcessing.includes('formalInputValidation'));
  assert.ok(!primaryInputProcessing.includes('formalInputAdapter'));
  assert.ok(!primaryInputProcessing.includes('FORMAL_INPUT_CATALOG'));
  assert.ok(!primaryInputProcessing.includes('adaptPrototypeRecord'));
  assert.ok(!primaryInputProcessing.includes('validateFormalInputBundle'));
  assert.ok(!worker.includes('./core/internal/primaryInputCatalog.js'));
  assert.ok(worker.includes('./core/internal/surfacePresetCatalog.js'));
});


test('ACTIVE-READING-AND-EVIDENCE-NAMING-HAS-NO-RETIRED-V27-PATH', () => {
  assert.ok(!applicationDomain.toLowerCase().includes('model/v27'));
  assert.ok(!applicationDomain.includes('A4_OR_V27'));
  assert.ok(!readingCatalog.toLowerCase().includes('v27'));
  assert.ok(!evidenceData.toLowerCase().includes('v2.7'));
  assert.ok(!evidenceData.toLowerCase().includes('v27'));
  assert.ok(!evidenceData.includes('"RPE"'));
  assert.ok(!readingScreen.toLowerCase().includes('v27'));
  assert.ok(!architectureDoc.includes('V27 may remain'));
  assert.ok(readingCatalog.includes('id: "consultation-prep"'));
  assert.ok(readingCatalog.includes('id: "model-limits"'));
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
