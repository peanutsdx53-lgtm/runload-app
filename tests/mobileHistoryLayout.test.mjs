import fs from "node:fs";
import assert from "node:assert/strict";

const index = fs.readFileSync("index.html", "utf8");
const worker = fs.readFileSync("service-worker.js", "utf8");
const css = fs.readFileSync("styles/mobile-history.css", "utf8");

assert.ok(index.includes('styles/mobile-history.css'));
assert.ok(!index.includes('styles/mobile-screenshot-polish-v35.css'));
assert.ok(worker.includes('"./styles/mobile-history.css"'));
assert.ok(!worker.includes('"./styles/mobile-screenshot-polish-v35.css"'));
assert.match(css, /mobile-history-mode\s*\{[\s\S]*grid-template-columns:\s*repeat\(3,/);
assert.match(css, /selected-action-zone\s*\{[\s\S]*display:\s*grid;[\s\S]*gap:\s*12px;/);
assert.doesNotMatch(css, /mobile-home-os/);

console.log("mobileHistoryLayout.test.mjs: PASS");
