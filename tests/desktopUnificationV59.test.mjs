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

assert.match(index, /styles\/desktop-unification-v58\.css/);
assert.ok(
  index.indexOf("styles/desktop-unification-v58.css") > index.indexOf("styles/consultation-share-v56.css"),
  "desktop unification CSS must be loaded after older desktop/share layers",
);

assert.match(serviceWorker, /running-record-app-runtime-2026\.10\.04\.1/);
assert.match(serviceWorker, /\.\/styles\/desktop-unification-v58\.css/);
assert.match(serviceWorker, /\.\/ui\/mobileSettingsHomeRepairV57\.js/);
assert.match(serviceWorker, /fetch\(new Request\(request, \{ cache: "no-store" \}\)\)/);

assert.match(homeEnhancement, /pc-home-accessible-title/);
assert.ok(!homeEnhancement.includes('<h1>ホーム</h1>'), "desktop home must not render a second visible Home title");
assert.ok(!homeEnhancement.includes('<h1 class="visually-hidden">ホーム</h1>'), "desktop visual heading must not own the hidden h1 either");
assert.match(rofCompactCss, /body:not\(\.record-overlay-open\)[\s\S]*data-record-rof-overlay/);

assert.match(appVersion, /APP_VERSION = "2026\.10\.04\.1"/);
assert.match(about, /v2026\.10\.04\.1/);

for (const required of [
  ".pc-global-back",
  ".screen--history > .page-head > div",
  ".secondary-derived-screen",
  ".button--primary",
]) {
  assert.ok(unificationCss.includes(required), `desktop unification CSS missing ${required}`);
}

console.log("desktop unification wiring v59: PASS");
