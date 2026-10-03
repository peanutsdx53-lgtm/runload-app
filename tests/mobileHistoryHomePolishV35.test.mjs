import fs from "node:fs";
import assert from "node:assert/strict";

const index = fs.readFileSync("index.html", "utf8");
const css = fs.readFileSync("styles/mobile-screenshot-polish-v35.css", "utf8");
assert.ok(index.includes('styles/mobile-screenshot-polish-v35.css'));
assert.match(css, /mobile-history-mode\s*\{[\s\S]*grid-template-columns:\s*repeat\(3,/);
assert.match(css, /selected-action-zone\s*\{[\s\S]*display:\s*grid;[\s\S]*gap:\s*12px;/);
assert.match(css, /mobile-home-os:not\(\.is-home-editing\) \.mobile-home-grid\s*\{[\s\S]*padding-top:\s*30px;/);
assert.match(css, /max-height:\s*42rem[\s\S]*padding-top:\s*8px;/);
console.log("mobileHistoryHomePolishV35.test.mjs: PASS");
