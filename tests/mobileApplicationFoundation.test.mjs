import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { PRIMARY_DESTINATIONS } from "../ui/screenArchitecture.js";

const root = process.cwd();
const read = (relative) => fs.readFileSync(path.join(root, relative), "utf8");
const app = read("app.js");
const router = read("ui/appRouter.js");
const shell = read("ui/appShell.js");
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
assert.match(shell, /<nav class="primary-navigation" aria-label="主要画面">/);
assert.doesNotMatch(shell, /primary-navigation--mobile|MOBILE_PRIMARY_NAVIGATION/, "rebaseline must not add a persistent mobile five-tab navigation");
assert.match(navCss, /Home is reached from the header, not a floating bottom navigation/);
assert.match(navCss, /screen-layout:not\(\.screen-layout--home\).*primary-navigation/);

assert.match(home, /mobile-home-apps/);
assert.match(home, /mobile-home-dock/);
assert.match(home, /data-home-app-catalog/);
assert.match(home, /mobile-home-hub/);
assert.match(home, /mobile-home-overview/);
assert.match(home, /今週の記録/);
assert.match(home, /次の予定/);
assert.match(home, /最新の記録/);
assert.match(home, /前回との距離差/);
assert.doesNotMatch(home, /今日のRunLoad/, "abstract Phase 3 dashboard wording must not return");
assert.doesNotMatch(home, /mobile-dashboard/, "the Phase 3 replacement dashboard must remain withdrawn");
assert.match(homeHub, /is-home-editing/);
assert.match(homeHub, /moveTo\(0, \{ smooth: false \}\)/, "entering Home edit mode must force the existing app Home");
assert.match(worker, /\.\/ui\/mobileHomeHub\.js/);

for (const token of ["--mobile-type-caption: 0.75rem", "--mobile-type-label: 0.8125rem", "--mobile-type-body: 0.9375rem", "--mobile-type-control: 1rem", "--mobile-type-title: 1.5rem"]) {
  assert.ok(tokens.includes(token), `missing typography role ${token}`);
}

const currentVersion = version.match(/APP_VERSION = "([^"]+)"/)?.[1] || "";
assert.match(currentVersion, /^\d{4}\.\d{2}\.\d{2}\.\d+$/);
assert.ok(worker.includes(`running-record-app-runtime-${currentVersion}`));

console.log("mobileUpgradeFoundationRebaseline.test.mjs: PASS");
