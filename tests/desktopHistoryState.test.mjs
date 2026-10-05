import assert from "node:assert/strict";
import fs from "node:fs";

const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const css = read("styles/desktop-history-state.css");
const historyScreen = read("screens/historyScreen.js");
const index = read("index.html");
const platformStyles = read("ui/platformStyles.js");
const worker = read("service-worker.js");

assert.match(historyScreen, /desktop-history-mode[\s\S]*workspace\.view === "records" \? "active"/);
assert.match(historyScreen, /self-understanding-history-filter[\s\S]*requestedState === "watching" \? "active"/);
assert.match(historyScreen, /requestedState === "paused" \? "active"/);
assert.match(historyScreen, /requestedState === "closed" \? "active"/);
assert.match(css, /\.desktop-history-mode a\.active/);
assert.match(css, /\.self-understanding-history-filter a\.active/);
assert.match(css, /background: var\(--color-accent-strong\) !important/);
assert.ok(platformStyles.includes("styles/desktop-history-state.css"));
assert.ok(worker.includes("./styles/desktop-history-state.css"));

console.log("desktopHistoryState.test.mjs: PASS");
