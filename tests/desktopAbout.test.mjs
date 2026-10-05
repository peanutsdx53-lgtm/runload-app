import assert from "node:assert/strict";
import fs from "node:fs";

const read = (path) => fs.readFileSync(path, "utf8");
const css = read("styles/desktop-about.css");
const index = read("index.html");
const platformStyles = read("ui/platformStyles.js");
const worker = read("service-worker.js");

assert.match(css, /\.screen--about \.about-tags[\s\S]*display:\s*flex\s*!important/);
assert.match(css, /\.screen--about \.about-tags span[\s\S]*width:\s*fit-content\s*!important/);
assert.match(css, /\.screen--about \.about-panel--links[\s\S]*display:\s*flex\s*!important/);
assert.match(css, /\.screen--about \.about-panel--links > a[\s\S]*width:\s*fit-content\s*!important/);
assert.ok(platformStyles.includes('./styles/desktop-about.css'));
assert.ok(worker.includes('./styles/desktop-about.css'));

console.log("desktopAbout.test.mjs: PASS");
