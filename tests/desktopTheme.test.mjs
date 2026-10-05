import assert from "node:assert/strict";
import fs from "node:fs";

const read = (path) => fs.readFileSync(path, "utf8");
const css = read("styles/desktop-theme.css");
const index = read("index.html");
const platformStyles = read("ui/platformStyles.js");
const worker = read("service-worker.js");
const guard = read("ui/readingRuntimeGuard.js");
const reading = read("screens/readingScreen.js");
const version = read("ui/appVersionStatus.js").match(/APP_VERSION = "([^"]+)"/)?.[1] || "";

assert.match(version, /^\d{4}\.\d{2}\.\d{2}\.\d+$/);
assert.match(css, /html\.rl-appearance-dark\.rl-color-standard/);
assert.match(css, /html\.rl-appearance-dark\.rl-color-natural/);
assert.match(css, /--color-paper: #0b1218/);
assert.match(css, /--color-paper: #11130f/);
assert.match(css, /--color-accent: #86bad8/);
assert.match(css, /--color-accent: #9bc5a9/);
assert.match(css, /primary-navigation__link:not\(\.is-current\)/);
assert.match(css, /opacity: 0\.86 !important/);
assert.match(css, /primary-navigation__icon, \.primary-navigation__label/);
assert.match(css, /@media \(min-width: 55rem\)/);

assert.match(platformStyles, /desktop-theme\.css/);
assert.match(index, /readingRuntimeGuard\.js/);
assert.ok(worker.includes('"./styles/desktop-theme.css"'));
assert.ok(worker.includes('"./ui/readingRuntimeGuard.js"'));
assert.match(worker, new RegExp(`running-record-app-runtime-${version.replaceAll(".", "\\.")}`));

assert.match(reading, /deferredArticleIds = DEFERRED_READING_ARTICLE_IDS/);
assert.match(guard, /globalThis\.DEFERRED_READING_ARTICLE_IDS \?\?= new Set\(\)/);

console.log("desktopTheme.test.mjs: PASS");
