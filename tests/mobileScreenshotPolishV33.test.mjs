import fs from "node:fs";
import assert from "node:assert/strict";

const index = fs.readFileSync("index.html", "utf8");
const css = fs.readFileSync("styles/mobile-screenshot-polish-v33.css", "utf8");

const checks = [];
function test(id, fn) {
  try { fn(); checks.push({ id, status: "PASS" }); }
  catch (error) { checks.push({ id, status: "FAIL", message: String(error?.stack || error) }); }
}

test("POLISH-LAYER-LOADS-LAST", () => {
  assert.ok(index.includes('href="./styles/mobile-screenshot-polish-v33.css"'));
  assert.ok(index.indexOf("mobile-screenshot-polish-v33.css") > index.indexOf("interpretation-loop-v53.css"));
});

test("HOME-ROW3-LABELS-REMAIN-CLEAR", () => {
  assert.ok(css.includes("grid-auto-rows: 112px"));
  assert.ok(css.includes("mobile-home-page-dot:only-child"));
  assert.ok(css.includes("display: none"));
});

test("OVERVIEW-CONTROLS-AND-CONTRAST-ARE-UNIFIED", () => {
  assert.ok(css.includes(".mobile-home-overview__back"));
  assert.ok(css.includes("min-width: 82px"));
  assert.ok(css.includes("#f8fbfd"));
});

test("RESULT-REMOVES-DUPLICATE-ORIENTATION-CARD", () => {
  assert.ok(css.includes(".result-mobile-layout:has(.run-capsule) .mobile-result-highlights"));
  assert.ok(css.includes(".region-sheet .focus-summary > span"));
});

test("REGION-SHEET-PREVENTS-AWKWARD-WRAPS", () => {
  assert.ok(css.includes(".region-copy-pc"));
  assert.ok(css.includes(".region-metric-pc"));
  assert.ok(css.includes("display: none !important"));
  assert.ok(css.includes(".region-copy-mobile"));
  assert.ok(css.includes("white-space: nowrap"));
  assert.ok(css.includes('button[data-action="close-result-region-sheet"]'));
  assert.ok(css.includes("aspect-ratio: 1"));
});

test("DETAIL-REFERENCE-STAYS-ON-ONE-LINE", () => {
  assert.ok(css.includes(".mobile-detail-reference"));
  assert.ok(css.includes("width: max-content"));
});

const failed = checks.filter((item) => item.status !== "PASS");
console.log(JSON.stringify({ suite: "Mobile Screenshot Polish V33", total: checks.length, passed: checks.length - failed.length, failed: failed.length, status: failed.length ? "FAIL" : "PASS", checks }, null, 2));
if (failed.length) process.exit(1);
