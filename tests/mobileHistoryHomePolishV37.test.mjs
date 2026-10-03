import fs from "node:fs";
import assert from "node:assert/strict";

const index = fs.readFileSync("index.html", "utf8");
const css = fs.readFileSync("styles/mobile-screenshot-polish-v37.css", "utf8");
const worker = fs.readFileSync("service-worker.js", "utf8");
const version = fs.readFileSync("ui/appVersionStatus.js", "utf8");

assert.ok(index.includes('styles/mobile-screenshot-polish-v37.css'));
assert.ok(index.indexOf('mobile-screenshot-polish-v36.css') < index.indexOf('mobile-screenshot-polish-v37.css'));
assert.ok(worker.includes('styles/mobile-screenshot-polish-v35.css'));
assert.ok(worker.includes('styles/mobile-screenshot-polish-v36.css'));
assert.ok(worker.includes('styles/mobile-screenshot-polish-v37.css'));
assert.ok(worker.includes('running-record-app-runtime-2026.10.03.3'));
assert.ok(version.includes('APP_VERSION = "2026.10.03.3"'));
assert.match(css, /self-understanding-history-filter a\s*\{[\s\S]*white-space:\s*nowrap;/);
assert.match(css, /grid-template-columns:\s*repeat\(3,/);
assert.match(css, /padding-top:\s*clamp\(8px,\s*calc\(100dvh - 712px\),\s*140px\)/);
assert.match(css, /max-height:\s*42rem[\s\S]*padding-top:\s*8px;/);
console.log("mobileHistoryHomePolishV37.test.mjs: PASS");
