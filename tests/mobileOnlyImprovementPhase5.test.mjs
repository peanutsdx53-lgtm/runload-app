import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const result = fs.readFileSync(new URL("../screens/resultScreen.js", import.meta.url), "utf8");
const detail = fs.readFileSync(new URL("../screens/bodyPartDetailScreen.js", import.meta.url), "utf8");
const interactions = fs.readFileSync(new URL("../ui/interactions/bodyPartDetailInteractions.js", import.meta.url), "utf8");
const screenInteractions = fs.readFileSync(new URL("../ui/screenInteractions.js", import.meta.url), "utf8");
const css = fs.readFileSync(new URL("../styles/mobile.css", import.meta.url), "utf8");
const version = fs.readFileSync(new URL("../ui/appVersionStatus.js", import.meta.url), "utf8");
const worker = fs.readFileSync(new URL("../service-worker.js", import.meta.url), "utf8");

function parseVersion(source) { return source.match(/APP_VERSION = "(\d{4}\.\d{2}\.\d{2}\.\d+)"/)?.[1] || ""; }
function atLeast(current, minimum) { const a=current.split(".").map(Number), b=minimum.split(".").map(Number); if(a.length!==4 || b.length!==4 || !a.every(Number.isFinite) || !b.every(Number.isFinite)) return false; for(let i=0;i<4;i+=1){ if(a[i]!==b[i]) return a[i]>b[i]; } return true; }

test("mobile result makes body-map reference meaning explicit and widens touch targets", () => {
  assert.match(result, /100は「その部位自身の基準」です/);
  assert.match(result, /region-hit-area/);
  assert.match(css, /\.region-hit-area/);
});

test("mobile body-region detail exposes three comparison values", () => {
  assert.match(detail, /mobile-detail-metrics/);
  assert.match(detail, /基準100との差/);
  assert.match(detail, /前回との差/);
});

test("mobile body-region trend points are interactive", () => {
  assert.match(detail, /data-trend-point-index/);
  assert.match(detail, /data-trend-detail/);
  assert.match(interactions, /bindBodyPartDetail/);
  assert.match(screenInteractions, /"body-part-detail": bindBodyPartDetail/);
});

test("Phase 5 remains present in the current or later mobile release", () => {
  const current=parseVersion(version);
  assert.ok(atLeast(current,"2026.09.30.14"));
  assert.ok(worker.includes(`running-record-app-runtime-${current}`));
});
