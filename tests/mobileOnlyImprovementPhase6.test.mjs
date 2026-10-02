import assert from "node:assert/strict";
import fs from "node:fs";

const plan=fs.readFileSync(new URL("../screens/planScreen.js", import.meta.url),"utf8");
const interactions=fs.readFileSync(new URL("../ui/interactions/planInteractions.js", import.meta.url),"utf8");
const css=fs.readFileSync(new URL("../styles/mobile-app-screens.css", import.meta.url),"utf8");

assert.match(plan,/data-action="plan-mobile-review"/);
assert.match(plan,/data-plan-mobile-confirm/);
assert.match(plan,/plan-mobile-saved-success/);
assert.match(plan,/この予定で測定を始める/);
assert.match(plan,/確認中のテーマ/);
assert.match(plan,/以前に残した確認メモ/);
assert.match(interactions,/setMobileReview/);
assert.match(interactions,/scrollIntoView/);
assert.match(css,/Mobile-only Phase 6/);
assert.match(css,/\[data-plan-mobile-confirm\]\.is-mobile-review/);
assert.match(css,/\.plan-mobile-only \{ display: none; \}/);
console.log("mobileOnlyImprovementPhase6.test.mjs: PASS");
