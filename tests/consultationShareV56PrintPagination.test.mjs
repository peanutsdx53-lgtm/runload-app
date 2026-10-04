import fs from "node:fs";
import assert from "node:assert/strict";

const index = fs.readFileSync("index.html", "utf8");
const worker = fs.readFileSync("service-worker.js", "utf8");
const css = fs.readFileSync("styles/consultation-share-v56.css", "utf8");

assert.ok(index.includes('./styles/consultation-share-v56.css'));
assert.ok(index.indexOf('consultation-share-mobile.css') < index.indexOf('consultation-share-v56.css'));
assert.ok(worker.includes('./styles/consultation-share-v56.css'));
assert.match(css, /@media print/);
assert.match(css, /share-sheet-page[\s\S]*min-height:\s*252mm\s*!important/);
assert.match(css, /share-sheet-page[\s\S]*height:\s*auto\s*!important/);
assert.match(css, /share-sheet-page[\s\S]*display:\s*flex\s*!important/);
assert.match(css, /share-sheet-page[\s\S]*flex-direction:\s*column\s*!important/);
assert.match(css, /share-sheet-footer[\s\S]*position:\s*static\s*!important/);
assert.match(css, /share-sheet-footer[\s\S]*margin-top:\s*auto\s*!important/);
assert.doesNotMatch(css, /height:\s*297mm/);
console.log("consultationShareV56PrintPagination.test.mjs: PASS");
