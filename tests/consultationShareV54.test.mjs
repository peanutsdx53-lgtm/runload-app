import fs from "node:fs";
import assert from "node:assert/strict";
import test from "node:test";

const screen = fs.readFileSync("screens/consultationScreen.js", "utf8");
const interactions = fs.readFileSync("ui/interactions/consultationInteractions.js", "utf8");
const css = fs.readFileSync("styles/consultation-share-v54.css", "utf8");
const index = fs.readFileSync("index.html", "utf8");
const worker = fs.readFileSync("service-worker.js", "utf8");
const version = fs.readFileSync("ui/appVersionStatus.js", "utf8");
const about = fs.readFileSync("screens/aboutScreen.js", "utf8");

test("consultation share workflow is advisor-first", () => {
  assert.ok(screen.includes("STEP 1</small><h2>何を見てほしいか"));
  assert.ok(screen.includes("STEP 2</small><h2>今回の状況を補足"));
  assert.ok(screen.includes("STEP 3</small><h2>共有する情報を選ぶ"));
  assert.ok(screen.includes("STEP 4</small><h2>完成資料を確認"));
  assert.ok(screen.includes("特に聞きたいこと <b>必須</b>"));
  assert.ok(interactions.includes('questionRequirement.textContent = "推奨"'));
  assert.ok(screen.includes("すでに行った対応"));
  assert.ok(screen.includes("最近の経過"));
  assert.ok(screen.includes("RunLoad参考情報"));
});

test("consultation document separates facts subjective context and reference", () => {
  assert.ok(screen.includes("<small>走行事実</small><h2>今回の記録"));
  assert.ok(screen.includes("<small>本人の主観</small><h2>疲労感"));
  assert.ok(screen.includes("<small>本人の主観</small><h2>身体の記録"));
  assert.ok(screen.includes("記録上の変化"));
  assert.ok(screen.includes("診断、障害予測、原因、走行可否を示しません"));
  assert.ok(screen.includes("data-consult-document-page=\"secondary\""));
});

test("print layout is A4 and guards page breaks", () => {
  assert.ok(css.includes("size: A4 portrait"));
  assert.ok(css.includes("width: 210mm !important"));
  assert.ok(css.includes("height: 297mm !important"));
  assert.ok(css.includes("break-inside: avoid !important"));
  assert.ok(css.includes("display: table-header-group"));
  assert.ok(css.includes("page-break-after: always"));
  assert.ok(css.includes("font-size: 8.3pt !important"));
});

test("document preview and dynamic pages stay synchronized", () => {
  assert.ok(interactions.includes("updatePageNumbers"));
  assert.ok(interactions.includes('data-consult-document-page="secondary"'));
  assert.ok(interactions.includes('data-consult-conditional-page="body-details"'));
  assert.ok(interactions.includes("updateRegionalItem"));
  assert.ok(interactions.includes("data-consult-region-visual-template"));
  assert.ok(interactions.includes("updateQuestionGuidance"));
  assert.ok(!interactions.includes("const document = root.querySelector"));
  assert.ok(!interactions.includes("if (!ensureQuestion()) return"));
});

test("release loads and caches consultation share V54", () => {
  assert.ok(index.includes('./styles/consultation-share-v54.css'));
  assert.ok(index.includes('./styles/consultation-share-v55.css'));
  assert.ok(worker.includes('./styles/consultation-share-v55.css'));
  assert.ok(worker.includes('./styles/consultation-share-v54.css'));
  assert.ok(worker.includes('./styles/mobile-home-shift-v38.css'));
  assert.ok(worker.includes('running-record-app-runtime-2026.10.03.4'));
  assert.ok(version.includes('APP_VERSION = "2026.10.03.4"'));
  assert.ok(about.includes('v2026.10.03.4'));
});
