import assert from "node:assert/strict";
import fs from "node:fs";
const read = (path) => fs.readFileSync(path, "utf8");
const screen = read("screens/interpretationRoomScreen.js");
const presentation = read("ui/interpretationRoomPresentation.js");
const recordInteractions = read("ui/interactions/recordInputInteractions.js");
const css = read("styles/interpretation-room.css");
const redesignCss = read("styles/interpretation-room-compact.css");
const version = read("ui/appVersionStatus.js");
const worker = read("service-worker.js");
const results = [];
function parseVersion(source) { return source.match(/APP_VERSION = "(\d{4}\.\d{2}\.\d{2}\.\d+)"/)?.[1] || ""; }
function atLeast(current, minimum) { const a=current.split(".").map(Number), b=minimum.split(".").map(Number); return a.length===4 && b.length===4 && a.every(Number.isFinite) && b.every(Number.isFinite) && a.findIndex((v,i)=>v!==b[i])===-1 ? true : a.some((v,i)=>v!==b[i] && v>b[i] && a.slice(0,i).every((x,j)=>x===b[j])); }
function test(name, fn) { try { fn(); results.push({ name, status: "PASS" }); } catch (error) { results.push({ name, status: "FAIL", message: error.message }); } }
test("Phase 3 remains present in the current or later mobile release", () => { const current=parseVersion(version); assert.ok(atLeast(current,"2026.09.29.10")); assert.ok(worker.includes(`running-record-app-runtime-${current}`)); });
test("interpretation screen gates additions to mobile layout", () => { assert.ok(screen.includes("matchesMobileLayout")); assert.ok(screen.includes("const mobileLayout = matchesMobileLayout()")); assert.ok(screen.includes("mobileLayout })")); });
test("mobile interpretation exposes compact comparison -> one next action", () => { assert.ok(presentation.includes("今回の比較")); assert.ok(presentation.includes("次回見ること")); assert.ok(presentation.includes("次回も確認する")); assert.ok(presentation.includes("部位から選ぶ")); assert.ok(!presentation.includes("interpretation-room-mobile-path")); assert.ok(!presentation.includes("確認テーマ")); });
test("record input deep link opens stage 4", () => { assert.ok(recordInteractions.includes("applyMobileRecordEntryFocus")); assert.ok(recordInteractions.includes('setActiveMobileRecordStage(form, 4)')); assert.ok(recordInteractions.includes('postRunReflection')); });
test("mobile return goes back to interpretation room", () => { assert.ok(recordInteractions.includes('mobileReturnTo === "interpretation-room"')); assert.ok(recordInteractions.includes('router.navigateToScreen("interpretation-room"')); });
test("interpretation redesign keeps a mobile-specific compact order", () => { assert.ok(css.includes("Mobile Phase 3: fact -> interpretation -> one next check loop")); assert.ok(redesignCss.includes("@media (max-width: 54.99rem)")); assert.ok(redesignCss.includes(".self-understanding-rail--compact { order: 2; }")); });
const failed = results.filter((item) => item.status === "FAIL");
console.log(JSON.stringify({ suite: "Mobile-only Improvement Phase 3", total: results.length, passed: results.length - failed.length, failed: failed.length, status: failed.length ? "FAIL" : "PASS", results }, null, 2));
if (failed.length) process.exit(1);
