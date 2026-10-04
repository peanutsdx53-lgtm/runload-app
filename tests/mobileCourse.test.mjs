import assert from "node:assert/strict";
import fs from "node:fs";

const editor=fs.readFileSync("screens/courseEditorScreen.js","utf8");
const library=fs.readFileSync("screens/mobile/courseLibraryScreen.js","utf8");
const gpx=fs.readFileSync("screens/mobile/gpxAnalysisScreen.js","utf8");
const interactions=fs.readFileSync("ui/interactions/courseInteractions.js","utf8");
const css=fs.readFileSync("styles/mobile-course.css","utf8");
const index=fs.readFileSync("index.html","utf8");
const version=fs.readFileSync("ui/appVersionStatus.js","utf8");
const worker=fs.readFileSync("service-worker.js","utf8");
const history=fs.readFileSync("docs/MOBILE_RELEASE_HISTORY.md","utf8");

assert.match(editor,/matchesMobileLayout\(\)\?renderMobileCourseEditor/);
assert.match(editor,/data-course-grade-family="PROFILE"/);
assert.match(editor,/data-course-grade-method-panel/);
assert.match(editor,/surface-mix-grid/);
assert.match(editor,/data-course-summary-name/);
const mobileEditor=editor.slice(editor.indexOf("function renderMobileCourseEditor"),editor.indexOf("function renderDesktopCourseEditor"));
assert.ok(!mobileEditor.includes("gpx-inline"),"mobile editor must not duplicate the GPX route");
assert.match(library,/course-mobile-gpx-link/);
assert.match(gpx,/GPXから坂道を入力/);
assert.match(interactions,/function updateMobileSummary/);
assert.match(interactions,/data-course-grade-family/);
assert.match(css,/surface-mix-item > span:first-child/);
assert.match(index,/mobile-course\.css/);
const currentVersion=version.match(/APP_VERSION = "([^"]+)"/)?.[1]||"";
assert.match(currentVersion,/^\d{4}\.\d{2}\.\d{2}\.\d+$/,"current release version must remain explicit");
assert.ok(worker.includes(`running-record-app-runtime-${currentVersion}`),"service-worker release cache must match the current explicit app version");
assert.match(worker,/mobile-course\.css/);
assert.match(history,/APP v2026\.09\.30\.16 — Screenshot-guided Course Refinement 1/);

console.log("mobileCourse.test.mjs: PASS");
