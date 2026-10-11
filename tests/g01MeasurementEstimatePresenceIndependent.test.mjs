import test from "node:test";
import assert from "node:assert/strict";
import { savePendingRunMeasurement, peekPendingRunMeasurement, clearPendingRunMeasurement } from "../ui/runMeasurementState.js";

const base = { runId: "no-fake-estimate", saveRoute: false, track: [] };
const energy = { modelId: "compendium", estimatedKcal: 0, met: 8, bodyMassKg: 60,
  averageSpeedKmh: 9, durationMinutes: 30 };
const step = { modelId: "motion", steps: 0, cadenceSpm: 0, activeDurationMinutes: 30 };

test("G01: absent energy output must not be recorded as estimated zero", () => {
  for (const invalid of [null, undefined, "", false, " ", [], {}]) {
    savePendingRunMeasurement({ ...base, energyEstimate: {...energy, estimatedKcal: invalid} });
    assert.equal(peekPendingRunMeasurement().energyEstimate, null, String(invalid));
  }
  savePendingRunMeasurement({ ...base, energyEstimate: energy });
  assert.equal(peekPendingRunMeasurement().energyEstimate.estimatedKcal, 0);
  clearPendingRunMeasurement();
});

test("G01: absent steps and cadence cannot turn into a credible zero", () => {
  for (const field of ["steps", "cadenceSpm"]) {
    for (const invalid of [null, undefined, "", false, " ", [], {}]) {
      savePendingRunMeasurement({ ...base, stepEstimate: {...step, [field]: invalid} });
      assert.equal(peekPendingRunMeasurement().stepEstimate, null, field + String(invalid));
    }
  }
  savePendingRunMeasurement({ ...base, stepEstimate: step });
  assert.equal(peekPendingRunMeasurement().stepEstimate.steps, 0);
  clearPendingRunMeasurement();
});
