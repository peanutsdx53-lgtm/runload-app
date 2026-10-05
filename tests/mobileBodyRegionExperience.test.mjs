import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const result = fs.readFileSync(new URL("../screens/mobile/resultScreen.js", import.meta.url), "utf8");
const detail = fs.readFileSync(new URL("../screens/mobile/bodyPartDetailScreen.js", import.meta.url), "utf8");
const sharedDetail = fs.readFileSync(new URL("../screens/bodyPartDetailScreen.js", import.meta.url), "utf8");
const interactions = fs.readFileSync(new URL("../ui/interactions/mobileBodyPartDetailInteractions.js", import.meta.url), "utf8");
const screenInteractions = fs.readFileSync(new URL("../ui/mobileScreenInteractionBinders.js", import.meta.url), "utf8");
const css = fs.readFileSync(new URL("../styles/mobile-screen-layouts.css", import.meta.url), "utf8");

test("mobile result makes body-map reference meaning explicit and widens touch targets", () => {
  assert.match(result, /100は「その部位自身の基準」です/);
  assert.match(result, /enhancedTouch: true/);
  assert.match(css, /\.region-hit-area/);
});

test("mobile body-region detail exposes three comparison values", () => {
  assert.match(detail, /mobile-detail-metrics/);
  assert.match(detail, /基準100との差/);
  assert.match(detail, /前回との差/);
});

test("mobile body-region trend points are interactive", () => {
  assert.match(sharedDetail, /data-trend-point-index/);
  assert.match(detail, /data-trend-detail/);
  assert.match(interactions, /bindBodyPartDetail/);
  assert.match(screenInteractions, /"body-part-detail": bindBodyPartDetail/);
});
