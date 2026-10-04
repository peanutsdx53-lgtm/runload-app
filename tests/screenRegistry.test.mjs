import assert from "node:assert/strict";
import fs from "node:fs";

const source = fs.readFileSync("screens/screenRegistry.js", "utf8");
const app = fs.readFileSync("app.js", "utf8");
const worker = fs.readFileSync("service-worker.js", "utf8");

const mobileOnly = [
  "run-measurement",
  "location-note",
  "quick-note",
  "gear-note",
  "departure-check",
  "fuel-note",
  "photo-note",
  "pace-tool",
  "achievements",
];

assert.match(source, /export const SHARED_SCREEN_RENDERERS/);
assert.match(source, /export const MOBILE_SCREEN_RENDERERS/);
for (const screen of mobileOnly) {
  assert.ok(source.includes(`\"${screen}\"`) || source.includes(`${screen}:`), `mobile-only screen missing: ${screen}`);
}
assert.match(source, /\.\.\.\(mobile \? MOBILE_SCREEN_RENDERERS : \{\}\)/);
assert.match(app, /createScreenRenderers\(\{ mobile: matchesMobileLayout\(\) \}\)/);
assert.doesNotMatch(app, /renderRunMeasurementScreen|renderLocationNoteScreen|renderAchievementsScreen/);
assert.ok(worker.includes('"./screens/screenRegistry.js"'));

console.log("screen registry device boundary: PASS");
