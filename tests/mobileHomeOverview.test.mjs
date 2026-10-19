import assert from "node:assert/strict";
import fs from "node:fs";

const home = fs.readFileSync("screens/mobile/homeScreen.js", "utf8");
const css = fs.readFileSync("styles/mobile-home.css", "utf8");
const gestureCss = fs.readFileSync("styles/mobile-home-gesture.css", "utf8");
const interactions = fs.readFileSync("ui/interactions/mobileHomeInteractions.js", "utf8");
const hub = fs.readFileSync("ui/mobileHomeHub.js", "utf8");

for (const activeSurface of ["data-home-card-list", "data-new-home-editor", "data-home-editor-visible", "data-home-editor-save"]) {
  assert.ok(home.includes(activeSurface), `new editable home surface missing: ${activeSurface}`);
}
// Historical render helpers are retained for independent regression fixtures,
// but the active new-home renderer must never mount the old phone launcher.
const activeHomeRenderer = home.slice(home.indexOf("function renderW1MobileHome("), home.indexOf("// Retained only for independent historical tests"));
assert.doesNotMatch(activeHomeRenderer, /renderMobileHomeOs|mobile-home-hub-page--apps|data-w1-previous/);
assert.match(home, /直近の記録/);
assert.match(css, /\.mobile-home-hub\.is-home-overview-active \.mobile-home-dock/);
assert.match(css, /\.mobile-home-os\.is-home-editing \.mobile-home-overview-open/);
assert.match(interactions, /bindMobileHomeHub/);
assert.match(hub, /SWIPE_MIN_PX/);
assert.match(hub, /prefers-reduced-motion/);
assert.match(hub, /homeRoot\?\.classList\?\.contains\("is-home-editing"\)/);
assert.match(hub, /if \(activePage === 0\) return;/);
assert.match(hub, /\[data-home-page-viewport\]/);
assert.match(hub, /target = dx > 0 \? 0 : activePage/);
assert.match(gestureCss, /\.mobile-home-hub-viewport\{touch-action:pan-x pan-y\}/);
assert.match(gestureCss, /\.mobile-home-hub\.is-home-overview-active \.mobile-home-hub-page--overview\{touch-action:pan-y/);
assert.match(gestureCss, /\.mobile-home-overview-open\{flex:0 0 auto;min-width:64px;white-space:nowrap\}/);
assert.match(gestureCss, /mobile-home-ios-drag-handle/);
assert.match(gestureCss, /mobile-home-page-dot/);

console.log("mobileHomeOverview.test.mjs: PASS");
