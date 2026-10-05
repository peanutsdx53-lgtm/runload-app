import assert from "node:assert/strict";
import fs from "node:fs";

const read = (path) => fs.readFileSync(path, "utf8");
const css = read("styles/desktop-settings.css");
const index = read("index.html");
const platformStyles = read("ui/platformStyles.js");
const worker = read("service-worker.js");

assert.match(css, /data-action="reset-update-state"[\s\S]*width:\s*fit-content\s*!important/);
assert.ok(platformStyles.includes('./styles/desktop-settings.css'));
assert.ok(worker.includes('./styles/desktop-settings.css'));

console.log("desktopSettings.test.mjs: PASS");
