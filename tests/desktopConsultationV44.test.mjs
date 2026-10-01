import assert from "node:assert/strict";
import fs from "node:fs";

const read=(path)=>fs.readFileSync(path,"utf8");
const css=read("styles/desktop-consultation-v44.css");
const screen=read("screens/consultationScreen.js");
const index=read("index.html");
const worker=read("service-worker.js");
const version=read("ui/appVersionStatus.js");

assert.match(version,/APP_VERSION = "2026\.10\.01\.\d+"/);
assert.match(worker,/running-record-app-runtime-2026\.10\.01\.\d+/);
assert.match(index,/desktop-consultation-v44\.css/);
assert.ok(worker.includes('"./styles/desktop-consultation-v44.css"'));
assert.match(screen,/data-share-prep/);
assert.match(screen,/share-purpose-step/);
assert.match(screen,/share-source-list/);
assert.match(screen,/share-preview/);
assert.match(screen,/share-output-actions/);
assert.match(css,/@media \(min-width: 69rem\)/);
assert.match(css,/grid-template-areas:[\s\S]*"purpose preview"[\s\S]*"sources preview"/);
assert.match(css,/section\.share-step:nth-of-type\(5\)/);
assert.match(css,/position: sticky/);
assert.match(css,/grid-template-columns: repeat\(2, minmax\(0, 1fr\)\)/);
assert.match(css,/prefers-reduced-motion/);

console.log("desktopConsultationV44.test.mjs: PASS");
