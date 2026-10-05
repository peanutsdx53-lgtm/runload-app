import fs from "node:fs";
import assert from "node:assert/strict";

const index = fs.readFileSync("index.html", "utf8");
const platformStyles = fs.readFileSync("ui/platformStyles.js", "utf8");
const worker = fs.readFileSync("service-worker.js", "utf8");
const css = fs.readFileSync("styles/mobile-body-part-detail.css", "utf8");

assert.ok(platformStyles.includes('styles/mobile-body-part-detail.css'));
assert.ok(worker.includes('styles/mobile-body-part-detail.css'));
assert.ok(css.includes('.mobile-detail-reference'));
assert.ok(css.includes('width: max-content'));
assert.ok(css.includes('white-space: nowrap'));
assert.ok(css.includes('font-size: clamp(10px, 2.8vw, 12px) !important'));

console.log('mobileBodyPartDetail.test.mjs: PASS');
