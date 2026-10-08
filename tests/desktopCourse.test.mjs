import assert from "node:assert/strict";
import fs from "node:fs";

const css = fs.readFileSync("styles/desktop-course.css", "utf8");
const index = fs.readFileSync("index.html", "utf8");
const platformStyles = fs.readFileSync("ui/platformStyles.js", "utf8");
const version = fs.readFileSync("ui/appVersionStatus.js", "utf8");
const worker = fs.readFileSync("service-worker.js", "utf8");

assert.match(css, /@media \(min-width: 55rem\)/, "PC refinement must be desktop-scoped");
assert.match(css, /screen--course-editor[\s\S]*#course-editor-form[\s\S]*grid-template-columns/, "editor must use desktop width");
assert.match(css, /\.gpx-inline\s*\{[\s\S]*display:\s*none/, "editor GPX shortcut must be demoted on PC");
assert.match(css, /data-course-surface-mixed[\s\S]*repeat\(2/, "surface percentage entry must use two desktop columns");
assert.match(css, /screen--course-library[\s\S]*\.list[\s\S]*repeat\(2/, "saved courses must use a two-column desktop browser");
assert.match(css, /screen--gpx-analysis[\s\S]*\.summary-grid[\s\S]*repeat\(4/, "GPX summary must use four desktop columns");
assert.match(platformStyles, /styles\/desktop-course\.css/, "desktop course stylesheet must be loaded");
const currentVersion = version.match(/APP_VERSION = "([^"]+)"/)?.[1] || "";
assert.match(currentVersion, /^\d{4}\.\d{2}\.\d{2}\.\d+$/, "visible app version must use the current version format");
assert.ok(worker.includes(`running-record-app-runtime-${currentVersion}`), "PWA cache must match the current app version");
assert.match(worker, /\.\/styles\/desktop-course\.css/, "desktop course stylesheet must be precached");

console.log("desktopCourse.test.mjs: PASS");
