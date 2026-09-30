import assert from "node:assert/strict";
import {
  normalizeMobileExtensionRecord,
  saveMobileExtensionRecord,
  listMobileExtensionRecords,
} from "../ui/mobileWalkJogRecordStore.js";

const results = [];
function test(id, fn) {
  try { fn(); results.push({ id, status: "PASS" }); }
  catch (error) { results.push({ id, status: "FAIL", message: String(error?.stack || error) }); }
}

function memoryStorage() {
  const map = new Map();
  return {
    getItem: (key) => map.has(key) ? map.get(key) : null,
    setItem: (key, value) => map.set(key, String(value)),
    removeItem: (key) => map.delete(key),
  };
}

function pending(distanceKm = 0.9, durationMinutes = 10) {
  return {
    version: 1,
    distanceKm,
    durationMinutes,
    startedAt: "2026-09-30T00:00:00.000Z",
    endedAt: "2026-09-30T00:10:00.000Z",
    energyEstimate: { estimatedKcal: 100 },
    stepEstimate: { steps: 1000 },
    courseAnalysis: { routePattern: "LOOP" },
    saveRoute: true,
    track: [{ cumulativeDistanceM: 0 }, { cumulativeDistanceM: distanceKm * 1000 }],
    acceptedPointCount: 2,
    rejectedPointCount: 0,
  };
}

function analysis(activityId = "WALK") {
  return {
    version: 1,
    modelVersion: "2026-09-30.v1.3",
    activityId,
    provisionalEnabled: false,
    segments: [],
  };
}

test("WALK-RECORD-IS-SMARTPHONE-EXTENSION-ONLY", () => {
  const record = normalizeMobileExtensionRecord({ analysis: analysis("WALK"), pending: pending(), id: "x", createdAt: "now" });
  assert.equal(record.activityId, "WALK");
  assert.equal(record.authority.scope, "SMARTPHONE_EXTENSION_ONLY");
  assert.equal(record.authority.pcThesisCurrent, "UNCHANGED");
  assert.equal(record.authority.runningCurrentInvoked, false);
});

test("NONRUN-ENERGY-IS-NEVER-COPIED", () => {
  const record = normalizeMobileExtensionRecord({ analysis: analysis("JOGGING"), pending: pending(), id: "x", createdAt: "now" });
  assert.equal(record.energyEstimate, null);
});

test("SINGLE-WALK-ANALYSIS-USES-PENDING-MEASUREMENT-METRICS", () => {
  const record = normalizeMobileExtensionRecord({ analysis: analysis("WALK"), pending: pending(0.9, 10), id: "x", createdAt: "now" });
  assert.equal(record.analysis.metricSource, "PENDING_MEASUREMENT_SNAPSHOT");
  assert.equal(record.analysis.segments.length, 1);
  assert.equal(record.analysis.segments[0].speedMps, 1.5);
  assert.equal(record.analysis.segments[0].coverage.strictAll12, true);
});

test("MIXED-SEGMENTS-ARE-PRESERVED-NOT-RECOMPUTED-AS-ONE", () => {
  const mixed = analysis("MIXED");
  mixed.segments = [{ gaitId: "WALK", distanceKm: 0.3 }, { gaitId: "JOGGING", distanceKm: 0.6 }];
  const record = normalizeMobileExtensionRecord({ analysis: mixed, pending: pending(), id: "x", createdAt: "now" });
  assert.deepEqual(record.analysis.segments.map((item) => item.gaitId), ["WALK", "JOGGING"]);
  assert.equal(record.authority.regionalAggregation, "NO_CROSS_GAIT_OR_CROSS_CONSTRUCT_AGGREGATION");
});


test("EXTENSION-FATIGUE-IS-STORED-SEPARATELY", () => {
  const fatigue = { pre: 3, post: 6, scale: "ROF-J" };
  const record = normalizeMobileExtensionRecord({ analysis: analysis("WALK"), pending: pending(), fatigue, id: "x", createdAt: "now" });
  assert.deepEqual(record.fatigue, fatigue);
  assert.equal(record.authority.runningCurrentInvoked, false);
});

test("RUNNING-CURRENT-CANNOT-BE-SAVED-IN-EXTENSION-STORE", () => {
  assert.equal(normalizeMobileExtensionRecord({ analysis: analysis("RUNNING_CURRENT"), pending: pending() }), null);
});

test("STORE-ROUNDTRIP", () => {
  const storage = memoryStorage();
  const result = saveMobileExtensionRecord({ analysis: analysis("WALK"), pending: pending(), storage });
  assert.equal(result.ok, true);
  const records = listMobileExtensionRecords(storage);
  assert.equal(records.length, 1);
  assert.equal(records[0].activityId, "WALK");
});

for (const result of results) console.log(`${result.status}\t${result.id}${result.message ? `\t${result.message}` : ""}`);
if (results.some((result) => result.status === "FAIL")) process.exitCode = 1;
