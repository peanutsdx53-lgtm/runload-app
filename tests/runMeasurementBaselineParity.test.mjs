import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const read = (path) => fs.readFileSync(path, "utf8");
const desktop = read("screens/desktop/runMeasurementScreen.js");
const mobile = read("screens/mobile/runMeasurementScreen.js");
const desktopRegistry = read("screens/desktopScreenRegistry.js");
const mobileRegistry = read("screens/mobileScreenRegistry.js");
const worker = read("service-worker.js");

test("desktop preserves the baseline smartphone-only measurement fallback", () => {
  assert.match(desktop, /ランニング測定はスマホ版の機能です/);
  assert.match(desktop, /PC版では記録・結果・履歴・予定の確認と入力を利用できます/);
  assert.match(desktop, /href="#\/home"/);
  assert.match(desktopRegistry, /"run-measurement": renderRunMeasurementScreen/);
  assert.ok(worker.includes('./screens/desktop/runMeasurementScreen.js'));
});

test("mobile keeps the actual measurement screen", () => {
  assert.match(mobile, /renderRunMeasurementScreen/);
  assert.doesNotMatch(mobile, /スマホ版の機能です/);
  assert.match(mobileRegistry, /"run-measurement": renderRunMeasurementScreen/);
});
