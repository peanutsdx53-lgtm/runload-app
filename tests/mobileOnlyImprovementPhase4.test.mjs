import assert from "node:assert/strict";
import fs from "node:fs";
const read = (path) => fs.readFileSync(path, "utf8");
const screen = read("screens/simulationScreen.js");
const interactions = read("ui/interactions/simulationInteractions.js");
const css = read("styles/mobile.css");
const version = read("ui/appVersionStatus.js");
const worker = read("service-worker.js");
const results = [];
function test(name, fn) { try { fn(); results.push({ name, status: "PASS" }); } catch (error) { results.push({ name, status: "FAIL", message: error.message }); } }
test("app version advances for Phase 4", () => { assert.match(version, /APP_VERSION = "2026\.09\.29\.12"/); assert.match(worker, /running-record-app-runtime-2026\.09\.29\.12/); });
test("condition comparison exposes a mobile-only one-condition picker", () => { assert.ok(screen.includes("data-mobile-simulation-picker")); for (const tab of ["distance","time","course","format"]) assert.ok(screen.includes(`data-simulation-mobile-tab="${tab}"`)); assert.ok(screen.includes("何を変えて比べる？")); });
test("desktop keeps all condition sections while mobile narrows to one", () => { assert.ok(interactions.includes("syncMobileSimulationPicker")); assert.ok(interactions.includes("if(!mobile){mobileSections.forEach")); assert.ok(interactions.includes("section.hidden=String(section.dataset.simulationMobileSection")); });
test("multiple-condition caution is mobile-only", () => { assert.ok(screen.includes("data-simulation-multi-warning")); assert.ok(interactions.includes("changedItems.length>1")); assert.ok(interactions.includes("Boolean(mobileMedia?.matches)")); });
test("unchanged smartphone view hides the long preview", () => { assert.ok(css.includes("Mobile Phase 4: choose one condition before comparing")); assert.ok(css.includes(".condition-compare.is-unchanged .condition-compare-preview{display:none;")); });
test("changed region groups are shortened on mobile until expanded", () => { assert.ok(interactions.includes("bindMobileResultGroups")); assert.ok(interactions.includes("simulation-mobile-group-toggle")); assert.ok(css.includes("is-mobile-truncated:not(.is-mobile-expanded)")); });
const failed = results.filter((item) => item.status === "FAIL");
console.log(JSON.stringify({ suite: "Mobile-only Improvement Phase 4", total: results.length, passed: results.length - failed.length, failed: failed.length, status: failed.length ? "FAIL" : "PASS", results }, null, 2));
if (failed.length) process.exit(1);
