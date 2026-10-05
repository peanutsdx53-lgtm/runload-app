import fs from "node:fs";
import assert from "node:assert/strict";

const index = fs.readFileSync("index.html", "utf8");
const platformStyles = fs.readFileSync("ui/platformStyles.js", "utf8");
const worker = fs.readFileSync("service-worker.js", "utf8");
const css = fs.readFileSync("styles/mobile-home-responsive.css", "utf8");

assert.ok(platformStyles.includes('styles/mobile-home-responsive.css'));
assert.ok(worker.includes('styles/mobile-home-responsive.css'));
assert.ok(platformStyles.indexOf('interpretation-loop.css') < platformStyles.indexOf('mobile-home-responsive.css'));
assert.ok(css.includes('grid-auto-rows: 112px'));
assert.ok(css.includes('grid-auto-rows: 120px'));
assert.ok(css.includes('mobile-home-page-dot:only-child'));
assert.ok(css.includes('.mobile-home-overview__back'));
assert.ok(css.includes('min-width: 82px'));
assert.ok(css.includes('.mobile-home-overview-card--small'));
assert.ok(css.includes('.mobile-home-overview-card--wide'));
assert.ok(css.includes('var(--color-accent-soft)'));
assert.ok(!css.includes('--color-acccent-soft'));

console.log('mobileHomeResponsive.test.mjs: PASS');
