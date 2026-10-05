import assert from "node:assert/strict";
import fs from "node:fs";
const read = (path) => fs.readFileSync(path, "utf8");
const home = read("screens/mobile/homeScreen.js");
const homeInteractions = read("ui/interactions/homeInteractions.js");
const record = read("screens/recordInputScreen.js");
const recordInteractions = read("ui/interactions/recordInputInteractions.js");
const mobileRecord = read("styles/mobile-record.css");
const results = [];
function test(name, fn) { try { fn(); results.push({ name, status: "PASS" }); } catch (error) { results.push({ name, status: "FAIL", message: error.message }); } }
test("mobile home Today widget is state-adaptive", () => { for (const state of ["draft", "saved-run", "saved-rest", "history", "first"]) assert.ok(home.includes(`mobile-home-widget--state-${state}`)); assert.ok(home.includes("今回の結果を振り返る")); assert.ok(home.includes("はじめの記録を残す")); });
test("checkpoint widget carries an explicit source", () => { assert.ok(homeInteractions.includes("mobile-home-widget--checkpoint")); assert.ok(homeInteractions.includes("checkpointSource")); assert.ok(homeInteractions.includes("checkpoint || \"未設定\"")); assert.ok(homeInteractions.includes("selfUnderstandingThreads")); });
test("record input has a smartphone-only 4-stage navigator", () => { assert.ok(record.includes("data-mobile-record-progress")); for (const stage of [1,2,3,4]) assert.ok(record.includes(`data-record-stage-jump="${stage}"`)); assert.ok(record.includes("mobileLayout ? renderMobileRecordProgress")); assert.ok(recordInteractions.includes("bindMobileRecordStageNavigation")); assert.ok(recordInteractions.includes("setActiveMobileRecordStage")); });
test("GPS transferred inputs are marked on mobile", () => { assert.ok(record.includes("data-record-measurement-prefill")); assert.ok(record.includes("GPS測定から入力済み")); });
test("mobile record CSS contains the current stage layer", () => { assert.ok(mobileRecord.includes(".mobile-record-progress__item.is-active")); });
const failed = results.filter((item) => item.status === "FAIL");
console.log(JSON.stringify({ suite: "Mobile Home and Record Workflow", total: results.length, passed: results.length - failed.length, failed: failed.length, status: failed.length ? "FAIL" : "PASS", results }, null, 2));
if (failed.length) process.exit(1);
