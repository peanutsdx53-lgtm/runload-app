import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { recordedNextCheckText } from "../shared/recordUtilities.js";

const read = (path) => fs.readFileSync(path, "utf8");
const screen = read("screens/consultationScreen.js");
const baseCss = read("styles/consultation-screen-base.css");
const desktopCss = read("styles/desktop-consultation.css");
const mobileCss = read("styles/mobile-app-screens.css");
const index = read("index.html");
const worker = read("service-worker.js");

test("consultation shared visual foundation is loaded once for both platforms", () => {
  assert.ok(index.includes('./styles/consultation-screen-base.css'));
  assert.ok(worker.includes('./styles/consultation-screen-base.css'));
  assert.match(baseCss, /\.screen-layout--consultation \.source\{[^}]*border:1px solid var\(--line\)/);
  assert.match(baseCss, /\.screen-layout--consultation \.field input,\.screen-layout--consultation \.field textarea\{[^}]*border-radius:12px/);
  assert.match(baseCss, /\.screen-layout--consultation \.route\{[^}]*border-radius:19px/);
  assert.match(baseCss, /\.screen-layout--consultation \.report\{[^}]*border-radius:14px/);
  assert.match(baseCss, /\.screen-layout--consultation \.share-preview\{[\s\S]*?border-radius:17px/);
  assert.match(desktopCss, /@media \(min-width: 55rem\)/);
  assert.match(mobileCss, /\.screen-layout--consultation/);
});

test("recorded next-check text remains a display-only source separate from confirmation theme", () => {
  const experience = {
    record: { reflectionContext: { nextCheckPoint: "左ふくらはぎを次回も確認" } },
    feedback: { nextCheckPoint: "feedback fallback" },
  };
  assert.equal(recordedNextCheckText(experience, { includeFeedback: true }), "左ふくらはぎを次回も確認");
  assert.equal(recordedNextCheckText({ record: { reflectionContext: {} }, feedback: { nextCheckPoint: "feedback fallback" } }, { includeFeedback: true }), "feedback fallback");
  assert.match(screen, /const next = recordedNextCheckText\(experience, \{ includeFeedback: true \}\) \|\| "未記録";/);
  assert.match(screen, /const confirmationTheme = confirmationThread \? selfUnderstandingThreadTitle/);
  assert.match(screen, /本人が記録した確認点/);
  assert.doesNotMatch(screen, /const next = confirmationTheme \|\| "未記録"/);
});
