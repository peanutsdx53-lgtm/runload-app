import assert from "node:assert/strict";
import fs from "node:fs";

const read = (path) => fs.readFileSync(path, "utf8");
const css = read("styles/mobile-home-experience.css");
const js = read("ui/mobileHomeExperience.js");
const index = read("index.html");
const worker = read("service-worker.js");

assert.match(css, /screen--home\.mobile-home-ambient/);
assert.match(css, /mobile-home-widget--dynamic/);
assert.match(css, /mobile-home-overview-card--challenge/);
assert.match(css, /runload-ambient-drift-a/);
assert.match(css, /prefers-reduced-motion/);
assert.match(js, /buildPersonalChallenge/);
assert.match(js, /buildDynamicHomeCards/);
assert.match(js, /resolveAmbientProfile/);
assert.ok(index.includes('./styles/mobile-home-experience.css'));
assert.ok(worker.includes('./styles/mobile-home-experience.css'));
assert.ok(worker.includes('./ui/mobileHomeExperience.js'));

console.log("mobileHomeExperience.test.mjs: PASS");
