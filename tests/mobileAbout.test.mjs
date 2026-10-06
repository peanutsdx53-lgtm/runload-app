import assert from "node:assert/strict";
import fs from "node:fs";
import { renderAboutScreen } from "../screens/shared/aboutScreen.js";

const read = (path) => fs.readFileSync(new URL(path, import.meta.url), "utf8");

const versionSource = read("../ui/appVersionStatus.js");
const currentVersion = versionSource.match(/APP_VERSION = "([^"]+)"/)?.[1] || "";
assert.match(currentVersion, /^\d{4}\.\d{2}\.\d{2}\.\d+$/);
const escapedVersion = currentVersion.replaceAll(".", "\\.");

const about = renderAboutScreen();
assert.match(about, /このアプリについて/);
assert.match(about, /OpenStreetMap contributors/);
assert.doesNotMatch(about, /GitHub/);
assert.match(about, new RegExp(`v${escapedVersion}`));

const css = read("../styles/mobile-about.css");
assert.match(css, /\.about-body/);
assert.match(css, /\.about-hero/);
assert.match(css, /\.about-credits/);
assert.doesNotMatch(css, /\.run-capsule/);

const screenRegistrySource = read("../screens/sharedScreenRegistry.js");
assert.match(screenRegistrySource, /about: renderAboutScreen/);
const index = read("../index.html");
const platformStyles = read("../ui/platformStyles.js");
assert.match(platformStyles, /styles\/mobile-about\.css/);
const sw = read("../service-worker.js");
assert.match(sw, /mobile-about\.css/);
assert.match(sw, /screens\/shared\/aboutScreen\.js/);

console.log("mobileAbout.test.mjs: PASS");
