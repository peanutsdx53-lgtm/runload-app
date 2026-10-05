import assert from "node:assert/strict";
import fs from "node:fs";

const read = (path) => fs.readFileSync(path, "utf8");
const history = read("ui/desktopHistoryWorkspace.js");
const css = read("styles/desktop-history.css");
const index = read("index.html");
const platformStyles = read("ui/platformStyles.js");
const desktopEntry = read("ui/desktopRuntimeEntry.js");
const worker = read("service-worker.js");
const version = read("ui/appVersionStatus.js");

assert.match(version, /APP_VERSION = "\d{4}\.\d{2}\.\d{2}\.\d+"/);
assert.match(worker, /running-record-app-runtime-\d{4}\.\d{2}\.\d{2}\.\d+/);
assert.match(platformStyles, /desktop-history\.css/);
assert.ok(worker.includes('"./styles/desktop-history.css"'));
assert.match(desktopEntry, /desktopHistoryWorkspace\.js/);
assert.ok(worker.includes('"./ui/desktopHistoryWorkspace.js"'));

assert.match(history, /history-desktop-workspace/);
assert.match(history, /表示期間/);
assert.match(history, /Object\.freeze\(\[7, 28, 90, 180\]\)/);
assert.match(history, /身体の推移/);
assert.match(history, /#\/body-timeline/);
assert.match(history, /#\/simulation\?from=history/);
assert.match(history, /新しい記録/);
assert.match(history, /matchesMobileLayout/);
assert.match(history, /data-desktop-history-workspace/);

assert.match(css, /@media \(min-width: 55rem\)/);
assert.match(css, /grid-template-columns: 1fr !important/);
assert.match(css, /history-desktop-workspace__period/);
assert.match(css, /prefers-reduced-motion/);

console.log("desktopHistory.test.mjs: PASS");
