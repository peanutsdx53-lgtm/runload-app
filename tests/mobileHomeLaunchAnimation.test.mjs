import fs from "node:fs";
import assert from "node:assert/strict";

const interactions = fs.readFileSync("ui/interactions/mobileHomeInteractions.js", "utf8");
const css = fs.readFileSync("styles/mobile-home.css", "utf8");
const editingCss = fs.readFileSync("styles/mobile-home-editing.css", "utf8");

assert.ok(interactions.includes("const LAUNCH_ANIMATION_MS = 360;"));
assert.ok(interactions.includes("const LAUNCH_NAVIGATION_MS = 260;"));
assert.ok(interactions.includes("function createLaunchSurface(launcher)"));
assert.ok(interactions.includes('surface.className = "mobile-home-launch-surface"'));
assert.ok(interactions.includes('surface.style.setProperty("--launch-left"'));
assert.ok(interactions.includes('glyph.innerHTML = icon.innerHTML'));
assert.ok(interactions.includes('document.body.append(surface)'));
assert.ok(interactions.includes('if (event.target !== surface) return;'));
assert.ok(interactions.includes('surface.addEventListener("animationend", handleSurfaceAnimationEnd)'));
assert.ok(interactions.includes("launchTimer = setTimeout(navigate, LAUNCH_NAVIGATION_MS)"));
assert.ok(interactions.includes('globalThis.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches'));
assert.ok(css.includes("@keyframes mobile-home-ios-surface-open"));
assert.ok(css.includes("@keyframes mobile-home-ios-recede"));
assert.ok(css.includes("@keyframes mobile-home-ios-glyph-away"));
assert.ok(css.includes("width: 100vw;"));
assert.ok(css.includes("height: 100dvh;"));
assert.ok(editingCss.includes(".mobile-home-launch-surface"));
console.log(JSON.stringify({ suite: "Mobile Home iOS-style Launch Transition", total: 16, passed: 16, failed: 0, status: "PASS" }, null, 2));
