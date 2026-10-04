import fs from "node:fs";
import assert from "node:assert/strict";

const index = fs.readFileSync("index.html", "utf8");
const css = fs.readFileSync("styles/mobile-screenshot-polish-v37.css", "utf8");
const worker = fs.readFileSync("service-worker.js", "utf8");
const version = fs.readFileSync("ui/appVersionStatus.js", "utf8");
const appVersion = version.match(/APP_VERSION = "([^"]+)"/)?.[1] || "";

assert.ok(index.includes('styles/mobile-screenshot-polish-v37.css'));
assert.ok(!index.includes('mobile-screenshot-polish-v36.css'));
assert.ok(index.indexOf('mobile-history.css') < index.indexOf('mobile-screenshot-polish-v37.css'));
assert.ok(worker.includes('styles/mobile-history.css'));
assert.ok(!worker.includes('styles/mobile-screenshot-polish-v36.css'));
assert.ok(worker.includes('styles/mobile-screenshot-polish-v37.css'));
assert.match(appVersion, /^\d{4}\.\d{2}\.\d{2}\.\d+$/);
assert.ok(worker.includes(`running-record-app-runtime-${appVersion}`));
assert.match(css, /self-understanding-history-filter a\s*\{[\s\S]*white-space:\s*nowrap;/);
assert.match(css, /grid-template-columns:\s*repeat\(3,/);
assert.match(css, /padding-top:\s*clamp\(8px,\s*calc\(100dvh - 712px\),\s*140px\)/);
assert.match(css, /max-height:\s*42rem[\s\S]*padding-top:\s*8px;/);
console.log("mobileHistoryHomePolishV37.test.mjs: PASS");
