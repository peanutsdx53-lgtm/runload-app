import assert from "node:assert/strict";
import fs from "node:fs";

const read = (path) => fs.readFileSync(path, "utf8");
const css = read("styles/desktop-auxiliary-reference.css");
const platformStyles = read("ui/platformStyles.js");
const worker = read("service-worker.js");
const settings = read("screens/settingsScreen.js");
const settingsNavigation = read("styles/settings-navigation.css");
const desktopSettingsNavigation = read("styles/desktop-settings-navigation-responsive.css");
const privacy = read("screens/shared/privacyScreen.js");
const support = read("screens/shared/supportGuidanceScreen.js");
const more = read("screens/desktop/moreScreen.js");

assert.ok(platformStyles.includes("./styles/desktop-auxiliary-reference.css"));
assert.ok(worker.includes('"./styles/desktop-auxiliary-reference.css"'));
assert.ok(platformStyles.indexOf("./styles/desktop-auxiliary-reference.css") > platformStyles.indexOf("./styles/desktop-unification.css"));

assert.match(css, /top: 5\.85rem !important/);
assert.match(css, /bottom: 1\.25rem !important/);
assert.match(css, /max-width: 74rem !important/);
assert.match(css, /border: 2px solid var\(--color-line\) !important/);
assert.match(css, /display: block !important;[\s\S]*background: color-mix\(in srgb, var\(--color-ink\) 60%, transparent\) !important;[\s\S]*backdrop-filter: blur\(5px\) !important/);
assert.match(css, /grid-template-rows: auto minmax\(0, 1fr\) !important/);
assert.match(css, /overflow-y: auto !important/);
assert.match(css, /secondary-derived-screen > \.secondary-derived-body > \.head[\s\S]*display: block !important/);

assert.match(css, /screen--settings\.screen-layout--settings\.secondary-derived-screen \.display-setting-list[\s\S]*grid-template-columns: repeat\(3, minmax\(0, 1fr\)\) !important/);
assert.match(css, /screen--settings\.screen-layout--settings\.secondary-derived-screen \.display-setting[\s\S]*border: 1px solid var\(--color-line\) !important/);
assert.match(css, /screen--settings\.screen-layout--settings\.secondary-derived-screen \.settings-guide-links[\s\S]*display: grid !important/);
assert.match(css, /settings-guide-link\[href\^="#\/terms"\][\s\S]*display: flex !important/);
assert.match(settings, /#\/terms\?returnTo=%23%2Fsettings/);
assert.match(settings, /#\/privacy\?returnTo=%23%2Fsettings/);
assert.match(more, /screen: "terms"/);
assert.match(more, /screen: "privacy"/);
assert.doesNotMatch(settingsNavigation, /display:\s*none/i);
assert.doesNotMatch(desktopSettingsNavigation, /display:\s*none/i);

assert.match(privacy, /type: "local"[\s\S]*open: true/);
assert.match(css, /screen--privacy\.screen-layout--privacy\.secondary-derived-screen \.list[\s\S]*grid-template-columns: repeat\(2, minmax\(0, 1fr\)\) !important/);
assert.match(css, /screen--privacy\.screen-layout--privacy\.secondary-derived-screen \.item\[open\][\s\S]*grid-column: 1 \/ -1 !important/);
assert.match(css, /screen--privacy\.screen-layout--privacy\.secondary-derived-screen \.item\[open\] \.body[\s\S]*columns: 2 !important/);
assert.match(css, /screen--privacy\.screen-layout--privacy\.secondary-derived-screen \.item summary \.copy[\s\S]*display: grid !important/);

assert.match(support, /screen--support-guidance/);
assert.match(css, /screen--support-guidance\.screen-layout--support\.secondary-derived-screen \.cards[\s\S]*grid-template-columns: repeat\(2, minmax\(0, 1fr\)\) !important/);
assert.match(css, /screen--support-guidance\.screen-layout--support\.secondary-derived-screen \.card:first-child[\s\S]*grid-column: 1 \/ -1 !important/);
assert.match(css, /screen--support-guidance\.screen-layout--support\.secondary-derived-screen \.card\.urgent[\s\S]*background: linear-gradient/);
assert.match(css, /screen--support-guidance\.screen-layout--support\.secondary-derived-screen \.card a[\s\S]*display: inline-flex !important[\s\S]*text-decoration: none !important/);

console.log("desktopAuxiliaryReference.test.mjs: PASS");
