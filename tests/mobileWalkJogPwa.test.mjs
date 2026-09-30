import fs from "node:fs";
import assert from "node:assert/strict";

const index = fs.readFileSync("index.html", "utf8");
const worker = fs.readFileSync("service-worker.js", "utf8");
const versionModule = fs.readFileSync("ui/appVersionStatus.js", "utf8");
const version = versionModule.match(/APP_VERSION = "([^"]+)"/)?.[1] || "";

const results = [];
function test(id, fn) {
  try { fn(); results.push({ id, status: "PASS" }); }
  catch (error) { results.push({ id, status: "FAIL", message: String(error?.stack || error) }); }
}

test("INDEX-LOADS-MOBILE-EXTENSION", () => {
  assert.ok(index.includes("./ui/mobileWalkJogMeasurementWiring.js"));
  assert.ok(index.includes("./ui/mobileWalkJogRecordStore.js"));
  assert.ok(index.includes("./styles/mobile-walk-jog.css"));
  assert.ok(index.includes("./styles/mobile-walk-jog-records.css"));
});

test("SERVICE-WORKER-PRECACHES-MOBILE-EXTENSION", () => {
  for (const path of [
    "./core/internal/mobileWalkJogSpeedModel.js",
    "./ui/mobileWalkJogMeasurementWiring.js",
    "./ui/mobileWalkJogRecordStore.js",
    "./styles/mobile-walk-jog.css",
    "./styles/mobile-walk-jog-records.css",
  ]) assert.ok(worker.includes(`\"${path}\"`), `missing ${path}`);
});

test("CACHE-VERSION-MATCHES-APP-VERSION", () => {
  assert.ok(version);
  assert.ok(worker.includes(`running-record-app-runtime-${version}`));
});

for (const result of results) console.log(`${result.status}\t${result.id}${result.message ? `\t${result.message}` : ""}`);
if (results.some((result) => result.status === "FAIL")) process.exitCode = 1;
