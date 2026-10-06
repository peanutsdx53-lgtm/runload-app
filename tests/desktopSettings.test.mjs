import assert from "node:assert/strict";
import fs from "node:fs";

const read = (path) => fs.readFileSync(path, "utf8");
const css = read("styles/desktop-settings.css");
const auxiliary = read("styles/desktop-auxiliary-reference.css");
const screen = read("screens/settingsScreen.js");
const versionPanel = read("ui/appVersionStatus.js");
const platformStyles = read("ui/platformStyles.js");
const worker = read("service-worker.js");

assert.ok(platformStyles.includes('./styles/desktop-settings.css'));
assert.ok(worker.includes('./styles/desktop-settings.css'));
assert.match(auxiliary, /secondary-derived-screen > \.secondary-derived-head[\s\S]*display: none !important/);

assert.match(css, /width: min\(100%, 68rem\) !important/);
assert.match(css, /margin-inline: auto !important/);
assert.match(css, /display-setting-list[\s\S]*grid-template-columns: repeat\(3, minmax\(0, 1fr\)\) !important/);
assert.match(css, /display-choice-list[\s\S]*repeat\(auto-fit, minmax\(7rem, 1fr\)\)/);
assert.match(css, /display-choice:has\(input:checked\)/);

assert.match(css, /fields\.two-fields[\s\S]*grid-template-columns: repeat\(2, minmax\(0, 1fr\)\) !important/);
assert.match(css, /goal-grid[\s\S]*grid-template-columns: repeat\(3, minmax\(0, 1fr\)\) !important/);
assert.match(css, /subdetails[\s\S]*border: 1px solid var\(--color-line\) !important/);
assert.match(css, /settings-guide-links[\s\S]*width: 100% !important/);

assert.match(css, /data-overview[\s\S]*grid-template-columns: repeat\(4, minmax\(0, 1fr\)\) !important/);
assert.match(css, /hidden-file[\s\S]*display: none !important/);
assert.match(css, /label\[for="restore-backup-file"\][\s\S]*cursor: pointer !important/);
assert.match(css, /danger-box[\s\S]*background: var\(--color-attention-soft\) !important/);
assert.match(css, /data-app-update-panel[\s\S]*grid-template-areas:/);

assert.match(screen, /eyebrow: "文字", title: "文字サイズ"/);
assert.doesNotMatch(screen, /eyebrow:\s*"(?:TEXT SIZE|APPEARANCE|THEME)"/);
assert.match(screen, /#\/terms\?returnTo=%23%2Fsettings/);
assert.match(screen, /#\/privacy\?returnTo=%23%2Fsettings/);
assert.match(versionPanel, /最新版を再読み込み/);
assert.doesNotMatch(versionPanel, /更新状態を初期化|キャッシュを初期化/);

console.log("desktopSettings.test.mjs: PASS");
