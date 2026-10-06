import assert from "node:assert/strict";
import fs from "node:fs";

const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const settings = read("screens/settingsScreen.js");
const moreScreen = read("screens/desktop/moreScreen.js");
const css = read("styles/settings-navigation.css");
const desktopCss = read("styles/desktop-settings-navigation-responsive.css");
const referenceCss = read("styles/desktop-auxiliary-reference.css");
const index = read("index.html");
const worker = read("service-worker.js");

assert.match(moreScreen, /screen: "privacy"/);
assert.match(moreScreen, /screen: "terms"/);
assert.match(settings, /#\/terms\?returnTo=%23%2Fsettings/);
assert.match(settings, /#\/privacy\?returnTo=%23%2Fsettings/);
assert.match(referenceCss, /settings-guide-link\[href\^="#\/terms"\]/);
assert.match(referenceCss, /settings-guide-link\[href\^="#\/privacy"\]/);
assert.doesNotMatch(css, /display:\s*none/i);
assert.doesNotMatch(desktopCss, /display:\s*none/i);
assert.ok(index.includes("styles/settings-navigation.css"));
assert.ok(worker.includes("./styles/settings-navigation.css"));

console.log("settingsNavigation.test.mjs: PASS");
