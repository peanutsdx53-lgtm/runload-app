import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const read = (rel) => fs.readFileSync(path.join(root, rel), "utf8");
const tests = [];
function check(id, fn) {
  try { fn(); tests.push({ id, status: "PASS" }); }
  catch (error) { tests.push({ id, status: "FAIL", message: error?.stack || String(error) }); }
}

check("RECORD-BURDEN-ONE-VISIBLE-RAW-MEMO", () => {
  const screen = read("screens/recordInputScreen.js");
  const observationBlock = screen.match(/function renderRunObservationMemo[\s\S]*?\n}\n/)?.[0] || "";
  assert.match(observationBlock, /textarea name="postRunReflection"/);
  assert.match(observationBlock, /type="hidden" name="perceivedDifference"/);
  assert.match(observationBlock, /type="hidden" name="nextCheckPoint"/);
  assert.equal((observationBlock.match(/<textarea/g) || []).length, 1);
  assert.match(observationBlock, /結果を見る前の自分の観察/);
});

check("RECORD-MEMO-LABEL-DISTINGUISHES-RUN-AND-REST", () => {
  const screen = read("screens/recordInputScreen.js");
  assert.match(screen, /isRest \? "今回のメモ" : "走ったときのメモ"/);
  assert.match(screen, /isRest \? "身体・休養時の記録" : "身体・走ったときの記録"/);
  assert.match(screen, /休養中に覚えておきたいことがあれば残します/);
});

check("HOME-CONFIRMATION-ENTRY-IS-ACTIONABLE-NOT-PERMANENT", () => {
  const home = read("screens/homeScreen.js");
  const interactions = read("ui/interactions/homeInteractions.js");
  assert.match(home, /data-mobile-confirmation-banner/);
  assert.match(home, /hasNewEligibleData/);
  assert.match(home, /#\/history\?view=checks/);
  assert.match(interactions, /const theme = themeWithNew \|\| view\.watching\[0\] \|\| null/);
  assert.match(interactions, /syncConfirmationBanner/);
  assert.match(interactions, /checkpoint && !checkpoint\.hidden/);
});

check("REST-PLAN-DOES-NOT-PRESENT-RUN-CONFIRMATION-CARRY", () => {
  const plan = read("screens/planScreen.js");
  assert.match(plan, /selectedThreadId&&planType==="run"/);
});

check("LEGACY-TEXT-PRESERVED-NOT-REINTERPRETED", () => {
  const screen = read("screens/recordInputScreen.js");
  assert.match(screen, /以前の内容はそのまま保存します。自動で新しい意味に読み替えません。/);
  const interactions = read("ui/interactions/interpretationRoomInteractions.js");
  assert.match(interactions, /SELF_UNDERSTANDING_TYPES\.userDefinedLegacy/);
  assert.doesNotMatch(interactions, /sentiment|nlp|classif/i);
});

check("BODY-OBSERVATION-THEME-CARRIES-EXACT-BODY-AREA", () => {
  const presentation = read("ui/interpretationRoomPresentation.js");
  const interactions = read("ui/interactions/interpretationRoomInteractions.js");
  assert.match(presentation, /data-body-area-id=/);
  assert.match(interactions, /button\.dataset\.bodyAreaId/);
  const core = read("core/selfUnderstandingCore.js");
  assert.match(core, /SELF_UNDERSTANDING_BODY_AREA_TO_DISPLAY_REGION/);
  assert.match(core, /bodyAreaId/);
});

check("THEME-CREATION-REQUIRES-EXPLICIT-UI-ACTION", () => {
  const interactions = read("ui/interactions/interpretationRoomInteractions.js");
  assert.match(interactions, /\[data-action="create-self-understanding-thread"\]/);
  const core = read("core/selfUnderstandingCore.js");
  const viewBuilder = core.slice(core.indexOf("export function buildSelfUnderstandingView"));
  assert.doesNotMatch(viewBuilder, /createOrResume\(/);
  const presentation = read("ui/interpretationRoomPresentation.js");
  assert.match(presentation, /次回も確認する/);
  assert.match(presentation, /次回見ること/);
  assert.doesNotMatch(presentation, /確認テーマ/);
});

check("PLAN-CARRIES-THEME-WITHOUT-PRESCRIPTION", () => {
  const plan = read("screens/planScreen.js");
  const workflow = read("core/internal/planWorkflow.js");
  const domain = read("core/internal/applicationDomain.js");
  assert.match(plan, /selfUnderstandingThreadId/);
  assert.match(plan, /設定しない/);
  assert.match(plan, /confirmationExperiences/);
  assert.match(plan, /selfUnderstandingThreadTitle\(thread, confirmationExperiences\)/);
  assert.match(plan, /おすすめや処方には使いません/);
  assert.match(workflow, /selfUnderstandingThreadId/);
  assert.match(domain, /selfUnderstandingThreadId/);
});

check("CONSULTATION-THEME-SHARE-IS-EXPLICIT-AND-BOUNDED", () => {
  const screen = read("screens/consultationScreen.js");
  assert.match(screen, /共有する内容/);
  assert.match(screen, /個人的な追加メモは含めません/);
  assert.match(screen, /次回見ること：/);
  assert.doesNotMatch(screen, /reviewEvents\s*\./);
});

check("LEGACY-REFLECTION-ACHIEVEMENT-CANNOT-BE-NEWLY-UNLOCKED", () => {
  const achievements = read("ui/mobileAchievements.js");
  assert.match(achievements, /id: "reflection-3"[\s\S]*legacyOnly: true/);
  assert.match(achievements, /if \(achievement\.legacyOnly \|\| !achievement\.unlocked/);
  assert.match(achievements, /achievement\.legacyOnly \? Boolean\(state\.unlocked\[achievement\.id\]\)/);
});

check("SIMULATION-DOES-NOT-WRITE-CONFIRMATION-EVIDENCE", () => {
  const screen = read("screens/simulationScreen.js");
  assert.doesNotMatch(screen, /selfUnderstandingThreads|createOrResume|review-self-understanding-thread/);
  const interactions = read("ui/interactions/simulationInteractions.js");
  assert.doesNotMatch(interactions, /selfUnderstandingThreads|createOrResume|review-self-understanding-thread/);
});

check("FORMAL-THEME-EVIDENCE-IS-RUN-ONLY", () => {
  const core = read("core/selfUnderstandingCore.js");
  assert.match(core, /activityType \|\| ""\)\.toLowerCase\(\) !== "run"\) return null/);
  assert.doesNotMatch(core, /WALK|JOGGING|MIXED/);
});

check("NO-SCIENTIFIC-VALUE-DUPLICATION-IN-PERSISTENT-SCHEMA", () => {
  const core = read("core/selfUnderstandingCore.js");
  const normalized = core.match(/return Object\.freeze\(\{\n    id,[\s\S]*?updatedAt:[\s\S]*?\n  \}\);/)?.[0] || "";
  assert.ok(normalized);
  assert.doesNotMatch(normalized, /regionalValue|postRofJ|difference|trend|confidence/);
  assert.match(normalized, /semanticConstraints/);
  assert.match(normalized, /reviewEvents/);
});

check("NEW-ASSETS-ARE-PWA-PRECACHED", () => {
  const worker = read("service-worker.js");
  for (const item of ["./core/selfUnderstandingCore.js", "./styles/self-understanding.css", "./styles/interpretation-room-compact.css", "./ui/interactions/interpretationRoomInteractions.js"]) {
    assert.ok(worker.includes(`"${item}"`), `missing from service worker: ${item}`);
  }
});

check("SEMANTIC-COLOR-ROLES-AVOID-GOOD-BAD-MAPPING", () => {
  const css = read("styles/self-understanding.css");
  assert.doesNotMatch(css, /--su-(?:model|subjective|watch):\s*var\(--color-(?:success|danger)/);
  const history = read("screens/historyScreen.js");
  assert.match(history, /高いほど良い・悪いという意味ではありません/);
});

check("ROF-AND-REGION-CHARTS-REMAIN-SEPARATE", () => {
  const history = read("screens/historyScreen.js");
  assert.match(history, /疲労感 0–10/);
  assert.match(history, /基準100/);
  assert.doesNotMatch(history, /dual-axis|secondaryAxis|y2Axis/i);
});

const failed = tests.filter((item) => item.status === "FAIL");
console.log(JSON.stringify({ suite: "Self-understanding integration V2", total: tests.length, passed: tests.length - failed.length, failed: failed.length, status: failed.length ? "FAIL" : "PASS", tests }, null, 2));
if (failed.length) process.exitCode = 1;
