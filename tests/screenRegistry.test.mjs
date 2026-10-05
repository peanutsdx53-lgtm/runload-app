import assert from "node:assert/strict";
import fs from "node:fs";

const router = fs.readFileSync("screens/screenRegistry.js", "utf8");
const shared = fs.readFileSync("screens/sharedScreenRegistry.js", "utf8");
const desktop = fs.readFileSync("screens/desktopScreenRegistry.js", "utf8");
const mobile = fs.readFileSync("screens/mobileScreenRegistry.js", "utf8");
const app = fs.readFileSync("app.js", "utf8");
const worker = fs.readFileSync("service-worker.js", "utf8");

const mobileOnly = ["run-measurement","location-note","quick-note","gear-note","departure-check","fuel-note","photo-note","pace-tool","achievements"];

assert.match(shared, /export const SHARED_SCREEN_RENDERERS/);
assert.doesNotMatch(shared, /run-measurement|renderDesktopMoreScreen|renderAchievementsScreen/);
assert.match(desktop, /export const DESKTOP_SCREEN_RENDERERS/);
assert.match(desktop, /more: renderMoreScreen/);
assert.match(desktop, /"gpx-analysis": renderGpxAnalysisScreen/);
assert.match(desktop, /"course-library": renderCourseLibraryScreen/);
assert.match(desktop, /"course-editor": renderCourseEditorScreen/);
assert.doesNotMatch(desktop, /run-measurement|renderAchievementsScreen|quickToolsScreen/);
assert.match(mobile, /export const MOBILE_SCREEN_RENDERERS/);
assert.match(mobile, /"gpx-analysis": renderGpxAnalysisScreen/);
assert.match(mobile, /"course-library": renderCourseLibraryScreen/);
assert.match(mobile, /"course-editor": renderCourseEditorScreen/);
assert.doesNotMatch(mobile, /renderMoreScreen/);
for (const screen of mobileOnly) assert.ok(mobile.includes(`"${screen}"`) || mobile.includes(`${screen}:`), `mobile-only screen missing: ${screen}`);
assert.match(router, /await import\("\.\/mobileScreenRegistry\.js"\)/);
assert.match(router, /await import\("\.\/desktopScreenRegistry\.js"\)/);
assert.match(app, /await createScreenRenderers\(\{ mobile: mobileLayout \}\)/);
assert.doesNotMatch(app, /renderRunMeasurementScreen|renderLocationNoteScreen|renderAchievementsScreen/);
for (const item of ["./screens/screenRegistry.js","./screens/sharedScreenRegistry.js","./screens/desktopScreenRegistry.js","./screens/mobileScreenRegistry.js"]) assert.ok(worker.includes(`"${item}"`), item);

console.log("screen registry device boundary: PASS");
