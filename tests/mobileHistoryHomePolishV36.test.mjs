import fs from "node:fs";
import assert from "node:assert/strict";

const index = fs.readFileSync("index.html", "utf8");
const css = fs.readFileSync("styles/mobile-screenshot-polish-v36.css", "utf8");

assert.ok(index.includes('styles/mobile-screenshot-polish-v36.css'));
assert.ok(index.indexOf('mobile-screenshot-polish-v35.css') < index.indexOf('mobile-screenshot-polish-v36.css'));
assert.match(css, /self-understanding-history-filter\s*\{[\s\S]*grid-template-columns:\s*repeat\(3,/);
assert.match(css, /self-understanding-history-filter a\s*\{[\s\S]*white-space:\s*nowrap;/);
assert.match(css, /mobile-home-os:not\(\.is-home-editing\) \.mobile-home-grid\s*\{[\s\S]*calc\(100dvh - 712px\)/);
assert.match(css, /max-height:\s*42rem[\s\S]*padding-top:\s*8px;/);
console.log("mobileHistoryHomePolishV36.test.mjs: PASS");
