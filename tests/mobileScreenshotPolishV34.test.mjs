import fs from "node:fs";
import assert from "node:assert/strict";

const index = fs.readFileSync("index.html", "utf8");
const css = fs.readFileSync("styles/mobile-screenshot-polish-v34.css", "utf8");
const worker = fs.readFileSync("service-worker.js", "utf8");

assert.ok(index.includes('styles/mobile-screenshot-polish-v34.css'));
assert.ok(worker.includes('styles/mobile-screenshot-polish-v34.css'));
assert.ok(css.includes('grid-auto-rows: 120px'));
assert.ok(css.includes('width: 100px'));
assert.ok(css.includes('inline-size: 44px'));
assert.ok(css.includes('white-space: nowrap'));
assert.ok(css.includes('.mobile-detail-reference'));
assert.ok(css.includes('.mobile-home-overview-card--small'));
assert.ok(css.includes('.mobile-home-overview-card--wide'));
console.log('mobileScreenshotPolishV34.test.mjs: PASS');
