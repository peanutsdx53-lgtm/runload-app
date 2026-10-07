import assert from "node:assert/strict";
import fs from "node:fs";

const plan=fs.readFileSync(new URL("../screens/mobile/planScreen.js", import.meta.url),"utf8");
const commonPlan=fs.readFileSync(new URL("../screens/planScreen.js", import.meta.url),"utf8");
const interactions=fs.readFileSync(new URL("../ui/interactions/mobilePlanInteractions.js", import.meta.url),"utf8");
const css=fs.readFileSync(new URL("../styles/mobile-app-screens.css", import.meta.url),"utf8");

assert.match(plan,/data-action="plan-review"/);
assert.match(plan,/renderPlanScreenWithPresentation/);
assert.match(plan,/plan-mobile-saved-success/);
assert.match(plan,/この予定で測定を始める/);
assert.match(commonPlan,/確認中のテーマ/);
assert.doesNotMatch(commonPlan,/以前に残した確認メモ|previousCheckNote|nextCheckPoint/);
assert.doesNotMatch(commonPlan,/USER_DEFINED_LEGACY|legacyOrigin/);
assert.match(interactions,/setReview/);
assert.match(interactions,/scrollIntoView/);
assert.match(css,/\[data-plan-confirm\]\.is-mobile-review/);
assert.match(css,/\.screen-layout--plan \[data-plan-confirm\]\.is-mobile-review \{ display: block;/);
console.log("mobilePlanReviewFlow.test.mjs: PASS");
