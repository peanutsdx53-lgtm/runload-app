import assert from "node:assert/strict";
import fs from "node:fs";
const read = (path) => fs.readFileSync(path, "utf8");
const screen = read("screens/mobile/interpretationRoomScreen.js");
const commonScreen = read("screens/interpretationRoomScreen.js");
const presentation = read("ui/interpretationRoomPresentation.js");
const recordInteractions = read("ui/interactions/mobileRecordInputInteractions.js");
const redesignCss = read("styles/mobile-interpretation-room-compact-responsive.css");
const results = [];
function test(name, fn) { try { fn(); results.push({ name, status: "PASS" }); } catch (error) { results.push({ name, status: "FAIL", message: error.message }); } }
test("interpretation screen is selected by the mobile platform registry instead of runtime layout checks", () => { assert.ok(screen.includes("compactLayout: true")); assert.ok(!commonScreen.includes("matchesMobileLayout")); assert.ok(!commonScreen.includes("mobileLayout")); });
test("mobile interpretation exposes the current comparison and explicit next-check action", () => { assert.ok(presentation.includes("比較できる部位")); assert.ok(presentation.includes("次回見ること")); assert.ok(presentation.includes("この問いを次も確かめる")); assert.ok(presentation.includes('data-action="create-self-understanding-thread"')); assert.ok(presentation.includes("interpretation-flow-room--compact")); assert.ok(!presentation.includes("interpretation-room-mobile-path")); assert.ok(!presentation.includes("確認テーマ")); });
test("record input deep link opens stage 4", () => { assert.ok(recordInteractions.includes('context?.parameters?.get?.("focus") === "next-check"')); assert.ok(recordInteractions.includes("setActiveStage(form, 4)")); assert.ok(recordInteractions.includes('postRunReflection')); });
test("mobile return goes back to interpretation room", () => { assert.ok(recordInteractions.includes('get?.("returnTo") || ""')); assert.ok(recordInteractions.includes('? { screen: "interpretation-room", parameters: { recordId, origin: "result" } }')); });
test("interpretation keeps a mobile-specific compact order", () => { assert.ok(redesignCss.includes("@media (max-width: 54.99rem)")); assert.ok(redesignCss.includes(".self-understanding-rail--compact { order: 2; }")); });
const failed = results.filter((item) => item.status === "FAIL");
console.log(JSON.stringify({ suite: "Mobile Interpretation Workflow", total: results.length, passed: results.length - failed.length, failed: failed.length, status: failed.length ? "FAIL" : "PASS", results }, null, 2));
if (failed.length) process.exit(1);
