import assert from "node:assert/strict";
import fs from "node:fs";

const read=(path)=>fs.readFileSync(path,"utf8");
const legacyCss=read("styles/desktop-consultation-v44.css");
const shareCss=read("styles/consultation-share.css");
const screen=read("screens/consultationScreen.js");
const index=read("index.html");
const worker=read("service-worker.js");
const version=read("ui/appVersionStatus.js");

assert.match(version,/APP_VERSION = "\d{4}\.\d{2}\.\d{2}\.\d+"/);
assert.match(worker,/running-record-app-runtime-\d{4}\.\d{2}\.\d{2}\.\d+/);
assert.match(index,/desktop-consultation-v44\.css/);
assert.match(index,/consultation-share\.css/);
assert.ok(worker.includes('"./styles/desktop-consultation-v44.css"'));
assert.ok(worker.includes('"./styles/consultation-share.css"'));
assert.match(screen,/data-share-prep/);
assert.match(screen,/share-purpose-step/);
assert.match(screen,/share-source-list/);
assert.match(screen,/share-document-stage/);
assert.match(screen,/share-output-actions/);
assert.match(screen,/完成資料を確認/);
assert.match(legacyCss,/@media \(min-width: 69rem\)/);
assert.match(shareCss,/Neutralize the legacy V44 desktop grid/);
assert.match(shareCss,/grid-template-areas: none !important/);
assert.match(shareCss,/grid-template-columns: repeat\(3, minmax\(0, 1fr\)\) !important/);
assert.match(shareCss,/@media print/);

console.log("desktopConsultationV44.test.mjs: PASS");
