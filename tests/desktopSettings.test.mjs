import assert from "node:assert/strict";
import fs from "node:fs";

const read = (path) => fs.readFileSync(path, "utf8");
const css = read("styles/desktop-settings.css");
const unified = read("styles/desktop-unification.css");
const screen = read("screens/settingsScreen.js");
const versionPanel = read("ui/appVersionStatus.js");
const index = read("index.html");
const platformStyles = read("ui/platformStyles.js");
const worker = read("service-worker.js");

assert.match(css, /data-action="reset-update-state"[\s\S]*width:\s*fit-content\s*!important/);
assert.ok(platformStyles.includes('./styles/desktop-settings.css'));
assert.ok(worker.includes('./styles/desktop-settings.css'));
assert.match(screen, /eyebrow: "文字", title: "文字サイズ"/);
assert.doesNotMatch(screen, /eyebrow:\s*"(?:TEXT SIZE|APPEARANCE|THEME)"/);
assert.match(versionPanel, /最新版を再読み込み/);
assert.doesNotMatch(versionPanel, /更新状態を初期化|キャッシュを初期化/);
assert.match(unified, /PC information\/settings\/share workspace correction/);
assert.match(unified, /screen--settings\.screen-layout--settings \.secondary-derived-body[\s\S]*grid-template-areas:/);
assert.match(unified, /data-app-update-panel[\s\S]*position: sticky/);

console.log("desktopSettings.test.mjs: PASS");
