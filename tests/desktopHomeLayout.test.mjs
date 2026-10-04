import assert from "node:assert/strict";
import fs from "node:fs";

const read = (path) => fs.readFileSync(path, "utf8");
const css = read("styles/desktop-home-layout.css");
const home = read("ui/desktopHomeWorkspace.js");
const screen = read("screens/homeScreen.js");
const index = read("index.html");
const worker = read("service-worker.js");

assert.match(css, /screen--home\.screen-layout--home[\s\S]*display:\s*block\s*!important/);
assert.match(css, /screen--home\.screen-layout--home[\s\S]*grid-template-columns:\s*none\s*!important/);
assert.match(css, /home-desktop-legacy[\s\S]*grid-column:\s*1\s*\/\s*-1\s*!important/);
assert.match(css, /pc-home-dashboard[\s\S]*1\.55fr/);
assert.match(css, /pc-home-shortcuts/);
assert.match(css, /prefers-reduced-motion/);
assert.match(home, /pc-home-dashboard/);
assert.match(home, /pc-home-shortcuts/);
assert.match(home, /条件比較/);
assert.match(home, /コース設定/);
assert.match(home, /共有用にまとめる/);
assert.match(home, /matchesMobileLayout/);
assert.match(screen, /記録と予定/);
assert.ok(index.includes('./styles/desktop-home-layout.css'));
assert.ok(worker.includes('./styles/desktop-home-layout.css'));
assert.ok(index.includes('./ui/desktopHomeWorkspace.js'));
assert.ok(worker.includes('./ui/desktopHomeWorkspace.js'));

console.log("desktopHomeLayout.test.mjs: PASS");
