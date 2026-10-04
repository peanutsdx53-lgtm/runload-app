import fs from "node:fs";
import assert from "node:assert/strict";
import { packTokens } from "../ui/interactions/homeGridModel.js";

const interactions = fs.readFileSync("ui/interactions/homeInteractions.js", "utf8");
const screen = fs.readFileSync("screens/homeScreen.js", "utf8");
const gridModel = fs.readFileSync("ui/interactions/homeGridModel.js", "utf8");
const capacity = fs.readFileSync("ui/mobileHomePageCapacity.js", "utf8");
const index = fs.readFileSync("index.html", "utf8");
const worker = fs.readFileSync("service-worker.js", "utf8");
const versionModule = fs.readFileSync("ui/appVersionStatus.js", "utf8");

const results = [];
function test(id, fn) {
  try { fn(); results.push({ id, status: "PASS" }); }
  catch (error) { results.push({ id, status: "FAIL", message: String(error?.stack || error) }); }
}

test("HOME-GRID-REMAINS-HARD-CAPPED-AT-THREE-ROWS", () => {
  assert.match(gridModel, /HOME_MAX_ROWS = 3/);
  assert.doesNotMatch(interactions, /--home-grid-rows", "4"/);
});

test("CURRENT-FIRST-RUN-DEFAULTS-LIVE-IN-CANONICAL-HOME-INTERACTIONS", () => {
  assert.match(interactions, /pages: Object\.freeze\(\[Object\.freeze\(\["simulation", "plan", "reading", "settings"\]\)\]\)/);
  assert.match(interactions, /DEFAULT_WIDGET_VISIBLE = Object\.freeze\(\["today", "plan", "changes"\]\)/);
  assert.match(interactions, /today: "medium"/);
  assert.match(interactions, /plan: "small"/);
  assert.match(interactions, /changes: "small"/);
});

test("CURRENT-FIRST-RUN-LAYOUT-FITS-EXACTLY-IN-THREE-ROWS", () => {
  const tokens = [
    "widget:today", "widget:plan", "widget:changes",
    "app:simulation", "app:plan", "app:reading", "app:settings",
  ];
  const sizes = { today: "medium", plan: "small", changes: "small" };
  const placements = packTokens(tokens, { widgetSizes: sizes, occupiedTokens: new Set(tokens) });
  assert.deepEqual(placements, [
    { token: "widget:today", row: 1, col: 1 },
    { token: "widget:plan", row: 2, col: 1 },
    { token: "widget:changes", row: 2, col: 3 },
    { token: "app:simulation", row: 3, col: 1 },
    { token: "app:plan", row: 3, col: 2 },
    { token: "app:reading", row: 3, col: 3 },
    { token: "app:settings", row: 3, col: 4 },
  ]);
});

test("SHARE-REMAINS-AVAILABLE-BUT-IS-NOT-IN-FIRST-RUN-GRID", () => {
  assert.match(interactions, /id: "share", label: "共有"/);
  const defaultBlock = interactions.slice(interactions.indexOf("const DEFAULT_LAYOUT"), interactions.indexOf("const WIDGET_CATALOG"));
  assert.doesNotMatch(defaultBlock, /"share"/);
});

test("DYNAMIC-CARDS-DECLARE-STABLE-CANONICAL-WIDGET-SLOTS", () => {
  assert.match(screen, /data-home-widget-slot=/);
  assert.match(screen, /const slots = \["plan", "changes"\]/);
  assert.match(interactions, /const declaredSlot = String\(anchor\?\.dataset\?\.homeWidgetSlot/);
  assert.match(interactions, /WIDGET_ID_SET\.has\(declaredSlot\)/);
});

test("CAPACITY-GUARD-STILL-PROTECTS-CUSTOM-HOME-PAGES", () => {
  assert.ok(capacity.includes("const MAX_ROWS = 3;"));
  assert.ok(capacity.includes("function placeOverflowItem(root, element, token, startPage, sizes, visible)"));
  assert.ok(capacity.includes("while (pages.length < MAX_PAGES)"));
  assert.ok(capacity.includes("syncPassivePageIndicator(root);"));
});

test("TEMPORARY-V32-RECONCILER-IS-REMOVED", () => {
  assert.ok(!fs.existsSync("ui/mobileHomeInitialLayoutV32.js"));
  assert.ok(!index.includes("mobileHomeInitialLayoutV32.js"));
  assert.ok(!worker.includes("mobileHomeInitialLayoutV32.js"));
});

test("VERSION-AND-PWA-CACHE-MATCH", () => {
  const version = versionModule.match(/APP_VERSION = "([^"]+)"/)?.[1] || "";
  assert.match(version, /^\d{4}\.\d{2}\.\d{2}\.\d+$/);
  assert.ok(worker.includes(`running-record-app-runtime-${version}`));
  assert.ok(worker.includes('"./ui/interactions/homeInteractions.js"'));
});

const failed = results.filter((item) => item.status !== "PASS");
console.log(JSON.stringify({ suite: "Mobile Home Default Layout", total: results.length, passed: results.length - failed.length, failed: failed.length, status: failed.length ? "FAIL" : "PASS", results }, null, 2));
if (failed.length) process.exit(1);
