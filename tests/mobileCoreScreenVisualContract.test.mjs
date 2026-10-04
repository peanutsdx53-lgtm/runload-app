import fs from "node:fs";
import assert from "node:assert/strict";

const home = fs.readFileSync("screens/homeScreen.js", "utf8");
const homeCss = fs.readFileSync("styles/mobile-home-editing.css", "utf8");
const record = fs.readFileSync("screens/recordInputScreen.js", "utf8");
const recordCss = fs.readFileSync("styles/mobile-usability.css", "utf8");
const rof = fs.readFileSync("ui/rofJPresentation.js", "utf8");
const rofCss = fs.readFileSync("styles/rof-j-visual.css", "utf8");
const result = fs.readFileSync("screens/resultScreen.js", "utf8");
const runLabCss = fs.readFileSync("styles/mobile-run-lab.css", "utf8");
const version = fs.readFileSync("ui/appVersionStatus.js", "utf8");
const worker = fs.readFileSync("service-worker.js", "utf8");

const checks = [];
function test(id, fn) {
  try { fn(); checks.push({ id, status: "PASS" }); }
  catch (error) { checks.push({ id, status: "FAIL", message: String(error?.stack || error) }); }
}

test("HOME-CONFIRMATION-NOTICE-IS-COMPACT", () => {
  assert.ok(home.includes("次回見ること</small><strong>新しい記録"));
  assert.ok(!home.includes("新しく比較できる記録"));
  assert.ok(homeCss.includes("min-height: 50px"));
  assert.ok(homeCss.includes("white-space: nowrap"));
  assert.ok(homeCss.includes('grid-auto-rows: 112px'));
  assert.ok(homeCss.includes('repeat(var(--home-grid-rows, 3), 112px)'));
});

test("HOME-OVERVIEW-AND-EDIT-SHARE-CONTROL-STYLE", () => {
  assert.ok(home.includes('aria-label="記録概要を開く">概要</button>'));
  assert.ok(homeCss.includes(".mobile-home-overview-open,\n  .mobile-home-os__status"));
  assert.ok(homeCss.includes(".mobile-home-os .mobile-home-overview-open,"));
  assert.ok(homeCss.includes(".mobile-home-os [data-home-edit-toggle]"));
  assert.ok(homeCss.includes("min-width: 82px"));
});

test("RECORD-STAGES-ARE-LEGIBLE-AND-FINAL-STAGE-CLEARS-SAVE-BAR", () => {
  assert.ok(record.includes('<strong>条件</strong><em data-record-stage-status="2">任意</em>'));
  assert.ok(recordCss.includes('padding-bottom: calc(164px + env(safe-area-inset-bottom))'));
  assert.ok(recordCss.includes('[data-record-stage="4"]'));
  assert.ok(recordCss.includes("scroll-margin-bottom"));
});

test("FATIGUE-GUIDE-MATCHES-HORIZONTAL-SLIDER-AND-HIDES-FORMAL-NAME-BY-DEFAULT", () => {
  assert.ok(rof.includes("横軸と同じ向き"));
  assert.ok(rof.includes("疲労感の目安"));
  assert.ok(rofCss.includes("grid-template-columns: repeat(5, minmax(0, 1fr))"));
  assert.ok(rofCss.includes(".rof-author-anchor__descriptor"));
  assert.ok(rofCss.includes("display: none"));
  assert.ok(record.includes("尺度の出典・正式表現"));
  assert.ok(record.includes("正式名称：ROF-J"));
  assert.ok(!record.includes("ROF-Jの目安"));
});

test("RESULT-REMOVES-DUPLICATE-MOBILE-INTRO-AND-COLLAPSES-RUN-LAB", () => {
  assert.ok(result.includes('${capsule ? "" : `<section class="intro">'));
  assert.ok(result.includes('<details class="mobile-run-lab">'));
  assert.ok(runLabCss.includes("details.mobile-run-lab"));
  assert.ok(runLabCss.includes("details.mobile-run-lab[open]"));
  assert.ok(result.indexOf('renderRegional(regionalV2ResultRecord') < result.lastIndexOf('${runLab}${routeLink}'));
  assert.ok(result.includes("見るポイント"));
});

test("RESULT-LEGEND-AND-REGION-SHEET-ARE-COMPACT", () => {
  assert.ok(result.includes("基準100より上"));
  assert.ok(result.includes("基準100付近"));
  assert.ok(result.includes("基準100より下"));
  assert.ok(result.includes("絞り込み表示 ${sortedFocus.length} / 12部位"));
  assert.ok(result.includes("前回 ${fmt(info.prev, 1)}"));
  assert.ok(recordCss.includes(".mobile-list .region-row"));
});

test("VERSION-AND-CACHE-MATCH", () => {
  const appVersion = version.match(/APP_VERSION = "([^"]+)"/)?.[1] || "";
  assert.match(appVersion, /^\d{4}\.\d{2}\.\d{2}\.\d+$/);
  assert.ok(worker.includes(`running-record-app-runtime-${appVersion}`));
});

const failed = checks.filter((item) => item.status !== "PASS");
console.log(JSON.stringify({ suite: "Mobile Core Screen Visual Contract", total: checks.length, passed: checks.length - failed.length, failed: failed.length, status: failed.length ? "FAIL" : "PASS", checks }, null, 2));
if (failed.length) process.exit(1);
