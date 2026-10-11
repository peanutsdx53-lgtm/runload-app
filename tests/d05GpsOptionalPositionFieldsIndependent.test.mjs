import test from "node:test";
import assert from "node:assert/strict";
import { normalizeGeolocationPosition } from "../ui/runMeasurementCore.js";

const position = (extra = {}, timestamp = 1700000000000) => ({
  coords: { latitude: 35, longitude: 139, accuracy: 5,
    altitude: null, altitudeAccuracy: null, speed: null, ...extra },
  timestamp,
});

test("D05: missing optional sensor metadata does not become measured zero", () => {
  const fields = { altitude: "altitudeM", altitudeAccuracy: "altitudeAccuracyM", speed: "reportedSpeedMps" };
  for (const [input, output] of Object.entries(fields)) {
    for (const bad of ["", false, true, "0", "10", "   ", {}, []]) {
      const observed = normalizeGeolocationPosition(position({ [input]: bad }));
      assert.notEqual(observed, null, "valid core coordinates remain available");
      assert.equal(observed[output], null, input + " " + String(bad));
    }
    assert.equal(normalizeGeolocationPosition(position({ [input]: 0 }))[output], 0);
  }
  assert.equal(normalizeGeolocationPosition(position({ altitudeAccuracy: -1 })).altitudeAccuracyM, null);
  assert.equal(normalizeGeolocationPosition(position({ speed: -1 })).reportedSpeedMps, null);
});

test("D05: malformed Position.timestamp must not be replaced by Date.now", () => {
  for (const timestamp of [undefined, null, "", false, "1700000000000", NaN, Infinity, -1]) {
    assert.equal(normalizeGeolocationPosition(position({}, timestamp)), null);
  }
  assert.equal(normalizeGeolocationPosition(position({}, 0)).timestamp, 0);
});
