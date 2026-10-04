import assert from "node:assert/strict";
import fs from "node:fs";

const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const css = read("styles/settings-navigation.css");
const moreScreen = read("screens/desktop/moreScreen.js");
const index = read("index.html");
const worker = read("service-worker.js");

assert.match(moreScreen, /screen: "privacy"/);
assert.match(moreScreen, /screen: "terms"/);
assert.match(css, /settings-guide-link\[href\^="#\/terms"\]/);
assert.match(css, /settings-guide-link\[href\^="#\/privacy"\]/);
assert.match(css, /\.screen--settings \.group:has\(\.settings-guide-links\)/);
assert.ok(index.includes("styles/settings-navigation.css"));
assert.ok(worker.includes("./styles/settings-navigation.css"));

console.log("settingsNavigation.test.mjs: PASS");
