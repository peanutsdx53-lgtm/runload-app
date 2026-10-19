import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { PRIMARY_DESTINATIONS } from "../ui/screenArchitecture.js";

const root = process.cwd();
const read = (relative) => fs.readFileSync(path.join(root, relative), "utf8");
const app = read("app.js");
const router = read("ui/appRouter.js");
const shell = read("ui/mobileAppShell.js") + read("ui/appShell.js");
const worker = read("service-worker.js");
const version = read("ui/appVersionStatus.js");
const tokens = read("styles/tokens.css");
const navCss = read("styles/mobile-navigation-unification.css");
const home = read("screens/mobile/homeScreen.js");
const homeHub = read("ui/mobileHomeHub.js");

assert.equal(fs.existsSync(path.join(root, "screens/startScreen.js")), false, "legacy Start screen file must stay removed");
assert.doesNotMatch(app, /renderStartScreen|screens\/startScreen|\bstart:\s*renderStartScreen/, "Start renderer must not remain registered");
assert.match(router, /DEFAULT_SCREEN = "home"/, "unknown/empty routes must resolve to Home");
assert.doesNotMatch(worker, /screens\/startScreen/, "PWA precache must not reference the deleted Start screen");

assert.deepEqual(PRIMARY_DESTINATIONS.map(({ screen }) => screen), ["home", "record-input", "result", "history", "more"]);
assert.match(shell, /<nav class="primary-navigation" aria-label="主な機能">/);
assert.doesNotMatch(shell, /primary-navigation--mobile|MOBILE_PRIMARY_NAVIGATION/, "rebaseline must not add a persistent mobile five-tab navigation");
assert.match(navCss, /Home is reached from the header, not a floating bottom navigation/);
assert.match(navCss, /screen-layout:not\(\.screen-layout--home\).*primary-navigation/);

assert.match(home, /data-home-card-id/);
assert.match(home, /data-new-home-editor/);
assert.match(home, /data-home-editor-visible/);
assert.match(home, /data-home-editor-move/);
assert.match(home, /data-home-editor-save/);
assert.match(home, /data-home-editor-reset/);
assert.match(home, /GPSで測定する/);
assert.match(home, /直近の記録/);
// Historical render helpers are retained for independent regression fixtures,
// but the active new-home renderer must never mount the old phone launcher.
const activeHomeRenderer = home.slice(home.indexOf("function renderW1MobileHome("), home.indexOf("// Retained only for independent historical tests"));
assert.doesNotMatch(activeHomeRenderer, /renderMobileHomeOs|mobile-home-hub-page--apps|data-w1-previous/);
assert.match(worker, /\.\/ui\/mobileHomeHub\.js/);

assert.doesNotMatch(tokens, /--mobile-type-/, "shared tokens must not carry mobile-only roles");

const currentVersion = version.match(/APP_VERSION = "([^"]+)"/)?.[1] || "";
assert.match(currentVersion, /^\d{4}\.\d{2}\.\d{2}\.\d+$/);
assert.ok(worker.includes(`running-record-app-runtime-${currentVersion}`));

console.log("mobileUpgradeFoundationRebaseline.test.mjs: PASS");
