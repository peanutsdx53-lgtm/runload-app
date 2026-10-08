import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import { escapeHtml } from "../ui/commonComponents.js";

const source = readFileSync(new URL("../ui/mobileWalkJogMeasurementWiring.js", import.meta.url), "utf8");
const withoutImports = source.replace(/^import\s+[\s\S]*?\s+from\s+["'][^"']+["'];\s*$/gm, "").replaceAll("export const ", "const ").replaceAll("export function ", "function ");
const sandbox = {
  escapeHtml,
  WeakSet,
  Object,
  Math,
  Number,
  String,
  Array,
  sessionStorage: null,
  safeSessionStorage: () => null,
  matchesMobileLayout: () => false,
  finiteNumber: Number,
  STRICT_ALL12_BANDS: { RUNNING_CURRENT_POINTER: { minMps: 2, maxMps: 5 } },
  summarizeMobileWalkJogCoverage: () => null,
};
vm.runInNewContext(withoutImports + '\n globalThis.__audit = { regionDetails, segmentCard, renderPostResult };', sandbox, { filename: 'mobileWalkJogMeasurementWiring.js' });
const { regionDetails, segmentCard, renderPostResult } = sandbox.__audit;
const attack = '<img src=x onerror=alert(1)>';
const payload = {
  activityId: attack,
  segments: [{
    gaitId: attack,
    distanceKm: 1.25,
    speedMps: 1.9,
    coverage: { availableRegionCount: attack, regions: [{ regionId: attack, index: 101, evidenceTier: attack, outputStatus: "OK" }] },
  }],
};
const check = (markup) => {
  assert.doesNotMatch(markup, /<img\s+src=x/i, "untrusted data must not be parsed as an HTML element");
  assert.match(markup, /&lt;img/);
};
check(regionDetails(payload.segments[0].coverage));
check(segmentCard(payload.segments[0], 0));
const panel = { innerHTML: "" };
const postBody = { querySelector: () => panel };
const root = { querySelector: () => postBody };
renderPostResult(root, payload);
check(panel.innerHTML);
const known = segmentCard({ gaitId: "WALK", distanceKm: 1.25, speedMps: 1.9, coverage: null }, 0);
assert.match(known, /ウォーキング/);
assert.match(known, /1.25 km/);
assert.equal(regionDetails({ regions: null }), "", "invalid saved coverage does not render a region list");
console.log("PASS SECURITY-SINK-01 stored-data HTML encoding, known values retained, invalid coverage handled");
