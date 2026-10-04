import assert from "node:assert/strict";
import fs from "node:fs";

const record = fs.readFileSync("screens/recordInputScreen.js", "utf8");
const css = fs.readFileSync("styles/mobile-usability.css", "utf8");

assert.match(record, /mobileLayout \? "" : renderRofJInlineAndOverlay\(\{ services, linkedRunId, editing \}\)/);
assert.match(record, /class="mobile-record-wellbeing"/);
assert.match(record, /data-mobile-record-wellbeing data-run-fields/);
assert.ok(
  record.indexOf('class="activity-field"') < record.indexOf('class="mobile-record-wellbeing"'),
  "required activity choice must appear before optional wellbeing",
);
assert.match(css, /\.activity-toggle input:checked \+ span \{[\s\S]*?background: var\(--color-accent\);/);
assert.match(css, /\.activity-toggle input:not\(:checked\) \+ span[\s\S]*?background: var\(--color-surface\);/);
assert.match(css, /\.mobile-record-wellbeing \.fatigue-inline/);

console.log("mobileRecordInputContract.test.mjs: PASS");
