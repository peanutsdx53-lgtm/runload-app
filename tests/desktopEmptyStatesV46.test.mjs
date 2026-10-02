import assert from "node:assert/strict";
import fs from "node:fs";

const read = (path) => fs.readFileSync(path, "utf8");
const css = read("styles/desktop-empty-states-v46.css");
const index = read("index.html");
const worker = read("service-worker.js");
const version = read("ui/appVersionStatus.js").match(/APP_VERSION = "([^"]+)"/)?.[1] || "";

assert.match(version, /^\d{4}\.\d{2}\.\d{2}\.\d+$/);
assert.match(css, /@media \(min-width: 55rem\)/);
assert.match(css, /\.screen--result\.screen-layout--result > \.intro:has\(> p \+ a\)/);
assert.match(css, /\.detail-main:has\(> \.compact-boundary\)/);
assert.match(css, /\.run-route-view--empty/);
assert.match(css, /primary-navigation__link:not\(\.is-current\)/);
assert.match(css, /var\(--color-surface\)/);
assert.match(css, /var\(--color-accent-soft\)/);
assert.match(index, /desktop-empty-states-v46\.css/);
assert.ok(worker.includes('"./styles/desktop-empty-states-v46.css"'));
assert.match(worker, new RegExp(`running-record-app-runtime-${version.replaceAll(".", "\\.")}`));

console.log("desktopEmptyStatesV46.test.mjs: PASS");
