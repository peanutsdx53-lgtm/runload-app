import fs from "node:fs";
import assert from "node:assert/strict";

const history = fs.readFileSync("ui/mobileWalkJogHistoryUi.js", "utf8");
const saveLink = fs.readFileSync("ui/mobileWalkJogSaveHistoryLink.js", "utf8");
const canonicalHistory = fs.readFileSync("screens/historyScreen.js", "utf8");
const results = [];

function test(id, fn) {
  try { fn(); results.push({ id, status: "PASS" }); }
  catch (error) { results.push({ id, status: "FAIL", message: String(error?.stack || error) }); }
}

test("HISTORY-UI-IS-MOBILE-ONLY", () => {
  assert.ok(history.includes("matchesMobileLayout"));
  assert.ok(history.includes('if (!state || !matchesMobileLayout()) return;'));
});

test("HISTORY-READS-ONLY-EXTENSION-STORE", () => {
  assert.ok(history.includes("listMobileExtensionRecords"));
  assert.ok(history.includes("findMobileExtensionRecord"));
  assert.ok(!history.includes("createApplicationServices"));
  assert.ok(!history.includes("loadAllExperiences"));
  assert.ok(!history.includes("modelResultsRegionalV2"));
});

test("HISTORY-KEEPS-MIXED-CONSTRUCTS-SEPARATE", () => {
  assert.ok(history.includes("異なる運動様式・異なる構成概念の12部位値は、合算・平均しません"));
  assert.ok(history.includes("segments.map(segmentMarkup)"));
  assert.ok(history.includes("既存ランニングエンジンを再計算せず"));
});

test("HISTORY-DOES-NOT-RENDER-ENERGY", () => {
  assert.ok(!history.includes("energyEstimate"));
  assert.ok(!history.includes("kcal"));
});

test("HISTORY-USES-DEDICATED-QUERY-ROUTE", () => {
  assert.ok(history.includes("mobileActivity"));
  assert.ok(history.includes("mobileActivityRecordId"));
  assert.ok(saveLink.includes("#/history?mobileActivity=1"));
});

test("CANONICAL-HISTORY-SOURCE-REMAINS-UNMODIFIED-BY-EXTENSION", () => {
  assert.ok(!canonicalHistory.includes("mobileActivityRecordId"));
  assert.ok(!canonicalHistory.includes("mobileWalkJog"));
});

test("HISTORY-UI-DOES-NOT-IMPORT-PRIMARY-ENGINE", () => {
  for (const term of ["primaryModelEngine", "primaryInputProcessing", "primaryModelResults"]) {
    assert.ok(!history.includes(term));
  }
});

for (const result of results) console.log(`${result.status}\t${result.id}${result.message ? `\t${result.message}` : ""}`);
if (results.some((result) => result.status === "FAIL")) process.exitCode = 1;
