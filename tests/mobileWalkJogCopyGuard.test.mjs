import fs from "node:fs";
import assert from "node:assert/strict";

const source = fs.readFileSync("ui/mobileWalkJogCopyGuard.js", "utf8");
const results = [];

function test(id, fn) {
  try { fn(); results.push({ id, status: "PASS" }); }
  catch (error) { results.push({ id, status: "FAIL", message: String(error?.stack || error) }); }
}

test("COPY-GUARD-IS-MOBILE-ONLY", () => {
  assert.ok(source.includes('matchesMobileLayout'));
  assert.ok(source.includes('if (BOUND_ROOTS.has(root) || !matchesMobileLayout()) return;'));
});

test("EXTENSION-COPY-REMOVES-RUNNING-ONLY-WORDING", () => {
  for (const text of [
    "今日はどう動きますか",
    "自由に測る",
    "時間を決めて測る",
    "距離を決めて測る",
    "移動地図",
    "活動を測定しました",
  ]) assert.ok(source.includes(text), `missing ${text}`);
});

test("RUNNING-COPY-REMAINS-RESTORABLE", () => {
  for (const text of [
    "今日はどう走りますか",
    "自由に走る",
    "時間を決めて走る",
    "距離を決めて走る",
    "走行地図",
    "走行を測定しました",
  ]) assert.ok(source.includes(text), `missing ${text}`);
});

test("COPY-GUARD-DOES-NOT-IMPORT-PRIMARY-ENGINE", () => {
  assert.ok(!source.includes("primaryModelEngine"));
  assert.ok(!source.includes("primaryInputProcessing"));
  assert.ok(!source.includes("primaryModelResults"));
});

for (const result of results) console.log(`${result.status}\t${result.id}${result.message ? `\t${result.message}` : ""}`);
if (results.some((result) => result.status === "FAIL")) process.exitCode = 1;
