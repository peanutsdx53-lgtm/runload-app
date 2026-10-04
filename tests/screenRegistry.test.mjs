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
assert.match(source, /export const DESKTOP_SCREEN_RENDERERS/);
assert.match(source, /export const MOBILE_SCREEN_RENDERERS/);
assert.match(source, /"gpx-analysis": renderDesktopGpxAnalysisScreen/);
assert.match(source, /"gpx-analysis": renderMobileGpxAnalysisScreen/);
assert.match(source, /"course-library": renderDesktopCourseLibraryScreen/);
assert.match(source, /"course-library": renderMobileCourseLibraryScreen/);
assert.ok(worker.includes('"./screens/shared/courseLibraryContext.js"'));
assert.ok(worker.includes('"./screens/desktop/courseLibraryScreen.js"'));
assert.ok(worker.includes('"./screens/mobile/courseLibraryScreen.js"'));
assert.ok(worker.includes('"./screens/desktop/gpxAnalysisScreen.js"'));
assert.ok(worker.includes('"./screens/mobile/gpxAnalysisScreen.js"'));
for (const screen of mobileOnly) {
  assert.ok(source.includes(`\"${screen}\"`) || source.includes(`${screen}:`), `mobile-only screen missing: ${screen}`);
}
assert.match(source, /\.\.\.\(mobile \? MOBILE_SCREEN_RENDERERS : DESKTOP_SCREEN_RENDERERS\)/);
assert.match(app, /createScreenRenderers\(\{ mobile: matchesMobileLayout\(\) \}\)/);
assert.doesNotMatch(app, /renderRunMeasurementScreen|renderLocationNoteScreen|renderAchievementsScreen/);
assert.ok(worker.includes('"./screens/screenRegistry.js"'));

console.log("screen registry device boundary: PASS");
