import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(new URL("..", import.meta.url).pathname);
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

const app = read("app.js");
const home = read("screens/homeScreen.js");
const more = read("screens/moreScreen.js");
const achievements = read("screens/achievementsScreen.js");
const version = read("ui/appVersionStatus.js");
const sw = read("service-worker.js");

assert.match(version, /APP_VERSION = "2026\.09\.30\.30"/);
assert.match(sw, /2026\.09\.30\.30/);
assert.match(app, /achievements: renderAchievementsScreen/);
assert.doesNotMatch(app, /start: renderStart/);
assert.match(home, /mobile-home-hub-page--apps/);
assert.match(home, /mobile-home-hub-page--overview/);
assert.match(home, /記録概要/);
assert.match(home, /renderOverviewAchievements/);
assert.match(more, /matchesMobileLayout/);
assert.match(more, /スマホ機能/);
assert.match(achievements, /速さだけでなく、記録・予定・休養・振り返りも対象/);
assert.doesNotMatch(home, /今日のRunLoad/);
assert.doesNotMatch(read("ui/mobileOnboarding.js"), /ホーム\s*\|\s*記録\s*\|\s*測定\s*\|\s*履歴\s*\|\s*その他/);

console.log("PASS mobile final v26");
