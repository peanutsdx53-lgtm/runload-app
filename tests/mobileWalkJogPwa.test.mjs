import fs from "node:fs";
import assert from "node:assert/strict";

const index = fs.readFileSync("index.html", "utf8");
const worker = fs.readFileSync("service-worker.js", "utf8");
const mobileEntry = fs.readFileSync("ui/mobileRuntimeEntry.js", "utf8");
const versionModule = fs.readFileSync("ui/appVersionStatus.js", "utf8");
const version = versionModule.match(/APP_VERSION = "([^"]+)"/)?.[1] || "";

const results = [];
function test(id, fn) {
  try { fn(); results.push({ id, status: "PASS" }); }
  catch (error) { results.push({ id, status: "FAIL", message: String(error?.stack || error) }); }
}

test("MOBILE-ENTRY-LOADS-MOBILE-EXTENSION", () => {
  for (const path of [
    "./mobileWalkJogMeasurementWiring.js",
    "./mobileWalkJogGpsQualityUi.js",
    "./mobileWalkJogCopyGuard.js",
    "./mobileWalkJogRecordStore.js",
    "./mobileWalkJogSaveHistoryLink.js",
    "./mobileWalkJogHistoryUi.js",
    "./mobileWalkJogGpsQualityHistoryGuard.js",
  ]) assert.ok(mobileEntry.includes(path), `missing ${path}`);
  for (const path of [
    "./styles/mobile-walk-jog.css",
    "./styles/mobile-walk-jog-records.css",
    "./styles/mobile-walk-jog-history.css",
  ]) assert.ok(index.includes(path), `missing ${path}`);
});

test("SERVICE-WORKER-PRECACHES-MOBILE-EXTENSION", () => {
  for (const path of [
    "./core/internal/mobileWalkJogSpeedModel.js",
    "./ui/mobileWalkJogMeasurementWiring.js",
    "./ui/mobileWalkJogGpsQuality.js",
    "./ui/mobileWalkJogGpsQualityUi.js",
    "./ui/mobileWalkJogCopyGuard.js",
    "./ui/mobileWalkJogRecordStore.js",
    "./ui/mobileWalkJogSaveHistoryLink.js",
    "./ui/mobileWalkJogHistoryUi.js",
    "./ui/mobileWalkJogGpsQualityHistoryGuard.js",
    "./styles/mobile-walk-jog.css",
    "./styles/mobile-walk-jog-records.css",
    "./styles/mobile-walk-jog-history.css",
  ]) assert.ok(worker.includes(`\"${path}\"`), `missing ${path}`);
});

test("CACHE-VERSION-MATCHES-APP-VERSION", () => {
  assert.ok(version);
  assert.ok(worker.includes(`running-record-app-runtime-${version}`));
});

for (const result of results) console.log(`${result.status}\t${result.id}${result.message ? `\t${result.message}` : ""}`);
if (results.some((result) => result.status === "FAIL")) process.exitCode = 1;
