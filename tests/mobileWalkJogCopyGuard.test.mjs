import fs from "node:fs";
import assert from "node:assert/strict";

const source = fs.readFileSync("ui/mobileWalkJogCopyGuard.js", "utf8");
const screen = fs.readFileSync("screens/mobile/runMeasurementScreen.js", "utf8");
const versionPanel = fs.readFileSync("ui/appVersionStatus.js", "utf8");
const results = [];

function test(id, fn) {
  try { fn(); results.push({ id, status: "PASS" }); }
  catch (error) { results.push({ id, status: "FAIL", message: String(error?.stack || error) }); }
}

test("COPY-GUARD-IS-MOBILE-ONLY", () => {
  assert.ok(source.includes("matchesMobileLayout"));
  assert.ok(source.includes('if (BOUND_ROOTS.has(root) || !matchesMobileLayout()) return;'));
});

test("MEASUREMENT-MODE-COPY-IS-ACTIVITY-NEUTRAL", () => {
  for (const text of ["自由に測る", "時間を決めて測る", "距離を決めて測る"]) {
    assert.ok(source.includes(text), `missing ${text}`);
  }
  for (const text of ["自由に走る", "時間を決めて走る", "距離を決めて走る"]) {
    assert.ok(!source.includes(text), `legacy activity-specific copy remains: ${text}`);
  }
});

test("PREP-SCREEN-USES-UNIVERSAL-COPY", () => {
  for (const text of ["活動と測定方法", "活動と測定方法を選びます。", "運動前の疲労感", "測定が完了しました"]) {
    assert.ok(screen.includes(text), `missing ${text}`);
  }
  assert.ok(!screen.includes("今日はどう走りますか"));
});

test("SHARED-UPDATE-COPY-IS-PLAIN-LANGUAGE", () => {
  assert.ok(versionPanel.includes("最新版を再読み込み"));
  assert.ok(!versionPanel.includes("更新状態を初期化"));
});

test("COPY-GUARD-DOES-NOT-IMPORT-PRIMARY-ENGINE", () => {
  assert.ok(!source.includes("primaryModelEngine"));
  assert.ok(!source.includes("primaryInputProcessing"));
  assert.ok(!source.includes("primaryModelResults"));
});

for (const result of results) console.log(`${result.status}\t${result.id}${result.message ? `\t${result.message}` : ""}`);
if (results.some((result) => result.status === "FAIL")) process.exitCode = 1;
