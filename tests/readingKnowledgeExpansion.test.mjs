import assert from "node:assert/strict";
import fs from "node:fs";
import { findReadingArticleById } from "../core/appCore.js";

const ids = [
  "regional-three-views","regional-six-eight-28","model-limits","personal-reference","history-compatible","plan-facts-current","rof-j-how-to-read",
  "sleep-not-hours-only","heat-not-temperature-only","warmup-general","pre-run-self-check","talk-test-as-subjective-cue","stop-signs-during-run",
  "cooldown-stretching-limits","hydration-not-more-is-better","post-run-food-timing-context","post-run-self-check","pain-timing-and-persistence","rest-days-and-recovery",
  "training-progression-no-universal-rule","goals-and-recording-differ","beginner-training-options","run-walk-as-option","progression-over-weeks","strength-and-cross-training","restart-after-break","injury-prevention-no-single-method",
  "grade-and-coverage","surface-missingness","slope-endpoints","context-not-single-cause","consultation-prep","seek-care-and-emergency-signs",
];
assert.equal(ids.length, 33);
assert.equal(new Set(ids).size, 33);
for (const id of ids) {
  const article = findReadingArticleById(id);
  assert.ok(article, id);
  assert.ok(article.title?.trim(), `${id}: title`);
  assert.ok(article.summary?.trim(), `${id}: summary`);
  assert.ok(article.body?.length >= 3, `${id}: body`);
  assert.ok(article.sources?.length >= 1, `${id}: sources`);
  assert.equal(article.evidenceGovernance?.sourceIntegrity?.status, "PASS", `${id}: evidence governance`);
}
const screen = fs.readFileSync("screens/readingScreen.js", "utf8");
assert.ok(screen.includes('filterCounts[id] || 0'));
for (const token of [
  'filterButton("result","結果・記録")',
  'filterButton("before","走る前")',
  'filterButton("during","走っている間")',
  'filterButton("after","走った後")',
  'filterButton("training","練習を続ける")',
  'filterButton("course","コース・条件")',
  'filterButton("share","相談・安全")',
]) assert.ok(screen.includes(token), token);
assert.ok(screen.includes('id: "seek-care-and-emergency-signs", filter: "share"'));
assert.ok(screen.includes('id: "rof-j-how-to-read", filter: "result"'));
const surface = findReadingArticleById("surface-missingness");
assert.ok(surface.sources.some((source) => source.sourceId === "APP-COL-PLOS-SURFACE-2025"));
assert.ok(!surface.sources.some((source) => source.sourceId === "APP-COL-YAMIN"));
console.log("readingKnowledgeExpansion.test.mjs: PASS");
