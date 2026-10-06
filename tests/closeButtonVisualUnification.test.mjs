import fs from "node:fs";
import assert from "node:assert/strict";

const read = (path) => fs.readFileSync(path, "utf8");

const guide = read("ui/guideContent.js");
const record = read("screens/recordInputScreen.js");
const result = read("screens/mobile/resultScreen.js");
const history = read("screens/historyScreen.js");
const consultation = read("screens/consultationScreen.js");
const onboarding = read("ui/mobileOnboarding.js");
const components = read("styles/components.css");
const recordBase = read("styles/record-screen-base.css");
const mobileLayouts = read("styles/mobile-screen-layouts.css");
const resultSheet = read("styles/mobile-result-region-sheet.css");
const onboardingCss = read("styles/mobile-onboarding.css");
const consultationCss = read("styles/consultation-share.css");

assert.ok(guide.includes('class="guide-dialog__close app-utility-button"'));
assert.ok(record.includes('class="rof-close-button app-utility-button" data-action="close-record-rof"'));
assert.ok(result.includes('class="app-utility-button" data-action="close-result-region-sheet"'));
assert.ok(history.includes('class="app-utility-button" data-action="close-history-region-picker"'));
assert.ok(consultation.includes('class="app-utility-button" data-action="close-consult-viewer"'));
assert.ok(onboarding.includes('class="mobile-onboarding__close app-utility-button" data-onboarding-close'));

for (const source of [record, result, history, consultation, onboarding]) {
  assert.ok(source.includes('class="app-utility-button__close-symbol" aria-hidden="true">×</span>'));
}

for (const declaration of [
  "width: 2.75rem;",
  "height: 2.75rem;",
  "border: 1px solid var(--color-line);",
  "border-radius: 0.9rem;",
  "background: var(--color-surface);",
  "color: var(--color-accent-strong);",
  "box-shadow: none;",
]) {
  assert.ok(components.includes(declaration), declaration);
}
assert.ok(components.includes(".app-utility-button__close-symbol"));
assert.ok(components.includes("font-size: 1.35rem;"));
assert.ok(components.includes("font-weight: 700;"));

assert.ok(recordBase.includes(".sheet-head>button:not(.app-utility-button)"));
assert.ok(mobileLayouts.includes(".screen-layout--result .sheet-head>button:not(.app-utility-button)"));
assert.ok(mobileLayouts.includes(".screen-layout--history .sheet-head>button:not(.app-utility-button)"));
assert.ok(!mobileLayouts.includes(".screen-layout--record .rof-close-button {"));
assert.ok(!resultSheet.includes('button[data-action="close-result-region-sheet"]'));
assert.ok(onboardingCss.includes(".mobile-onboarding__close { justify-self: end; }"));

const toolbarBlock = consultationCss.match(/\.screen--consultation\[data-share-prep\] \.share-document-toolbar button \{([^}]*)\}/)?.[1] || "";
assert.match(toolbarBlock, /display:\s*none/);
assert.ok(!/border-radius|background|color|font-size|width|height/.test(toolbarBlock));

console.log("closeButtonVisualUnification.test.mjs: PASS");
