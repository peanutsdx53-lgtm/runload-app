import assert from "node:assert/strict";
import fs from "node:fs";

const editorEntry=fs.readFileSync("screens/mobile/courseEditorScreen.js","utf8");
const sharedEditor=fs.readFileSync("screens/shared/courseEditorScreen.js","utf8");
const library=fs.readFileSync("screens/mobile/courseLibraryScreen.js","utf8");
const gpx=fs.readFileSync("screens/mobile/gpxAnalysisScreen.js","utf8");
const interactions=fs.readFileSync("ui/interactions/courseInteractions.js","utf8");
const css=fs.readFileSync("styles/mobile-course.css","utf8");
const index=fs.readFileSync("index.html","utf8");
const worker=fs.readFileSync("service-worker.js","utf8");

assert.match(editorEntry,/\.\.\/shared\/courseEditorScreen\.js/);
assert.match(sharedEditor,/matchesMobileLayout\(\)\?renderMobileCourseEditor/);
assert.match(sharedEditor,/data-course-grade-family="PROFILE"/);
assert.match(sharedEditor,/data-course-grade-method-panel/);
assert.match(sharedEditor,/surface-mix-grid/);
assert.match(sharedEditor,/data-course-summary-name/);
const mobileEditor=sharedEditor.slice(sharedEditor.indexOf("function renderMobileCourseEditor"),sharedEditor.indexOf("function renderDesktopCourseEditor"));
assert.ok(!mobileEditor.includes("gpx-inline"),"mobile editor must not duplicate the GPX route");
assert.match(library,/course-mobile-gpx-link/);
assert.match(gpx,/GPXから坂道を入力/);
assert.match(interactions,/function updateMobileSummary/);
assert.match(interactions,/data-course-grade-family/);
assert.match(css,/surface-mix-item > span:first-child/);
assert.match(index,/mobile-course\.css/);
assert.match(worker,/screens\/mobile\/courseEditorScreen\.js/);
assert.match(worker,/screens\/shared\/courseEditorScreen\.js/);
assert.match(worker,/mobile-course\.css/);

console.log("mobileCourse.test.mjs: PASS");
