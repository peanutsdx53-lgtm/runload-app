import assert from "node:assert/strict";
import fs from "node:fs";

const read = (path) => fs.readFileSync(path, "utf8");
const css = read("styles/desktop-consultation.css");
const platformStyles = read("ui/platformStyles.js");
const consultation = read("screens/consultationScreen.js");
const simulation = read("screens/simulationScreen.js");

assert.match(consultation, /screen--consultation screen-layout screen-layout--consultation secondary-derived-screen/);
assert.match(simulation, /screen--simulation screen-layout screen-layout--simulation condition-compare/);

assert.match(css, /body\.secondary-derived-open:has\(\.screen--consultation\.screen-layout--consultation\.secondary-derived-screen\)::before/);
assert.match(css, /body:has\(\.screen--simulation\.screen-layout--simulation\.condition-compare\)::before/);
assert.match(css, /backdrop-filter: blur\(5px\) !important/);

assert.match(css, /screen--consultation\.screen-layout--consultation\.secondary-derived-screen[\s\S]*position: fixed !important[\s\S]*top: 5\.85rem !important[\s\S]*bottom: 1\.25rem !important/);
assert.match(css, /screen--consultation\.screen-layout--consultation\.secondary-derived-screen > \.secondary-derived-body[\s\S]*overflow-y: auto !important/);
assert.match(css, /secondary-derived-screen:not\(\[data-share-prep\]\)[\s\S]*width: min\(66rem, calc\(100vw - 3rem\)\) !important/);
assert.match(css, /secondary-derived-screen:not\(\[data-share-prep\]\)[\s\S]*min-height: 20rem !important/);
assert.match(css, /secondary-derived-screen:not\(\[data-share-prep\]\) > \.secondary-derived-body[\s\S]*place-items: center !important/);
assert.match(css, /consultation-empty-state[\s\S]*width: min\(100%, 56rem\) !important[\s\S]*grid-template-columns: minmax\(0, 1fr\) auto !important/);
assert.doesNotMatch(platformStyles, /desktop-consultation-empty-balance\.css/);
assert.equal(fs.existsSync("styles/desktop-consultation-empty-balance.css"), false);

assert.match(css, /screen--simulation\.screen-layout--simulation\.condition-compare[\s\S]*position: fixed !important[\s\S]*top: 5\.85rem !important[\s\S]*bottom: 1\.25rem !important/);
assert.match(css, /screen--simulation\.screen-layout--simulation\.condition-compare[\s\S]*overflow-y: auto !important/);
assert.match(css, /screen--simulation\.screen-layout--simulation\.condition-compare > \.back-link[\s\S]*display: none !important/);

console.log("desktopWorkflowModal.test.mjs: PASS");
