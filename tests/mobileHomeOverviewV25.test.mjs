import assert from "node:assert/strict";
import fs from "node:fs";

const home = fs.readFileSync("screens/homeScreen.js", "utf8");
const css = fs.readFileSync("styles/mobile-home.css", "utf8");
const finalCss = fs.readFileSync("styles/mobile-final-polish.css", "utf8");
const interactions = fs.readFileSync("ui/interactions/homeInteractions.js", "utf8");
const hub = fs.readFileSync("ui/mobileHomeHub.js", "utf8");

for (const legacySurface of ["mobile-home-widgets", "mobile-home-apps", "mobile-home-app-catalog", "mobile-home-dock"]) {
  assert.ok(home.includes(legacySurface), `existing editable Home surface missing: ${legacySurface}`);
}
assert.match(home, /data-home-hub-page-index="0"/);
assert.match(home, /data-home-hub-page-index="1"/);
assert.match(home, /data-home-hub-target="1"/);
assert.match(home, /data-home-hub-target="0"/);
assert.match(home, /weeklySummary\(services\)/);
assert.match(home, /findSavedRunMeasurement/);
assert.match(home, /kcalCount > 0/);
assert.match(home, /activityType !== "run"/);
assert.match(css, /\.mobile-home-hub\.is-home-overview-active \.mobile-home-dock/);
assert.match(css, /\.mobile-home-os\.is-home-editing \.mobile-home-overview-open/);
assert.match(interactions, /bindMobileHomeHub/);
assert.match(hub, /SWIPE_MIN_PX/);
assert.match(hub, /prefers-reduced-motion/);
assert.match(hub, /homeRoot\?\.classList\?\.contains\("is-home-editing"\)/);
assert.match(hub, /if \(activePage === 0\) return;/);
assert.match(hub, /\[data-home-page-viewport\]/);
assert.match(hub, /target = dx > 0 \? 0 : activePage/);
assert.match(finalCss, /\.mobile-home-hub-viewport\{touch-action:pan-x pan-y\}/);
assert.match(finalCss, /\.mobile-home-hub\.is-home-overview-active \.mobile-home-hub-page--overview\{touch-action:pan-y/);
assert.match(finalCss, /\.mobile-home-overview-open\{flex:0 0 auto;min-width:64px;white-space:nowrap\}/);
assert.match(finalCss, /mobile-home-ios-drag-handle/);
assert.match(finalCss, /mobile-home-page-dot/);

console.log("mobileHomeOverviewV25.test.mjs: PASS");
