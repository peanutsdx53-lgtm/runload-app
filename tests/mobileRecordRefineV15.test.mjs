import assert from "node:assert/strict";
import fs from "node:fs";

const record = fs.readFileSync("screens/recordInputScreen.js", "utf8");
const css = fs.readFileSync("styles/mobile-usability.css", "utf8");
const version = fs.readFileSync("ui/appVersionStatus.js", "utf8");
const worker = fs.readFileSync("service-worker.js", "utf8");
const history = fs.readFileSync("docs/MOBILE_RELEASE_HISTORY.md", "utf8");

assert.match(record, /mobileLayout \? "" : renderRofJInlineAndOverlay\(\{ services, linkedRunId, editing \}\)/);
assert.match(record, /class="mobile-record-wellbeing"/);
assert.match(record, /data-mobile-record-wellbeing data-run-fields/);
assert.ok(record.indexOf('class="activity-field"') < record.indexOf('class="mobile-record-wellbeing"'), "required activity choice must appear before optional wellbeing");
assert.match(css, /Mobile record refinement v15/);
assert.match(css, /\.activity-toggle input:checked \+ span \{[\s\S]*?background: var\(--color-accent\);/);
assert.match(css, /\.activity-toggle input:not\(:checked\) \+ span[\s\S]*?background: var\(--color-surface\);/);
assert.match(css, /\.mobile-record-wellbeing \.fatigue-inline/);
const currentVersion = version.match(/APP_VERSION = "([0-9.]+)"/)?.[1];
assert.match(currentVersion || "", /^\d{4}\.\d{2}\.\d{2}\.\d+$/);
assert.ok(worker.includes(`running-record-app-runtime-${currentVersion}`));
assert.match(history, /APP v2026\.09\.30\.15 — Screenshot-guided Record Refinement 1/);
console.log("mobileRecordRefineV15.test.mjs: PASS");
