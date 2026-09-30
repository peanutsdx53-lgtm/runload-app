import fs from "node:fs";
import assert from "node:assert/strict";
import {
  createMobileGpsQualityTracker,
  suppressRegionalCoverageForGpsQuality,
} from "../ui/mobileWalkJogGpsQuality.js";
import { applyGpsQualityGateToAnalysis } from "../ui/mobileWalkJogGpsQualityUi.js";
import { normalizeMobileExtensionRecord } from "../ui/mobileWalkJogRecordStore.js";

const results = [];
function test(id, fn) {
  try { fn(); results.push({ id, status: "PASS" }); }
  catch (error) { results.push({ id, status: "FAIL", message: String(error?.stack || error) }); }
}

function quality(overrides = {}) {
  return {
    policy: "SMARTPHONE_EXTENSION_OPERATIONAL_GPS_QUALITY_GATE_V1",
    thresholdMs: 30000,
    hadUsableFix: true,
    maxUnusableGpsMs: 0,
    regionalAnalysisAllowed: true,
    reason: "OK",
    ...overrides,
  };
}

function pending() {
  return {
    version: 1,
    distanceKm: 0.9,
    durationMinutes: 10,
    startedAt: "2026-09-30T00:00:00.000Z",
    endedAt: "2026-09-30T00:10:00.000Z",
    saveRoute: true,
    track: [{ cumulativeDistanceM: 0 }, { cumulativeDistanceM: 900 }],
    acceptedPointCount: 2,
    rejectedPointCount: 0,
  };
}

function walkAnalysis() {
  return {
    version: 1,
    modelVersion: "2026-09-30.v1.3",
    activityId: "WALK",
    provisionalEnabled: false,
    segments: [{
      gaitId: "WALK",
      distanceKm: 0.9,
      durationSeconds: 600,
      speedMps: 1.5,
      speedKmh: 5.4,
      coverage: { strictAll12: true, availableRegionCount: 12, regions: [{ regionId: "R01", index: 100 }] },
    }],
  };
}

test("USABLE-FIX-AND-SHORT-INTERRUPTION-ALLOW-REGIONAL-DISPLAY", () => {
  let clock = 0;
  const tracker = createMobileGpsQualityTracker({ now: () => clock });
  tracker.start("good", clock);
  clock = 1000;
  tracker.observeQuality("error", clock);
  clock = 30999;
  const result = tracker.finish(clock);
  assert.equal(result.regionalAnalysisAllowed, true);
  assert.equal(result.reason, "OK");
  assert.equal(result.maxUnusableGpsMs, 29999);
});

test("MORE-THAN-30S-UNUSABLE-GPS-SUPPRESSES-REGIONAL-DISPLAY", () => {
  let clock = 0;
  const tracker = createMobileGpsQualityTracker({ now: () => clock });
  tracker.start("fair", clock);
  clock = 1000;
  tracker.observeQuality("error", clock);
  clock = 31001;
  const result = tracker.finish(clock);
  assert.equal(result.regionalAnalysisAllowed, false);
  assert.equal(result.reason, "GPS_UNUSABLE_TOO_LONG");
  assert.equal(result.maxUnusableGpsMs, 30001);
});

test("NO-GOOD-OR-FAIR-FIX-SUPPRESSES-REGIONAL-DISPLAY", () => {
  let clock = 0;
  const tracker = createMobileGpsQualityTracker({ now: () => clock });
  tracker.start("waiting", clock);
  clock = 5000;
  tracker.observeQuality("weak", clock);
  clock = 10000;
  const result = tracker.finish(clock);
  assert.equal(result.regionalAnalysisAllowed, false);
  assert.equal(result.reason, "NO_USABLE_GPS_FIX");
});

test("PAUSE-TIME-IS-EXCLUDED-FROM-GPS-INTERRUPTION", () => {
  let clock = 0;
  const tracker = createMobileGpsQualityTracker({ now: () => clock });
  tracker.start("good", clock);
  clock = 1000;
  tracker.observeQuality("error", clock);
  clock = 5000;
  tracker.setPaused(true, clock);
  clock = 65000;
  tracker.setPaused(false, clock);
  clock = 70000;
  tracker.observeQuality("fair", clock);
  const result = tracker.finish(clock);
  assert.equal(result.regionalAnalysisAllowed, true);
  assert.equal(result.maxUnusableGpsMs, 5000);
});

test("GPS-GATE-REMOVES-WALK-JOG-COVERAGE-BUT-KEEPS-RUNNING-POINTER", () => {
  const gate = quality({ regionalAnalysisAllowed: false, reason: "GPS_UNUSABLE_TOO_LONG", maxUnusableGpsMs: 40000 });
  const segments = suppressRegionalCoverageForGpsQuality([
    { gaitId: "WALK", coverage: { regions: [{ index: 100 }] } },
    { gaitId: "RUNNING_CURRENT", coverage: { outputStatus: "USE_EXISTING_RUNNING_CURRENT_ENGINE", regions: null } },
  ], gate);
  assert.equal(segments[0].coverage, null);
  assert.equal(segments[0].regionalOutputStatus, "SUPPRESSED_GPS_QUALITY");
  assert.equal(segments[1].coverage.outputStatus, "USE_EXISTING_RUNNING_CURRENT_ENGINE");
});

test("GATED-ANALYSIS-IS-MARKED-AS-OPERATIONAL-NOT-RESEARCH-THRESHOLD", () => {
  const gate = quality({ regionalAnalysisAllowed: false, reason: "GPS_UNUSABLE_TOO_LONG", maxUnusableGpsMs: 40000 });
  const gated = applyGpsQualityGateToAnalysis(walkAnalysis(), gate);
  assert.equal(gated.qualityGate.basis, "OPERATIONAL_SAFETY_GUARD_NOT_RESEARCH_THRESHOLD");
  assert.equal(gated.segments[0].coverage, null);
});

test("SAVED-WALK-RECORD-DOES-NOT-REINTRODUCE-SUPPRESSED-COVERAGE", () => {
  const gate = quality({ regionalAnalysisAllowed: false, reason: "GPS_UNUSABLE_TOO_LONG", maxUnusableGpsMs: 40000 });
  const gated = applyGpsQualityGateToAnalysis(walkAnalysis(), gate);
  const record = normalizeMobileExtensionRecord({ analysis: gated, pending: pending(), id: "gps-gated", createdAt: "now" });
  assert.equal(record.analysis.qualityGate.regionalAnalysisAllowed, false);
  assert.equal(record.analysis.segments[0].coverage, null);
  assert.equal(record.analysis.segments[0].regionalOutputStatus, "SUPPRESSED_GPS_QUALITY");
});

test("GPS-QUALITY-GUARD-IS-SMARTPHONE-ONLY-AND-DOES-NOT-IMPORT-PRIMARY-ENGINE", () => {
  const ui = fs.readFileSync("ui/mobileWalkJogGpsQualityUi.js", "utf8");
  const history = fs.readFileSync("ui/mobileWalkJogGpsQualityHistoryGuard.js", "utf8");
  assert.ok(ui.includes("matchesMobileLayout"));
  assert.ok(history.includes("matchesMobileLayout"));
  for (const source of [ui, history]) {
    assert.ok(!source.includes("primaryModelEngine"));
    assert.ok(!source.includes("primaryInputProcessing"));
    assert.ok(!source.includes("primaryModelResults"));
  }
});

for (const result of results) console.log(`${result.status}\t${result.id}${result.message ? `\t${result.message}` : ""}`);
if (results.some((result) => result.status === "FAIL")) process.exitCode = 1;
