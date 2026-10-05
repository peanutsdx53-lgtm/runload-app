import assert from "node:assert/strict";
import fs from "node:fs";
const read = (path) => fs.readFileSync(path, "utf8");
const commonScreen = read("screens/simulationScreen.js");
const screen = read("screens/mobile/simulationScreen.js");
const interactions = read("ui/interactions/mobileSimulationInteractions.js");
const commonInteractions = read("ui/interactions/simulationInteractions.js");
const css = read("styles/mobile-screen-layouts.css");
const results = [];
function test(name, fn) { try { fn(); results.push({ name, status: "PASS" }); } catch (error) { results.push({ name, status: "FAIL", message: error.message }); } }
test("condition comparison exposes a mobile-only one-condition picker", () => { assert.ok(screen.includes("data-simulation-picker")); for (const tab of ["distance","time","course","format"]) assert.ok(screen.includes(`data-simulation-picker-tab="${tab}"`)); assert.ok(screen.includes("何を変えて比べる？")); assert.ok(!commonScreen.includes("mobile-simulation-picker")); });
test("mobile narrows to one condition without putting device checks in common interactions", () => { assert.ok(interactions.includes("data-simulation-picker-tab")); assert.ok(interactions.includes("section.hidden")); assert.ok(!commonInteractions.includes("matchMedia")); assert.ok(!commonInteractions.includes("mobileMedia")); });
test("multiple-condition caution is mobile-only", () => { assert.ok(interactions.includes("showMultiWarning")); assert.ok(interactions.includes("changedItems.length > 1")); assert.ok(!commonInteractions.includes("changedItems.length > 1")); });
test("unchanged smartphone view hides the long preview", () => { assert.ok(css.includes(".condition-compare.is-unchanged .condition-compare-preview{display:none;")); });
test("changed region groups are shortened on mobile until expanded", () => { assert.ok(interactions.includes("simulation-mobile-group-toggle")); assert.ok(interactions.includes("data-simulation-mobile-group-toggle")); assert.ok(css.includes("is-mobile-truncated:not(.is-mobile-expanded)")); });
const failed = results.filter((item) => item.status === "FAIL");
console.log(JSON.stringify({ suite: "Mobile Simulation Workflow", total: results.length, passed: results.length - failed.length, failed: failed.length, status: failed.length ? "FAIL" : "PASS", results }, null, 2));
if (failed.length) process.exit(1);
