import assert from "node:assert/strict";
import fs from "node:fs";

const read = (path) => fs.readFileSync(path, "utf8");
const index = read("index.html");
const worker = read("service-worker.js");
const gate = read("ui/desktopFirstUse.js");
const home = read("ui/desktopHomeEnhancement.js");
const css = read("styles/desktop-refresh-v38.css");
const version = read("ui/appVersionStatus.js").match(/APP_VERSION = "([^"]+)"/)?.[1] || "";

assert.match(version, /^\d{4}\.\d{2}\.\d{2}\.\d+$/);
assert.match(index, /desktop-refresh-v38\.css/);
assert.match(index, /desktopFirstUse\.js/);
assert.match(index, /desktopHomeEnhancement\.js/);
assert.match(worker, /running-record-app-runtime-\d{4}\.\d{2}\.\d{2}\.\d+/);
for (const asset of ["./styles/desktop-refresh-v38.css", "./ui/desktopFirstUse.js", "./ui/desktopHomeEnhancement.js"]) {
  assert.ok(worker.includes(`"${asset}"`), `service worker must precache ${asset}`);
}

assert.match(gate, /TERMS_VERSION/);
assert.match(gate, /hasAcceptedCurrentTerms/);
assert.match(gate, /termsAcceptedVersion/);
assert.match(gate, /利用規約全文を確認/);
assert.match(gate, /医療判断ではありません/);
assert.match(gate, /data-desktop-terms-consent/);
assert.match(gate, /data-desktop-terms-accept/);
assert.match(gate, /matchesMobileLayout/);

assert.match(home, /pc-home-dashboard/);
assert.match(home, /pc-home-shortcuts/);
assert.match(read("screens/homeScreen.js"), /記録と予定/);
assert.match(home, /条件比較/);
assert.match(home, /コース設定/);
assert.match(home, /共有用にまとめる/);
assert.match(home, /matchesMobileLayout/);

assert.match(css, /@media \(min-width: 55rem\)/);
assert.match(css, /--pc-type-title/);
assert.match(css, /\.desktop-first-use/);
assert.match(css, /\.pc-home-dashboard/);
assert.match(css, /prefers-reduced-motion/);

console.log("desktopRefreshV38.test.mjs: PASS");
