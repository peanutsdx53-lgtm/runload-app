import assert from "node:assert/strict";
import fs from "node:fs";

const sharedEditor=fs.readFileSync("screens/shared/courseEditorScreen.js","utf8");
const mobileEditor=fs.readFileSync("screens/mobile/courseEditorScreen.js","utf8");
const library=fs.readFileSync("screens/mobile/courseLibraryScreen.js","utf8");
const gpx=fs.readFileSync("screens/mobile/gpxAnalysisScreen.js","utf8");
const interactions=fs.readFileSync("ui/interactions/courseInteractions.js","utf8");
const mobileInteractions=fs.readFileSync("ui/interactions/mobileCourseInteractions.js","utf8");
const css=fs.readFileSync("styles/mobile-course.css","utf8");
const index=fs.readFileSync("index.html","utf8");
const platformStyles=fs.readFileSync("ui/platformStyles.js","utf8");
const worker=fs.readFileSync("service-worker.js","utf8");

assert.doesNotMatch(sharedEditor,/matchesMobileLayout|renderMobileCourseEditor|renderDesktopCourseEditor/);
assert.match(mobileEditor,/data-course-grade-family="PROFILE"/);
assert.match(mobileEditor,/data-course-grade-method-panel/);
assert.match(mobileEditor,/surface-mix-grid/);
assert.match(mobileEditor,/data-course-summary-name/);
assert.ok(!mobileEditor.includes("gpx-inline"),"mobile editor must not duplicate the GPX route");
assert.match(library,/course-mobile-gpx-link/);
assert.match(gpx,/ルートファイルから坂道を入力/);
assert.match(mobileInteractions,/const mobileEnhancement = Object\.freeze/);
assert.match(mobileInteractions,/updateSummary\(\{ form, data \}\)/);
assert.match(interactions,/data-course-grade-family/);
assert.match(css,/surface-mix-item > span:first-child/);
assert.match(platformStyles,/mobile-course\.css/);
assert.match(worker,/screens\/mobile\/courseEditorScreen\.js/);
assert.match(worker,/screens\/desktop\/courseEditorScreen\.js/);
assert.match(worker,/screens\/shared\/courseEditorScreen\.js/);
assert.match(worker,/mobile-course\.css/);

console.log("mobileCourse.test.mjs: PASS");
