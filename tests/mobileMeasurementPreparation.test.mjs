import fs from "node:fs";
import assert from "node:assert/strict";

const screen = fs.readFileSync("screens/mobile/runMeasurementScreen.js", "utf8");
const interactions = fs.readFileSync("ui/interactions/mobileRunMeasurementInteractions.js", "utf8");
const store = fs.readFileSync("ui/mobileWalkJogRecordStore.js", "utf8");
const record = fs.readFileSync("screens/mobile/recordInputScreen.js", "utf8");
const ergonomics = fs.readFileSync("styles/mobile-run-measurement-ergonomics.css", "utf8");
const recordRof = fs.readFileSync("styles/record-screen-base.css", "utf8");
const results = [];
const test = (id, fn) => { try { fn(); results.push([id,"PASS"]); } catch (error) { results.push([id,"FAIL",String(error?.stack||error)]); } };

test("PREP-COPY-IS-COMPACT-AND-NEUTRAL", () => {
  assert.match(screen, /<h1>活動と測定方法<\/h1>/);
  assert.match(screen, /<legend>測定方法<\/legend>/);
  assert.match(screen, />自由<\/b>/);
  assert.match(screen, />時間<\/b>/);
  assert.match(screen, />距離<\/b>/);
  assert.ok(!screen.includes("今日はどう走りますか"));
});

test("FATIGUE-LABELS-ARE-ACTIVITY-NEUTRAL", () => {
  assert.ok(screen.includes("運動前の疲労感"));
  assert.ok(screen.includes("運動後の疲労感"));
  assert.ok(store.includes('pre: readFatigueValue(root, "before")'));
  assert.ok(store.includes('post: readFatigueValue(root, "after")'));
});

test("MEASUREMENT-ROF-MATCHES-RECORD-VISUAL-GRAMMAR", () => {
  assert.match(screen, /class="rof-scale-panel"/);
  assert.match(screen, /class="rof-current"/);
  assert.match(ergonomics, /Measurement ROF-J uses the same visual grammar as the Record ROF-J sheet/);
  assert.match(ergonomics, /run-measurement-fatigue__question\s*\{[\s\S]*display:\s*block/);
  assert.match(ergonomics, /run-measurement-fatigue \.rof-scale-panel\s*\{[\s\S]*border-radius:\s*18px/);
  assert.match(ergonomics, /run-measurement-fatigue \.rof-current\s*\{[\s\S]*grid-template-columns:\s*auto 54px minmax\(0, 1fr\)/);
  assert.match(ergonomics, /run-measurement-fatigue \.rof-current > strong\s*\{[\s\S]*font-size:\s*34px/);
  assert.match(recordRof, /\.rof-scale-panel\s*\{/);
  assert.match(recordRof, /\.rof-current\s*\{/);
});

test("EXTENSION-DOES-NOT-CREATE-CANONICAL-FATIGUE-LIFECYCLE", () => {
  assert.ok(interactions.includes('return String(root.dataset.mobileActivityId || "RUNNING_CURRENT") === "RUNNING_CURRENT"'));
  assert.ok(interactions.includes('if (!usesCanonicalFatigue()) return { ok: true, linked: false };'));
});

test("MOBILE-RECORD-DISTINGUISHES-RUN-FORMAT-FROM-ACTIVITY", () => {
  assert.ok(record.includes('runningFormatLabel: "走行形式"'));
  assert.ok(record.includes('continuous: "走り続けた"'));
  assert.ok(record.includes('runWalk: "走り＋歩き"'));
  assert.ok(!record.includes('mobileLayout'));
});

for (const [id,status,message] of results) console.log(`${status}\t${id}${message ? `\t${message}` : ""}`);
if (results.some(([,status]) => status === "FAIL")) process.exitCode = 1;
