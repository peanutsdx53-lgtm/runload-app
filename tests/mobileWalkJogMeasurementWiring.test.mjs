import fs from "node:fs";
import assert from "node:assert/strict";

const wiring = await import("../ui/mobileWalkJogMeasurementWiring.js");

const results = [];
function test(id, fn) {
  try {
    fn();
    results.push({ id, status: "PASS" });
  } catch (error) {
    results.push({ id, status: "FAIL", message: String(error?.stack || error) });
  }
}

function close(actual, expected, tolerance = 1e-6) {
  assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} != ${expected}`);
}

test("ACTIVITY-IDENTITIES-ARE-EXPLICIT", () => {
  assert.deepEqual(wiring.MOBILE_ACTIVITY_IDS, {
    WALK: "WALK",
    JOGGING: "JOGGING",
    RUNNING_CURRENT: "RUNNING_CURRENT",
    MIXED: "MIXED",
  });
});

test("ELAPSED-PARSER-SUPPORTS-HOURS", () => {
  assert.equal(wiring.parseElapsedText("07:30"), 450);
  assert.equal(wiring.parseElapsedText("1:02:03"), 3723);
});

test("SEGMENT-SPEED-IS-DERIVED-WITHOUT-GAIT-AUTODETECTION", () => {
  const walk = wiring.createMobileSegmentAnalysis({ gaitId: "WALK", startDistanceKm: 0, endDistanceKm: 0.9, startElapsedSeconds: 0, endElapsedSeconds: 600 });
  close(walk.speedMps, 1.5);
  assert.equal(walk.gaitId, "WALK");
  assert.equal(walk.coverage.strictAll12, true);
  assert.equal(walk.coverage.availableRegionCount, 12);
});

test("JOG-STRICT-BAND-IS-USED", () => {
  const jog = wiring.createMobileSegmentAnalysis({ gaitId: "JOGGING", startDistanceKm: 1, endDistanceKm: 2.5, startElapsedSeconds: 100, endElapsedSeconds: 700 });
  close(jog.speedMps, 2.5);
  assert.equal(jog.coverage.strictAll12, true);
  assert.equal(jog.coverage.availableRegionCount, 12);
});

test("RUNNING-CURRENT-IS-A-POINTER-NOT-RECALCULATED", () => {
  const run = wiring.createMobileSegmentAnalysis({ gaitId: "RUNNING_CURRENT", startDistanceKm: 0, endDistanceKm: 1.5, startElapsedSeconds: 0, endElapsedSeconds: 600 });
  assert.equal(run.coverage.outputStatus, "USE_EXISTING_RUNNING_CURRENT_ENGINE");
  assert.equal(run.coverage.regions, null);
  assert.equal(run.coverage.availableRegionCount, null);
});

test("NO-PROVISIONAL-TRANSITION-IS-ENABLED-BY-WIRING", () => {
  const walk = wiring.createMobileSegmentAnalysis({ gaitId: "WALK", startDistanceKm: 0, endDistanceKm: 1.2, startElapsedSeconds: 0, endElapsedSeconds: 600 });
  close(walk.speedMps, 2.0);
  assert.equal(walk.coverage.strictAll12, false);
  assert.ok(walk.coverage.availableRegionCount < 12);
  assert.equal(walk.coverage.provisionalRegionCount, 0);
});

test("MIXED-SEGMENTS-REMAIN-SEPARATE", () => {
  const walk = wiring.createMobileSegmentAnalysis({ gaitId: "WALK", startDistanceKm: 0, endDistanceKm: 0.45, startElapsedSeconds: 0, endElapsedSeconds: 300 });
  const jog = wiring.createMobileSegmentAnalysis({ gaitId: "JOGGING", startDistanceKm: 0.45, endDistanceKm: 1.2, startElapsedSeconds: 300, endElapsedSeconds: 600 });
  assert.equal(walk.gaitId, "WALK");
  assert.equal(jog.gaitId, "JOGGING");
  assert.notEqual(walk.coverage.regions[4].constructId, jog.coverage.regions[4].constructId);
});

test("WIRING-DOES-NOT-IMPORT-PRIMARY-RUNNING-ENGINE", () => {
  const source = fs.readFileSync("ui/mobileWalkJogMeasurementWiring.js", "utf8");
  assert.ok(!source.includes("primaryModelEngine"));
  assert.ok(!source.includes("primaryInputProcessing"));
  assert.ok(!source.includes("primaryModelResults"));
});

test("EXISTING-RUN-MEASUREMENT-STATE-IS-NOT-EDITED-FOR-GAIT-SCHEMA", () => {
  const source = fs.readFileSync("ui/runMeasurementState.js", "utf8");
  assert.ok(!source.includes("mobileActivityIdentity"));
  assert.ok(!source.includes("mobileWalkJog"));
});

for (const result of results) console.log(`${result.status}\t${result.id}${result.message ? `\t${result.message}` : ""}`);
if (results.some((result) => result.status === "FAIL")) process.exitCode = 1;
