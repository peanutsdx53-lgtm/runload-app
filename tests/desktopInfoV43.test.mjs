import assert from "node:assert/strict";
import fs from "node:fs";

const read=(path)=>fs.readFileSync(path,"utf8");
const css=read("styles/desktop-info-v43.css");
const more=read("screens/moreScreen.js");
const terms=read("screens/termsScreen.js");
const privacy=read("screens/privacyScreen.js");
const index=read("index.html");
const worker=read("service-worker.js");
const version=read("ui/appVersionStatus.js");

assert.match(version,/APP_VERSION = "\d{4}\.\d{2}\.\d{2}\.\d+"/);
assert.match(worker,/running-record-app-runtime-\d{4}\.\d{2}\.\d{2}\.\d+/);
assert.match(index,/desktop-info-v43\.css/);
assert.ok(worker.includes('"./styles/desktop-info-v43.css"'));
assert.match(more,/このアプリについて/);
assert.match(more,/設定、共有、サポート、アプリ情報をまとめています。/);
assert.match(more,/if \(matchesMobileLayout\(\)\) return renderMobileMoreScreen\(\)/);
assert.match(terms,/terms-section/);
assert.match(privacy,/screen--privacy/);
assert.match(css,/@media \(min-width: 55rem\)/);
assert.match(css,/screen--more\.screen-layout--more/);
assert.match(css,/grid-template-columns: repeat\(2, minmax\(0, 1fr\)\)/);
assert.match(css,/screen--terms \.terms-body/);
assert.match(css,/screen--privacy\.screen-layout--privacy \.item\[open\]/);
assert.match(css,/screen--about \.about-body/);
assert.match(css,/prefers-reduced-motion/);

console.log("desktopInfoV43.test.mjs: PASS");
