import fs from "node:fs";
import assert from "node:assert/strict";

const source = fs.readFileSync("core/internal/mobileWalkJogSpeedModel.js", "utf8");
const model = await import(`data:text/javascript;base64,${Buffer.from(source).toString("base64")}`);

const results = [];
function test(id, fn) {
  try {
    fn();
    results.push({ id, status: "PASS" });
  } catch (error) {
    results.push({ id, status: "FAIL", message: String(error?.stack || error) });
  }
}
function close(actual, expected, tolerance = 1e-3) {
  assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} != ${expected}`);
}

test("MODEL-IS-ISOLATED-FROM-EXISTING-APP-ENTRY", () => {
  const app = fs.readFileSync("app.js", "utf8");
  assert.ok(!app.includes("mobileWalkJogSpeedModel"));
});

test("STRICT-BANDS-ARE-FROZEN", () => {
  close(model.STRICT_ALL12_BANDS.WALK.minMps, 85 / 60, 1e-12);
  close(model.STRICT_ALL12_BANDS.WALK.maxMps, 1.75, 1e-12);
  close(model.STRICT_ALL12_BANDS.JOGGING.minMps, 2.1, 1e-12);
  close(model.STRICT_ALL12_BANDS.JOGGING.maxMps, 2.5, 1e-12);
});

test("WALK-REF-150-IS-100-FOR-ALL-REGIONS", () => {
  const summary = model.summarizeMobileWalkJogCoverage({ gaitId: "WALK", speedMps: 1.5 });
  assert.equal(summary.availableRegionCount, 12);
  assert.equal(summary.strictAll12, true);
  for (const region of summary.regions) close(region.index, 100, 1e-8);
});

test("WALK-STRICT-BOUNDARIES-HAVE-ALL12", () => {
  assert.equal(model.summarizeMobileWalkJogCoverage({ gaitId: "WALK", speedMps: 85 / 60 }).all12Available, true);
  assert.equal(model.summarizeMobileWalkJogCoverage({ gaitId: "WALK", speedMps: 1.75 }).all12Available, true);
  assert.equal(model.hasStrictAll12Coverage("WALK", 1.75), true);
});

test("WALK-R05-BELOW-WARD-BOUNDARY-DOES-NOT-FABRICATE", () => {
  const result = model.evaluateMobileWalkJogRegion({ gaitId: "WALK", regionId: "R05", speedMps: 1.4 });
  assert.equal(result.index, null);
  assert.equal(result.outputStatus, "NO_OUTPUT");
});

test("KEULER-WALK-R09-SOURCE-ANCHORS", () => {
  close(model.evaluateMobileWalkJogRegion({ gaitId: "WALK", regionId: "R09", speedMps: 1.0 }).index, 40.7 / 44.9 * 100);
  close(model.evaluateMobileWalkJogRegion({ gaitId: "WALK", regionId: "R09", speedMps: 2.0 }).index, 47.9 / 44.9 * 100);
});

test("JOG-REF-250-IS-100-FOR-ALL-REGIONS", () => {
  const summary = model.summarizeMobileWalkJogCoverage({ gaitId: "JOGGING", speedMps: 2.5 });
  assert.equal(summary.availableRegionCount, 12);
  assert.equal(summary.strictAll12, true);
  for (const region of summary.regions) close(region.index, 100, 1e-8);
});

test("JOG-STRICT-LOWER-BOUND-HAS-ALL12", () => {
  const summary = model.summarizeMobileWalkJogCoverage({ gaitId: "JOGGING", speedMps: 2.1 });
  assert.equal(summary.availableRegionCount, 12);
  assert.equal(summary.strictAll12, true);
  close(summary.regions.find((r) => r.regionId === "R05").index, 88.617886, 1e-3);
  close(summary.regions.find((r) => r.regionId === "R06").index, 89.62581, 1e-3);
});

test("HAMNER-CORRECTED-PANEL-DERIVED-VALUES-ARE-USED", () => {
  close(model.evaluateMobileWalkJogRegion({ gaitId: "JOGGING", regionId: "R02", speedMps: 2.1 }).index, 97.9525, 0.08);
  close(model.evaluateMobileWalkJogRegion({ gaitId: "JOGGING", regionId: "R03", speedMps: 2.1 }).index, 94.7554, 0.08);
  close(model.evaluateMobileWalkJogRegion({ gaitId: "JOGGING", regionId: "R04", speedMps: 2.1 }).index, 88.6373, 0.08);
  close(model.evaluateMobileWalkJogRegion({ gaitId: "JOGGING", regionId: "R07", speedMps: 2.1 }).index, 101.5667, 0.08);
});

test("JOG-AND-RUNNING-CURRENT-OVERLAP-WITHOUT-BRIDGE", () => {
  assert.equal(model.hasStrictAll12Coverage("JOGGING", 2.25), true);
  assert.ok(model.STRICT_ALL12_BANDS.RUNNING_CURRENT_POINTER.minMps <= 2.25);
  assert.ok(model.STRICT_ALL12_BANDS.JOGGING.maxMps >= 2.25);
});

test("P1-IS-EXPLICIT-AND-OFF-BY-DEFAULT", () => {
  const strict = model.evaluateMobileWalkJogRegion({ gaitId: "JOGGING", regionId: "R05", speedMps: 2.0 });
  assert.equal(strict.index, null);
  const p1 = model.evaluateMobileWalkJogRegion({ gaitId: "JOGGING", regionId: "R05", speedMps: 2.0, allowProvisional: true });
  assert.equal(p1.outputStatus, "PROVISIONAL");
  assert.equal(p1.evidenceTier, "P1_PROVISIONAL_BOUNDED_EXTENSION");
  close(p1.index, 85.772358, 1e-3);
});

test("WALK-P1-CAN-CLOSE-TRANSITION-TO-2P0-WITHOUT-CROSS-GAIT-MULTIPLIER", () => {
  const strict = model.summarizeMobileWalkJogCoverage({ gaitId: "WALK", speedMps: 2.0 });
  assert.ok(strict.availableRegionCount < 12);
  const p1 = model.summarizeMobileWalkJogCoverage({ gaitId: "WALK", speedMps: 2.0, allowProvisional: true });
  assert.equal(p1.availableRegionCount, 12);
  assert.ok(p1.provisionalRegionCount > 0);
});

test("SAME-SPEED-GAIT-IDENTITY-KEEPS-CONSTRUCTS-SEPARATE", () => {
  const walk = model.evaluateMobileWalkJogRegion({ gaitId: "WALK", regionId: "R05", speedMps: 2.0 });
  const jog = model.evaluateMobileWalkJogRegion({ gaitId: "JOGGING", regionId: "R05", speedMps: 2.0, allowProvisional: true });
  assert.notEqual(walk.constructId, jog.constructId);
});

test("NO-RUNNING-CURRENT-CALCULATION-IS-DEFINED-HERE", () => {
  assert.equal(model.getMobileWalkJogRoute("RUNNING_CURRENT", "R01"), null);
  assert.deepEqual(model.evaluateMobileWalkJogAllRegions({ gaitId: "RUNNING_CURRENT", speedMps: 2.5 }), []);
});

for (const result of results) {
  console.log(`${result.status}\t${result.id}${result.message ? `\t${result.message}` : ""}`);
}
const failed = results.filter((result) => result.status === "FAIL");
if (failed.length) process.exitCode = 1;
