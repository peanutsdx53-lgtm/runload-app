import assert from "node:assert/strict";
import fs from "node:fs";

const read = (path) => fs.readFileSync(path, "utf8");
const css = read("styles/desktop-first-use.css");
const gate = read("ui/desktopFirstUse.js");
const index = read("index.html");
const worker = read("service-worker.js");

assert.ok(index.includes('./styles/desktop-first-use.css'));
assert.ok(index.includes('./ui/desktopFirstUse.js'));
assert.ok(worker.includes('./styles/desktop-first-use.css'));
assert.ok(worker.includes('./ui/desktopFirstUse.js'));
assert.match(css, /\.desktop-first-use/);
assert.match(css, /desktop-first-use__summary/);
assert.match(gate, /TERMS_VERSION/);
assert.match(gate, /hasAcceptedCurrentTerms/);
assert.match(gate, /termsAcceptedVersion/);
assert.match(gate, /利用規約全文を確認/);
assert.match(gate, /医療判断ではありません/);
assert.match(gate, /data-desktop-terms-consent/);
assert.match(gate, /data-desktop-terms-accept/);
assert.match(gate, /matchesMobileLayout/);

console.log("desktopFirstUse.test.mjs: PASS");
