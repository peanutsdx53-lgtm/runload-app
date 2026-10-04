import assert from "node:assert/strict";
import fs from "node:fs";

const read = (path) => fs.readFileSync(path, "utf8");
const css = read("styles/desktop-home-layout.css");
const index = read("index.html");
const worker = read("service-worker.js");

assert.match(css, /screen--home\.screen-layout--home[\s\S]*display:\s*block\s*!important/);
assert.match(css, /screen--home\.screen-layout--home[\s\S]*grid-template-columns:\s*none\s*!important/);
assert.match(css, /home-desktop-legacy[\s\S]*grid-column:\s*1\s*\/\s*-1\s*!important/);
assert.match(css, /pc-home-dashboard[\s\S]*1\.55fr/);
assert.ok(index.includes('./styles/desktop-home-layout.css'));
assert.ok(worker.includes('./styles/desktop-home-layout.css'));

console.log("desktopHomeLayout.test.mjs: PASS");
