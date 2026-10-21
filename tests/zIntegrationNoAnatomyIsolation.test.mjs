import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import crypto from "node:crypto";
const read = path => fs.readFileSync(new URL(path, import.meta.url));
const hash = data => crypto.createHash("sha256").update(data).digest("hex");
const fileHashes = {"screens/resultScreen.js": "f50f98098460858233d43539ca62f695c149a2bd27697a4122e3565da75a8f95", "screens/desktop/resultScreen.js": "5d7dc869734e4edfdebf4d61f4389148ec317777a1a6ab3a3f6386a2063af0f0", "styles/desktop-foundation.css": "49e4841e97234a454e13863ed0ea976854a2307a4bf8833b8323691ba75c707b", "styles/result-screen-base.css": "772e71dbdb720ef12d39473c9d48b70dc847429a6052bcc54e6e58d0d8a2bb24"};
test("v48 approved anatomy integration retains fixed rendering CSS and new canonical map snapshot", () => {
 for (const [path, expected] of Object.entries(fileHashes)) assert.equal(hash(read("../"+path)),expected,path);
 const shared = read("../screens/resultScreen.js").toString();
 assert.doesNotMatch(shared,/anatomicalBodySvg|ANATOMY_FRONT|ANATOMY_SOLE/);
 assert.equal(fs.existsSync(new URL("../ui/anatomicalBodySvg.js",import.meta.url)),false);
});
test("non-anatomy sync: radar is mobile-only and the legacy decorative pseudo-shape is absent", () => {
 assert.match(read("../screens/mobile/resultScreen.js").toString(),/renderMobileRunningRadar/);
 assert.doesNotMatch(read("../screens/desktop/resultScreen.js").toString(),/renderMobileRunningRadar/);
 assert.doesNotMatch(read("../ui/mobileInsights.js").toString(),/RunFingerprint/);
 assert.equal(fs.existsSync(new URL("../ui/mobileRunFingerprint.js",import.meta.url)),false);
 assert.doesNotMatch(read("../service-worker.js").toString(),/anatomicalBodySvg/);
});
test("non-anatomy sync: exactly one radar selector/axis handler registration", () => {
 const binder=read("../ui/interactions/mobileResultInteractions.js").toString();
 assert.equal((binder.match(/picker\?\.addEventListener\("change"/g)||[]).length,1);
 assert.equal((binder.match(/data-running-radar-axis\]"\)\.forEach\(button => button\.addEventListener/g)||[]).length,1);
});
