import assert from "node:assert/strict";
import fs from "node:fs";

const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

const index = read("index.html");
const serviceWorker = read("service-worker.js");
const homeEnhancement = read("ui/desktopHomeEnhancement.js");
const appVersion = read("ui/appVersionStatus.js");
const about = read("screens/aboutScreen.js");
const unificationCss = read("styles/desktop-unification-v58.css");
const rofCompactCss = read("styles/rof-j-compact.css");
const currentVersion = appVersion.match(/APP_VERSION = "([^"]+)"/)?.[1] || "";

assert.match(currentVersion, /^\d{4}\.\d{2}\.\d{2}\.\d+$/);
assert.match(index, /styles\/desktop-unification-v58\.css/);
assert.ok(
  index.indexOf("styles/desktop-unification-v58.css") > index.indexOf("styles/desktop-history-state.css"),
  "desktop unification CSS must be loaded after older desktop/share layers",
);

const escapedVersion = currentVersion.replaceAll(".", "\\.");
assert.match(serviceWorker, new RegExp(`running-record-app-runtime-${escapedVersion}`));
assert.match(serviceWorker, /\.\/styles\/desktop-unification-v58\.css/);
assert.match(serviceWorker, /\.\/ui\/mobileNavigationPolicy\.js/);
assert.match(serviceWorker, /fetch\(new Request\(request, \{ cache: "no-store" \}\)\)/);

assert.match(homeEnhancement, /pc-home-accessible-title/);
assert.ok(!homeEnhancement.includes('<h1>ホーム</h1>'), "desktop home must not render a second visible Home title");
assert.ok(!homeEnhancement.includes('<h1 class="visually-hidden">ホーム</h1>'), "desktop visual heading must not own the hidden h1 either");
assert.match(rofCompactCss, /body:not\(\.record-overlay-open\)[\s\S]*data-record-rof-overlay/);

assert.ok(appVersion.includes(`APP_VERSION = "${currentVersion}"`));
assert.ok(about.includes(`v${currentVersion}`), "About screen must match current app version.");

for (const required of [
  ".pc-global-back",
  ".screen--history > .page-head > div",
  ".secondary-derived-screen",
  ".button--primary",
]) {
  assert.ok(unificationCss.includes(required), `desktop unification CSS missing ${required}`);
}

console.log("desktop unification wiring v59: PASS");
