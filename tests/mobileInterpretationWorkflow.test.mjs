import assert from "node:assert/strict";
import fs from "node:fs";
const read = (path) => fs.readFileSync(path, "utf8");
const screen = read("screens/interpretationRoomScreen.js");
const presentation = read("ui/interpretationRoomPresentation.js");
const recordInteractions = read("ui/interactions/recordInputInteractions.js");
const redesignCss = read("styles/interpretation-room-compact.css");
const results = [];
function test(name, fn) { try { fn(); results.push({ name, status: "PASS" }); } catch (error) { results.push({ name, status: "FAIL", message: error.message }); } }
test("interpretation screen gates additions to mobile layout", () => { assert.ok(screen.includes("matchesMobileLayout")); assert.ok(screen.includes("const mobileLayout = matchesMobileLayout()")); assert.ok(screen.includes("mobileLayout })")); });
test("mobile interpretation exposes compact comparison and one next action", () => { assert.ok(presentation.includes("今回の比較")); assert.ok(presentation.includes("次回見ること")); assert.ok(presentation.includes("次回も確認する")); assert.ok(presentation.includes("部位から選ぶ")); assert.ok(!presentation.includes("interpretation-room-mobile-path")); assert.ok(!presentation.includes("確認テーマ")); });
test("record input deep link opens stage 4", () => { assert.ok(recordInteractions.includes("applyMobileRecordEntryFocus")); assert.ok(recordInteractions.includes('setActiveMobileRecordStage(form, 4)')); assert.ok(recordInteractions.includes('postRunReflection')); });
test("mobile return goes back to interpretation room", () => { assert.ok(recordInteractions.includes('mobileReturnTo === "interpretation-room"')); assert.ok(recordInteractions.includes('router.navigateToScreen("interpretation-room"')); });
test("interpretation keeps a mobile-specific compact order", () => { assert.ok(redesignCss.includes("@media (max-width: 54.99rem)")); assert.ok(redesignCss.includes(".self-understanding-rail--compact { order: 2; }")); });
const failed = results.filter((item) => item.status === "FAIL");
console.log(JSON.stringify({ suite: "Mobile Interpretation Workflow", total: results.length, passed: results.length - failed.length, failed: failed.length, status: failed.length ? "FAIL" : "PASS", results }, null, 2));
if (failed.length) process.exit(1);
