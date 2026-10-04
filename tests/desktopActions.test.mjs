import assert from "node:assert/strict";
import fs from "node:fs";

const read = (path) => fs.readFileSync(path, "utf8");
const css = read("styles/desktop-actions.css");
const index = read("index.html");
const worker = read("service-worker.js");

assert.match(css, /screen-actions, \.action-row, \.editor-actions/);
assert.match(css, /flex:\s*0\s+1\s+auto/);
assert.ok(index.includes('./styles/desktop-actions.css'));
assert.ok(worker.includes('./styles/desktop-actions.css'));

console.log("desktopActions.test.mjs: PASS");
