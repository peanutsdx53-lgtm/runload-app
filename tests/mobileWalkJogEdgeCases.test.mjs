import assert from "node:assert/strict";
import {
  summarizeMobileWalkJogCoverage,
} from "../core/internal/mobileWalkJogSpeedModel.js";
import {
  createMobileSegmentAnalysis,
} from "../ui/mobileWalkJogMeasurementWiring.js";
import {
  normalizeMobileExtensionRecord,
  saveMobileExtensionRecord,
  listMobileExtensionRecords,
} from "../ui/mobileWalkJogRecordStore.js";
import {
  evaluateTrackPoint,
} from "../ui/runMeasurementCore.js";

const results = [];
function test(id, fn) {
  try {
    fn();
    results.push({ id, status: "PASS" });
  } catch (error) {
    results.push({ id, status: "FAIL", message: String(error?.stack || error) });
  }
}

function analysis(activityId = "WALK", segments = []) {
  return {
    version: 1,
    modelVersion: "2026-09-30.v1.3",
    activityId,
    provisionalEnabled: false,
    segments,
  };
}

function pending(distanceKm = 0.9, durationMinutes = 10) {
  return {
    version: 1,
    distanceKm,
    durationMinutes,
    startedAt: "2026-09-30T00:00:00.000Z",
    endedAt: "2026-09-30T00:10:00.000Z",
    saveRoute: true,
    track: [{ lat: 35, lon: 139, timestamp: 1 }, { lat: 35.001, lon: 139, timestamp: 2 }],
    acceptedPointCount: 2,
    rejectedPointCount: 0,
  };
}

function memoryStorage() {
  const map = new Map();
  return {
    getItem: (key) => map.has(key) ? map.get(key) : null,
    setItem: (key, value) => map.set(key, String(value)),
    removeItem: (key) => map.delete(key),
  };
}

function throwingStorage() {
  return {
    getItem: () => null,
    setItem: () => { throw new Error("quota"); },
  };
}

test("ZERO-SPEED-DOES-NOT-FABRICATE-REGIONAL-VALUES", () => {
  for (const gaitId of ["WALK", "JOGGING"]) {
    const summary = summarizeMobileWalkJogCoverage({ gaitId, speedMps: 0 });
    assert.equal(summary.strictAll12, false);
    assert.equal(summary.availableRegionCount, 0);
    assert.equal(summary.provisionalRegionCount, 0);
    assert.ok(summary.regions.every((region) => region.outputStatus === "NO_OUTPUT" && region.index === null));
  }
});

test("EXTREME-SPEED-REMAINS-OUTSIDE-AUTHORIZED-ROUTES", () => {
  for (const gaitId of ["WALK", "JOGGING"]) {
    const summary = summarizeMobileWalkJogCoverage({ gaitId, speedMps: 10, allowProvisional: false });
    assert.equal(summary.strictAll12, false);
    assert.equal(summary.availableRegionCount, 0);
    assert.equal(summary.provisionalRegionCount, 0);
    assert.ok(summary.regions.every((region) => region.index === null));
  }
});

test("ZERO-DISTANCE-SEGMENT-HAS-NO-COVERAGE", () => {
  const segment = createMobileSegmentAnalysis({
    gaitId: "WALK",
    startDistanceKm: 0,
    endDistanceKm: 0,
    startElapsedSeconds: 0,
    endElapsedSeconds: 60,
  });
  assert.equal(segment.distanceKm, 0);
  assert.equal(segment.speedMps, null);
  assert.equal(segment.coverage, null);
});

test("ZERO-DURATION-SEGMENT-HAS-NO-COVERAGE", () => {
  const segment = createMobileSegmentAnalysis({
    gaitId: "JOGGING",
    startDistanceKm: 0,
    endDistanceKm: 0.1,
    startElapsedSeconds: 30,
    endElapsedSeconds: 30,
  });
  assert.equal(segment.durationSeconds, 0);
  assert.equal(segment.speedMps, null);
  assert.equal(segment.coverage, null);
});

test("VERY-SHORT-HIGH-SPEED-SEGMENT-DOES-NOT-ENABLE-PROVISIONAL", () => {
  const segment = createMobileSegmentAnalysis({
    gaitId: "WALK",
    startDistanceKm: 0,
    endDistanceKm: 0.02,
    startElapsedSeconds: 0,
    endElapsedSeconds: 1,
  });
  assert.equal(segment.speedMps, 20);
  assert.equal(segment.coverage.strictAll12, false);
  assert.equal(segment.coverage.availableRegionCount, 0);
  assert.equal(segment.coverage.provisionalRegionCount, 0);
});

test("GPS-INTERRUPTION-AND-BAD-POINTS-ADD-NO-DISTANCE", () => {
  const previous = { lat: 35, lon: 139, timestamp: 1000, accuracyM: 5 };
  const cases = [
    evaluateTrackPoint(previous, null),
    evaluateTrackPoint(previous, { lat: 35.0001, lon: 139, timestamp: 2000, accuracyM: 100 }),
    evaluateTrackPoint(previous, { lat: 35.0001, lon: 139, timestamp: 1000, accuracyM: 5 }),
    evaluateTrackPoint(previous, { lat: 35.01, lon: 139, timestamp: 2000, accuracyM: 5 }),
  ];
  assert.deepEqual(cases.map((item) => item.accepted), [false, false, false, false]);
  assert.ok(cases.every((item) => item.distanceDeltaM === 0));
  assert.deepEqual(cases.map((item) => item.reason), [
    "INVALID_POSITION",
    "LOW_ACCURACY",
    "NON_FORWARD_TIME",
    "IMPLAUSIBLE_SPEED",
  ]);
});

test("ZERO-DISTANCE-OR-DURATION-RECORD-IS-REJECTED", () => {
  assert.equal(normalizeMobileExtensionRecord({ analysis: analysis("WALK"), pending: pending(0, 10) }), null);
  assert.equal(normalizeMobileExtensionRecord({ analysis: analysis("JOGGING"), pending: pending(0.5, 0) }), null);
});

test("MIXED-RECORD-REQUIRES-VALID-SEGMENT-GAITS", () => {
  const valid = normalizeMobileExtensionRecord({
    analysis: analysis("MIXED", [
      { gaitId: "WALK", distanceKm: 0.2 },
      { gaitId: "RUNNING_CURRENT", distanceKm: 0.3 },
    ]),
    pending: pending(0.5, 5),
  });
  assert.ok(valid);

  const invalid = normalizeMobileExtensionRecord({
    analysis: analysis("MIXED", [{ gaitId: "UNKNOWN", distanceKm: 0.5 }]),
    pending: pending(0.5, 5),
  });
  assert.equal(invalid, null);
});

test("UNAVAILABLE-STORAGE-CANNOT-REPORT-SUCCESS", () => {
  const result = saveMobileExtensionRecord({
    analysis: analysis("WALK"),
    pending: pending(),
    storage: null,
  });
  assert.equal(result.ok, false);
  assert.equal(result.code, "MOBILE_ACTIVITY_RECORD_WRITE_FAILED");
});

test("QUOTA-FAILURE-CANNOT-REPORT-SUCCESS", () => {
  const result = saveMobileExtensionRecord({
    analysis: analysis("JOGGING"),
    pending: pending(),
    storage: throwingStorage(),
  });
  assert.equal(result.ok, false);
  assert.equal(result.code, "MOBILE_ACTIVITY_RECORD_WRITE_FAILED");
});

test("FAILED-WRITE-DOES-NOT-CREATE-RECORD", () => {
  const storage = memoryStorage();
  const originalSetItem = storage.setItem;
  storage.setItem = () => { throw new Error("quota"); };
  const result = saveMobileExtensionRecord({ analysis: analysis("WALK"), pending: pending(), storage });
  assert.equal(result.ok, false);
  storage.setItem = originalSetItem;
  assert.equal(listMobileExtensionRecords(storage).length, 0);
});

for (const result of results) {
  console.log(`${result.status}\t${result.id}${result.message ? `\t${result.message}` : ""}`);
}
if (results.some((result) => result.status === "FAIL")) process.exitCode = 1;
