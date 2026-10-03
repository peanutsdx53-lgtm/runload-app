import fs from "node:fs";
import assert from "node:assert/strict";

const index = fs.readFileSync("index.html", "utf8");
const css = fs.readFileSync("styles/mobile-home-shift-v38.css", "utf8");

assert.ok(index.includes('styles/mobile-home-shift-v38.css'));
assert.match(css, /transform:\s*translateY\(72px\)/);
assert.match(css, /max-height:\s*42rem/);
assert.match(css, /transform:\s*translateY\(48px\)/);
console.log("mobileHomeShiftV38.test.mjs: PASS");
