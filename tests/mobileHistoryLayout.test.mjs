import fs from "node:fs";
import assert from "node:assert/strict";

const index = fs.readFileSync("index.html", "utf8");
const platformStyles = fs.readFileSync("ui/platformStyles.js", "utf8");
const worker = fs.readFileSync("service-worker.js", "utf8");
const css = fs.readFileSync("styles/mobile-history.css", "utf8");

assert.ok(platformStyles.includes('styles/mobile-history.css'));
assert.ok(worker.includes('"./styles/mobile-history.css"'));
assert.match(css, /mobile-history-mode\s*\{[\s\S]*grid-template-columns:\s*repeat\(3,/);
assert.match(css, /selected-action-zone\s*\{[\s\S]*display:\s*grid;[\s\S]*gap:\s*12px;/);
assert.match(css, /self-understanding-history-filter a\s*\{[\s\S]*white-space:\s*nowrap;/);
assert.match(css, /self-understanding-history-filter\s*\{[\s\S]*grid-template-columns:\s*repeat\(3,/);
assert.doesNotMatch(css, /mobile-home-os/);

console.log("mobileHistoryLayout.test.mjs: PASS");
