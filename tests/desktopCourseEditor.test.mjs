import assert from "node:assert/strict";
import fs from "node:fs";

const read = (path) => fs.readFileSync(path, "utf8");
const css = read("styles/desktop-course-editor.css");
const interactions = read("ui/interactions/courseInteractions.js");
const index = read("index.html");
const platformStyles = read("ui/platformStyles.js");
const worker = read("service-worker.js");

assert.match(css, /\[data-course-section-row\]\[hidden\][\s\S]*display:\s*none\s*!important/);
assert.match(css, /\.screen--course-editor \.mode button\.active[\s\S]*color-selection-surface/);
assert.match(css, /data-course-grade-summary[\s\S]*7\.5rem/);
assert.match(css, /data-course-surface-mixed[\s\S]*7\.25rem/);
assert.match(css, /editor-actions \.primary[\s\S]*width:\s*17rem\s*!important/);
assert.match(interactions, /Math\.max\(1,\s*lastUsed \+ 1\)/);
assert.match(interactions, /add-course-section[\s\S]*Math\.min\(5,\s*current \+ 1\)/);
assert.ok(platformStyles.includes('./styles/desktop-course-editor.css'));
assert.ok(worker.includes('./styles/desktop-course-editor.css'));

console.log("desktopCourseEditor.test.mjs: PASS");
