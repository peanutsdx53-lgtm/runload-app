import fs from "node:fs";
import assert from "node:assert/strict";

const index = fs.readFileSync("index.html", "utf8");
const worker = fs.readFileSync("service-worker.js", "utf8");
const css = fs.readFileSync("styles/mobile-home-viewport-balance.css", "utf8");

assert.ok(index.includes('styles/mobile-home-viewport-balance.css'));
assert.ok(worker.includes('"./styles/mobile-home-viewport-balance.css"'));
assert.match(css, /padding-top:\s*clamp\(8px,\s*calc\(100dvh - 712px\),\s*140px\)/);
assert.match(css, /max-height:\s*42rem[\s\S]*padding-top:\s*8px;/);
assert.doesNotMatch(css, /self-understanding-history-filter/);

console.log("mobileHomeViewportBalance.test.mjs: PASS");
