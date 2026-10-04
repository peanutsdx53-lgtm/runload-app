import assert from "node:assert/strict";
import fs from "node:fs";

const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

const followupCss = read("styles/consultation-share-v56.css");
const historyScreen = read("screens/historyScreen.js");
const moreScreen = read("screens/desktop/moreScreen.js");

assert.match(historyScreen, /desktop-history-mode[\s\S]*workspace\.view === "records" \? "active"/);
assert.match(historyScreen, /self-understanding-history-filter[\s\S]*requestedState === "watching" \? "active"/);
assert.match(historyScreen, /requestedState === "paused" \? "active"/);
assert.match(historyScreen, /requestedState === "closed" \? "active"/);
assert.match(followupCss, /\.desktop-history-mode a\.active/);
assert.match(followupCss, /\.self-understanding-history-filter a\.active/);
assert.match(followupCss, /background: var\(--color-accent-strong\) !important/);

assert.match(followupCss, /container-type: inline-size/);
assert.match(followupCss, /@container \(max-width: 32rem\)/);
assert.match(followupCss, /\.share-sheet-head[\s\S]*grid-template-columns: minmax\(0, 1fr\)/);
assert.match(followupCss, /\.share-sheet-head dl[\s\S]*repeat\(3, minmax\(0, 1fr\)\)/);

assert.match(moreScreen, /screen: "privacy"/);
assert.match(moreScreen, /screen: "terms"/);
assert.match(followupCss, /settings-guide-link\[href\^="#\/terms"\]/);
assert.match(followupCss, /settings-guide-link\[href\^="#\/privacy"\]/);
assert.match(followupCss, /\.screen--settings \.group:has\(\.settings-guide-links\)/);

console.log("desktop follow-up v60: PASS");
