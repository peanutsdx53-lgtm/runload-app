import fs from "node:fs";
import assert from "node:assert/strict";

const index = fs.readFileSync("index.html", "utf8");
const platformStyles = fs.readFileSync("ui/platformStyles.js", "utf8");
const worker = fs.readFileSync("service-worker.js", "utf8");
const css = fs.readFileSync("styles/mobile-result-region-sheet.css", "utf8");
const resultScreen = fs.readFileSync("screens/mobile/resultScreen.js", "utf8");
const components = fs.readFileSync("styles/components.css", "utf8");

assert.ok(platformStyles.includes('styles/mobile-result-region-sheet.css'));
assert.ok(worker.includes('styles/mobile-result-region-sheet.css'));
assert.ok(css.includes('.result-mobile-layout:has(.run-capsule) .mobile-result-highlights'));
assert.ok(css.includes('.region-sheet .focus-summary > span'));
assert.ok(css.includes('.region-copy-pc'));
assert.ok(css.includes('.region-metric-pc'));
assert.ok(css.includes('display: none !important'));
assert.ok(css.includes('.region-copy-mobile'));
assert.ok(css.includes('white-space: nowrap'));
assert.ok(resultScreen.includes('class="app-utility-button" data-action="close-result-region-sheet"'));
assert.ok(resultScreen.includes('class="app-utility-button__close-symbol"'));
assert.ok(components.includes('.app-utility-button {'));
assert.ok(!css.includes('button[data-action="close-result-region-sheet"]'));
assert.ok(css.includes('width: 100px'));

console.log('mobileResultRegionSheet.test.mjs: PASS');
