import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const read = (rel) => fs.readFileSync(path.join(root, rel), "utf8");

const registry = read("screens/screenRegistry.js");
const repair = read("ui/mobileSettingsHomeRepairV57.js");
const home = read("screens/homeScreen.js");
const settings = read("screens/settingsScreen.js");
const consultation = read("screens/consultationScreen.js");
const worker = read("service-worker.js");

assert.equal(fs.existsSync(path.join(root, "screens/mobile/moreScreen.js")), false);
assert.doesNotMatch(registry, /renderMobileMoreScreen/);
assert.doesNotMatch(registry, /MOBILE_SCREEN_RENDERERS[\s\S]*more:/);
assert.doesNotMatch(worker, /screens\/mobile\/moreScreen\.js/);
assert.match(repair, /startsWith\("#\/more"\)/);
assert.match(repair, /globalThis\.location\.hash = "#\/home"/);

for (const route of ["location-note", "quick-note", "gear-note", "departure-check", "fuel-note", "photo-note", "pace-tool"]) {
  assert.ok(home.includes(`href: "#/${route}"`), `missing optional Home app ${route}`);
}
assert.ok(home.includes('href="#/achievements"'));
assert.match(settings, /利用規約/);
assert.match(settings, /プライバシー/);
assert.match(repair, /このアプリについて/);
assert.ok(consultation.includes('href="#/support-guidance?recordId='));

console.log("mobile more route removal: PASS");
