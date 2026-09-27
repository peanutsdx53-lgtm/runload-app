import fs from "node:fs";
import assert from "node:assert/strict";

const interactions = fs.readFileSync("ui/interactions/homeInteractions.js", "utf8");
const css = fs.readFileSync("styles/mobile-home.css", "utf8");
const editingCss = fs.readFileSync("styles/mobile-home-editing.css", "utf8");

assert.ok(interactions.includes("const LAUNCH_ANIMATION_MS = 190;"));
assert.ok(interactions.includes('root.classList.add("is-home-launching")'));
assert.ok(interactions.includes('item.classList.add("is-home-launch-target")'));
assert.ok(interactions.includes('launcher.setAttribute("aria-busy", "true")'));
assert.ok(interactions.includes('globalThis.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches'));
assert.ok(interactions.includes("launchTimer = setTimeout(navigate, LAUNCH_ANIMATION_MS)"));
assert.ok(interactions.includes("if (launchTimer) clearTimeout(launchTimer)"));
assert.ok(css.includes("@keyframes mobile-home-launch-lift"));
assert.ok(css.includes("@keyframes mobile-home-launch-icon"));
assert.ok(css.includes("@keyframes mobile-home-launch-dim"));
assert.ok(css.includes(".mobile-home-os.is-home-launching"));
assert.ok(editingCss.includes(".mobile-home-launcher.is-home-launch-target"));
console.log(JSON.stringify({ suite: "Mobile Home Launch Animation", total: 12, passed: 12, failed: 0, status: "PASS" }, null, 2));
