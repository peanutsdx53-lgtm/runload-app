import assert from "node:assert/strict";
import fs from "node:fs";

const read = (path) => fs.readFileSync(path, "utf8");
const css = read("styles/desktop-ui-tokens.css");
const index = read("index.html");
const worker = read("service-worker.js");

assert.match(css, /@media \(min-width: 55rem\)/);
assert.match(css, /--pc-type-eyebrow/);
assert.match(css, /--pc-type-title/);
assert.match(css, /--pc-panel-padding/);
assert.ok(index.includes('./styles/desktop-ui-tokens.css'));
assert.ok(worker.includes('./styles/desktop-ui-tokens.css'));

console.log("desktopUiTokens.test.mjs: PASS");
