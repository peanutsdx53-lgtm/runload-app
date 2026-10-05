import assert from "node:assert/strict";
import fs from "node:fs";

const commonRecord = fs.readFileSync("screens/recordInputScreen.js", "utf8");
const mobileRecord = fs.readFileSync("screens/mobile/recordInputScreen.js", "utf8");
const desktopRecord = fs.readFileSync("screens/desktop/recordInputScreen.js", "utf8");
const css = fs.readFileSync("styles/mobile-usability.css", "utf8");

assert.doesNotMatch(commonRecord, /mobileLayout|mobile-record|desktop-|pc-/);
assert.match(mobileRecord, /class="mobile-record-wellbeing"/);
assert.match(mobileRecord, /data-mobile-record-wellbeing data-run-fields/);
assert.match(mobileRecord, /renderRofJInlineAndOverlay\(\{ services, linkedRunId, editing \}\)/);
assert.match(mobileRecord, /class="mobile-save-bar"/);
assert.doesNotMatch(desktopRecord, /mobile-record|mobile-save-bar/);
assert.match(css, /\.activity-toggle input:checked \+ span \{[\s\S]*?background: var\(--color-accent\);/);
assert.match(css, /\.activity-toggle input:not\(:checked\) \+ span[\s\S]*?background: var\(--color-surface\);/);
assert.match(css, /\.mobile-record-wellbeing \.fatigue-inline/);

console.log("mobileRecordInputContract.test.mjs: PASS");
