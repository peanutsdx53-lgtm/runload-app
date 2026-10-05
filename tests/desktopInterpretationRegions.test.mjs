import assert from "node:assert/strict";
import fs from "node:fs";

const read = (path) => fs.readFileSync(path, "utf8");
const css = read("styles/desktop-interpretation-regions.css");
const index = read("index.html");
const platformStyles = read("ui/platformStyles.js");
const worker = read("service-worker.js");

assert.match(css, /interpretation-room-pattern-group[\s\S]*interpretation-room-region-chips[\s\S]*grid-template-columns:\s*minmax\(0,\s*1fr\)\s*!important/);
assert.match(css, /region-chip__copy strong[\s\S]*white-space:\s*normal\s*!important/);
assert.match(css, /overflow-wrap:\s*anywhere/);
assert.ok(platformStyles.includes('./styles/desktop-interpretation-regions.css'));
assert.ok(worker.includes('./styles/desktop-interpretation-regions.css'));

console.log("desktopInterpretationRegions.test.mjs: PASS");
