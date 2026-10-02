import assert from "node:assert/strict";
import {
  SELF_UNDERSTANDING_STATES,
  SELF_UNDERSTANDING_TYPES,
  SELF_UNDERSTANDING_BODY_AREA_TO_DISPLAY_REGION,
  buildSelfUnderstandingView,
  selfUnderstandingRegionSignature,
} from "../core/selfUnderstandingCore.js";
import { BODY_AREA_TO_PRIMARY_REGIONAL_V2, createApplicationServices, createMemoryStorage, STORAGE_KEYS } from "../core/appCore.js";

const results = [];
async function test(id, fn) {
  try { await fn(); results.push({ id, status: "PASS" }); }
  catch (error) { results.push({ id, status: "FAIL", message: error?.stack || String(error) }); }
}

const sig = Object.freeze({
  regionId: "BA-DISP-023",
  primaryRegionId: "R07",
  modelVersion: "MODEL-X",
  outputSemanticVersion: "SEM-X",
  constructId: "C-X",
  referenceId: "REF-X",
});
function experience({
  id,
  date,
  createdAt = `${date}T12:00:00.000Z`,
  activityType = "run",
  value = 104,
  signature = sig,
  observation = null,
  courseId = "course-a",
  courseName = "河川コース",
} = {}) {
  return {
    record: { id, date, createdAt, activityType, course: { id: courseId, name: courseName } },
    feedback: { bodyAreaObservations: observation ? [observation] : [] },
    regionalV2ResultRecord: {
      result: { regions: [{ regionId: "BA-DISP-023", primaryRegionId: "R07", regionName: "下腿後面", value }] },
      comparison_signatures: { "BA-DISP-023": signature },
    },
  };
}
const calfObservation = Object.freeze({
  areaId: "BFR-240-POST",
  modelRegionId: "R07",
  intensity: 3,
  laterality: "BILATERAL",
  sensationType: "TIGHTNESS",
  noticedTiming: "DURING",
});

await test("BODY-AREA-DISPLAY-MAPPING-MATCHES-CURRENT-INPUT-ADAPTER", () => {
  assert.deepEqual(SELF_UNDERSTANDING_BODY_AREA_TO_DISPLAY_REGION, BODY_AREA_TO_PRIMARY_REGIONAL_V2);
});

await test("UNSUPPORTED-BODY-AREA-DOES-NOT-PAIR-BY-BROAD-MODEL-REGION", () => {
  const target = experience({ id: "r0", date: "2026-10-01", observation: {
    areaId: "BA-060", modelRegionId: "R01", intensity: 4, laterality: "UNKNOWN", sensationType: "TIGHTNESS", noticedTiming: "DURING",
  } });
  target.regionalV2ResultRecord.result.regions = [{ regionId: "BA-DISP-014", primaryRegionId: "R01", regionName: "股関節部", value: 102 }];
  target.regionalV2ResultRecord.comparison_signatures = { "BA-DISP-014": { ...sig, regionId: "BA-DISP-014", primaryRegionId: "R01" } };
  const view = buildSelfUnderstandingView({ targetExperience: target, allExperiences: [target] });
  assert.equal(view.primaryCandidate, null);
});

await test("FOOT-BODY-AREA-PAIRS-WITH-EXACT-DISPLAY-REGION", () => {
  const target = experience({ id: "r-foot", date: "2026-10-01", observation: {
    areaId: "BFR-260-REAR", modelRegionId: "R08", intensity: 4, laterality: "BILATERAL", sensationType: "DISCOMFORT", noticedTiming: "DURING",
  } });
  target.regionalV2ResultRecord.result.regions = [
    { regionId: "BA-DISP-024", primaryRegionId: "R08", regionName: "足関節部", value: 101 },
    { regionId: "BA-DISP-027", primaryRegionId: "R10", regionName: "後足部", value: 106 },
  ];
  target.regionalV2ResultRecord.comparison_signatures = {
    "BA-DISP-024": { ...sig, regionId: "BA-DISP-024", primaryRegionId: "R08" },
    "BA-DISP-027": { ...sig, regionId: "BA-DISP-027", primaryRegionId: "R10" },
  };
  const view = buildSelfUnderstandingView({ targetExperience: target, allExperiences: [target] });
  assert.equal(view.primaryCandidate?.subject?.regionId, "BA-DISP-027");
  assert.equal(view.primaryCandidate?.subject?.bodyAreaId, "BFR-260-REAR");
});

await test("NO-BODY-OBSERVATION-NO-AUTO-CANDIDATE", () => {
  const target = experience({ id: "r1", date: "2026-10-01" });
  const view = buildSelfUnderstandingView({ targetExperience: target, allExperiences: [target] });
  assert.equal(view.primaryCandidate, null);
  assert.equal(view.counts.watching, 0);
});

await test("BODY-OBSERVATION-PAIR-CAN-BE-OFFERED-WITHOUT-CAUSAL-INFERENCE", () => {
  const target = experience({ id: "r1", date: "2026-10-01", observation: calfObservation });
  const view = buildSelfUnderstandingView({ targetExperience: target, allExperiences: [target] });
  assert.equal(view.primaryCandidate?.threadType, SELF_UNDERSTANDING_TYPES.regionObservationPair);
  assert.equal(view.primaryCandidate?.subject?.regionId, "BA-DISP-023");
  assert.equal(view.primaryCandidate?.subject?.bodyAreaId, "BFR-240-POST");
  assert.equal(view.primaryCandidate?.observation?.sensationType, "TIGHTNESS");
});


await test("MULTIPLE-BODY-OBSERVATIONS-SURFACE-ONE-WITH-COUNT", () => {
  const target = experience({ id: "r1", date: "2026-10-01", observation: calfObservation });
  target.feedback.bodyAreaObservations.push({ ...calfObservation, areaId: "BFR-250-POST", intensity: 2 });
  target.regionalV2ResultRecord.result.regions.push({ regionId: "BA-DISP-025", primaryRegionId: "R07", regionName: "アキレス腱部", value: 102 });
  target.regionalV2ResultRecord.comparison_signatures["BA-DISP-025"] = { ...sig, regionId: "BA-DISP-025", primaryRegionId: "R07", constructId: "C-ACHILLES" };
  const view = buildSelfUnderstandingView({ targetExperience: target, allExperiences: [target] });
  assert.equal(view.primaryCandidate?.observation?.intensity, 3);
  assert.equal(view.primaryCandidate?.otherObservationCount, 1);
});

await test("REPEATED-REGIONAL-VALUES-ALONE-DO-NOT-AUTO-CREATE-CANDIDATE", () => {
  const rows = [
    experience({ id: "r1", date: "2026-09-01", value: 104 }),
    experience({ id: "r2", date: "2026-09-08", value: 105 }),
    experience({ id: "r3", date: "2026-09-15", value: 103 }),
  ];
  const view = buildSelfUnderstandingView({ targetExperience: rows.at(-1), allExperiences: rows });
  assert.equal(view.primaryCandidate, null);
});

await test("ROF-SEQUENCE-ALONE-DOES-NOT-AUTO-CREATE-CANDIDATE", () => {
  const rows = [
    experience({ id: "r1", date: "2026-09-01" }),
    experience({ id: "r2", date: "2026-09-08" }),
    experience({ id: "r3", date: "2026-09-15" }),
  ];
  const rof = new Map([["r1", { post: 6 }], ["r2", { post: 5 }], ["r3", { post: 4 }]]);
  const view = buildSelfUnderstandingView({ targetExperience: rows.at(-1), allExperiences: rows, rofSummariesByRecordId: rof });
  assert.equal(view.primaryCandidate, null);
});

await test("EXPLICIT-REGION-THEME-RESURFACES-ONLY-COMPATIBLE-NEW-EVIDENCE", () => {
  const services = createApplicationServices({ storage: createMemoryStorage() });
  const source = experience({ id: "r1", date: "2026-09-01" });
  const created = services.storage.selfUnderstandingThreads.createOrResume({
    type: SELF_UNDERSTANDING_TYPES.regionWatch,
    subject: { regionId: "BA-DISP-023", primaryRegionId: "R07" },
    createdFromRecord: source.record,
    semanticConstraints: { regionSignature: selfUnderstandingRegionSignature(source, "BA-DISP-023") },
    now: "2026-09-01T13:00:00.000Z",
  });
  assert.equal(created.ok, true);
  const incompatible = experience({ id: "r2", date: "2026-09-08", signature: { ...sig, modelVersion: "MODEL-Y" } });
  const eligible = experience({ id: "r3", date: "2026-09-15", value: 106 });
  const view = buildSelfUnderstandingView({
    targetExperience: eligible,
    allExperiences: [source, incompatible, eligible],
    threads: services.storage.selfUnderstandingThreads.loadAll(),
  });
  assert.equal(view.activeThread?.id, created.item.id);
  assert.deepEqual(view.activeThread?.eligibleEpisodes.map((row) => row.recordId), ["r3"]);
  assert.equal(view.activeThread?.eligibleCount, 2);
  assert.equal(view.activeThread?.newCount, 1);
});

await test("EDITED-SOURCE-THAT-NO-LONGER-MATCHES-IS-NOT-COUNTED", () => {
  const services = createApplicationServices({ storage: createMemoryStorage() });
  const source = experience({ id: "r1", date: "2026-09-01" });
  const created = services.storage.selfUnderstandingThreads.createOrResume({
    type: SELF_UNDERSTANDING_TYPES.regionWatch,
    subject: { regionId: "BA-DISP-023", primaryRegionId: "R07" },
    createdFromRecord: source.record,
    semanticConstraints: { regionSignature: selfUnderstandingRegionSignature(source, "BA-DISP-023") },
    now: "2026-09-01T13:00:00.000Z",
  });
  const edited = experience({ id: "r1", date: "2026-09-01", signature: { ...sig, outputSemanticVersion: "SEM-Y" } });
  const view = buildSelfUnderstandingView({ allExperiences: [edited], threads: [created.item] });
  assert.equal(view.threads[0].sourceAvailable, false);
  assert.equal(view.threads[0].eligibleCount, 0);
});

await test("SAME-COURSE-ROF-THEME-REQUIRES-EXPLICIT-CREATION-AND-STABLE-COURSE-ID", () => {
  const services = createApplicationServices({ storage: createMemoryStorage() });
  const source = experience({ id: "r1", date: "2026-09-01", courseId: "course-a" });
  const created = services.storage.selfUnderstandingThreads.createOrResume({
    type: SELF_UNDERSTANDING_TYPES.sameCourseRofPost,
    subject: { courseId: "course-a", courseName: "河川コース" },
    createdFromRecord: source.record,
    now: "2026-09-01T13:00:00.000Z",
  });
  const wrongCourse = experience({ id: "r2", date: "2026-09-08", courseId: "course-b" });
  const sameCourse = experience({ id: "r3", date: "2026-09-15", courseId: "course-a" });
  const rof = new Map([["r1", { post: 6 }], ["r2", { post: 4 }], ["r3", { post: 5 }]]);
  const view = buildSelfUnderstandingView({ targetExperience: sameCourse, allExperiences: [source, wrongCourse, sameCourse], threads: [created.item], rofSummariesByRecordId: rof });
  assert.deepEqual(view.activeThread?.eligibleEpisodes.map((row) => row.recordId), ["r3"]);
  assert.equal(view.activeThread?.eligibleCount, 2);
});

await test("NON-RUN-ACTIVITY-DOES-NOT-ADVANCE-RUNNING-THEME", () => {
  const services = createApplicationServices({ storage: createMemoryStorage() });
  const source = experience({ id: "r1", date: "2026-09-01" });
  const created = services.storage.selfUnderstandingThreads.createOrResume({
    type: SELF_UNDERSTANDING_TYPES.regionWatch,
    subject: { regionId: "BA-DISP-023", primaryRegionId: "R07" },
    createdFromRecord: source.record,
    semanticConstraints: { regionSignature: sig },
  });
  const walk = experience({ id: "w1", date: "2026-09-02", activityType: "walk" });
  const view = buildSelfUnderstandingView({ targetExperience: walk, allExperiences: [source, walk], threads: [created.item] });
  assert.equal(view.threads[0].newCount, 0);
  assert.equal(view.activeThread, null);
});

await test("PAUSE-CLOSE-RESUME-ARE-USER-CONTROLLED", () => {
  const services = createApplicationServices({ storage: createMemoryStorage() });
  const source = experience({ id: "r1", date: "2026-09-01" });
  const created = services.storage.selfUnderstandingThreads.createOrResume({
    type: SELF_UNDERSTANDING_TYPES.regionWatch,
    subject: { regionId: "BA-DISP-023", primaryRegionId: "R07" },
    createdFromRecord: source.record,
    semanticConstraints: { regionSignature: sig },
  });
  const paused = services.storage.selfUnderstandingThreads.review(created.item.id, { decision: "PAUSE" });
  assert.equal(paused.item.userState, SELF_UNDERSTANDING_STATES.paused);
  const resumed = services.storage.selfUnderstandingThreads.review(created.item.id, { decision: "KEEP_WATCHING" });
  assert.equal(resumed.item.userState, SELF_UNDERSTANDING_STATES.watching);
  const closed = services.storage.selfUnderstandingThreads.review(created.item.id, { decision: "CLOSE" });
  assert.equal(closed.item.userState, SELF_UNDERSTANDING_STATES.closed);
});

await test("THREAD-STORE-DOES-NOT-DUPLICATE-SCIENTIFIC-VALUES", () => {
  const services = createApplicationServices({ storage: createMemoryStorage() });
  const source = experience({ id: "r1", date: "2026-09-01", value: 108 });
  services.storage.selfUnderstandingThreads.createOrResume({
    type: SELF_UNDERSTANDING_TYPES.regionWatch,
    subject: { regionId: "BA-DISP-023", primaryRegionId: "R07" },
    createdFromRecord: source.record,
    semanticConstraints: { regionSignature: sig },
  });
  const raw = services.storage.gateway.readJsonResult(STORAGE_KEYS.selfUnderstandingThreads, []).value;
  const serialized = JSON.stringify(raw);
  assert.equal(serialized.includes('"value":108'), false);
  assert.equal(serialized.includes('postRofJ'), false);
});

await test("BACKUP-AND-RESTORE-INSPECTION-INCLUDE-THREAD-STORE", () => {
  const services = createApplicationServices({ storage: createMemoryStorage() });
  const source = experience({ id: "r1", date: "2026-09-01" });
  services.storage.selfUnderstandingThreads.createOrResume({
    type: SELF_UNDERSTANDING_TYPES.regionWatch,
    subject: { regionId: "BA-DISP-023", primaryRegionId: "R07" },
    createdFromRecord: source.record,
    semanticConstraints: { regionSignature: sig },
  });
  const backup = services.storage.backup.tryCreateBackupSnapshot();
  assert.equal(backup.ok, true);
  assert.ok(Array.isArray(backup.snapshot.data[STORAGE_KEYS.selfUnderstandingThreads]));
  assert.equal(backup.snapshot.data[STORAGE_KEYS.selfUnderstandingThreads].length, 1);
  const inspection = services.storage.backup.validateBackupSnapshot(backup.snapshot);
  assert.equal(inspection.canRestore, true);
  assert.equal(inspection.counts.selfUnderstandingThreads, 1);
});


await test("FULL-DATA-DELETION-REMOVES-THREAD-STORE", () => {
  const services = createApplicationServices({ storage: createMemoryStorage() });
  const source = experience({ id: "r1", date: "2026-09-01" });
  services.storage.selfUnderstandingThreads.createOrResume({
    type: SELF_UNDERSTANDING_TYPES.regionWatch,
    subject: { regionId: "BA-DISP-023", primaryRegionId: "R07" },
    createdFromRecord: source.record,
    semanticConstraints: { regionSignature: sig },
  });
  assert.equal(services.storage.selfUnderstandingThreads.loadAll().length, 1);
  const cleared = services.dataManagement.clearAllUserData();
  assert.equal(cleared.ok, true);
  assert.equal(services.storage.selfUnderstandingThreads.loadAll().length, 0);
});

const failed = results.filter((item) => item.status === "FAIL");
console.log(JSON.stringify({ suite: "Self Understanding V2", total: results.length, passed: results.length - failed.length, failed: failed.length, status: failed.length ? "FAIL" : "PASS", results }, null, 2));
if (failed.length) process.exitCode = 1;
