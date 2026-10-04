import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(new URL("..", import.meta.url).pathname);
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

const app = read("app.js");
const screenRegistry = read("screens/screenRegistry.js");
const home = read("screens/homeScreen.js");
const achievements = read("screens/mobile/achievementsScreen.js");
const version = read("ui/appVersionStatus.js");
const sw = read("service-worker.js");
const versionMatch = version.match(/APP_VERSION = "([^"]+)"/);
const appVersion = versionMatch?.[1] || "";

assert.match(appVersion, /^\d{4}\.\d{2}\.\d{2}\.\d+$/);
assert.ok(sw.includes(`running-record-app-runtime-${appVersion}`));
assert.match(screenRegistry, /achievements: renderAchievementsScreen/);
assert.doesNotMatch(app, /start: renderStart/);
assert.match(home, /mobile-home-hub-page--apps/);
assert.match(home, /mobile-home-hub-page--overview/);
assert.match(home, /記録概要/);
assert.match(home, /renderOverviewAchievements/);
assert.doesNotMatch(screenRegistry, /renderMobileMoreScreen/);
assert.equal(fs.existsSync(path.join(root, "screens/mobile/moreScreen.js")), false);
assert.match(read("ui/mobileNavigationPolicy.js"), /startsWith\("#\/more"\)/);
assert.match(achievements, /記録・予定・休養など、保存された事実を対象/);
assert.doesNotMatch(home, /今日のRunLoad/);
assert.doesNotMatch(read("ui/mobileOnboarding.js"), /ホーム\s*\|\s*記録\s*\|\s*測定\s*\|\s*履歴\s*\|\s*その他/);

console.log("PASS mobile final v26");
