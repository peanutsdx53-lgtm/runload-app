import assert from "node:assert/strict";
import fs from "node:fs";

const read = (path) => fs.readFileSync(path, "utf8");
const css = read("styles/desktop-auxiliary-reference.css");
const platformStyles = read("ui/platformStyles.js");
const worker = read("service-worker.js");
const settings = read("screens/settingsScreen.js");
const privacy = read("screens/shared/privacyScreen.js");
const support = read("screens/shared/supportGuidanceScreen.js");
const more = read("screens/desktop/moreScreen.js");

assert.ok(platformStyles.includes("./styles/desktop-auxiliary-reference.css"));
assert.ok(worker.includes('"./styles/desktop-auxiliary-reference.css"'));
assert.ok(platformStyles.indexOf("./styles/desktop-auxiliary-reference.css") > platformStyles.indexOf("./styles/desktop-unification.css"));

assert.match(css, /top: 5\.85rem !important/);
assert.match(css, /bottom: 1\.25rem !important/);
assert.match(css, /max-width: 72rem !important/);
assert.match(css, /border: 2px solid var\(--color-line\) !important/);
assert.match(css, /backdrop-filter: blur\(4px\)/);
assert.match(css, /grid-template-rows: auto minmax\(0, 1fr\) !important/);
assert.match(css, /overflow-y: auto !important/);

assert.match(css, /screen--settings\.screen-layout--settings \.display-setting-list[\s\S]*grid-template-columns: repeat\(3, minmax\(0, 1fr\)\) !important/);
assert.match(settings, /#\/terms\?returnTo=%23%2Fsettings/);
assert.match(settings, /#\/privacy\?returnTo=%23%2Fsettings/);
assert.match(more, /screen: "terms"/);
assert.match(more, /screen: "privacy"/);

assert.match(privacy, /type: "local"[\s\S]*open: true/);
assert.match(css, /screen--privacy\.screen-layout--privacy \.list[\s\S]*grid-template-columns: repeat\(2, minmax\(0, 1fr\)\) !important/);
assert.match(css, /screen--privacy\.screen-layout--privacy \.item\[open\][\s\S]*grid-column: 1 \/ -1 !important/);
assert.match(css, /screen--privacy\.screen-layout--privacy \.item\[open\] \.body[\s\S]*columns: 2 !important/);

assert.match(support, /screen--support-guidance/);
assert.match(css, /screen--support-guidance\.screen-layout--support \.cards[\s\S]*grid-template-columns: repeat\(2, minmax\(0, 1fr\)\) !important/);
assert.match(css, /screen--support-guidance\.screen-layout--support \.card:first-child[\s\S]*grid-column: 1 \/ -1 !important/);

console.log("desktopAuxiliaryReference.test.mjs: PASS");
