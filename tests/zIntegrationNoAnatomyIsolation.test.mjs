import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import crypto from "node:crypto";
const read = path => fs.readFileSync(new URL(path, import.meta.url));
const hash = data => crypto.createHash("sha256").update(data).digest("hex");
const fileHashes = {"screens/resultScreen.js": "593830eda766550788cc0f9e57df9d6e1c0d92163eea7c478a5c2b806befce83", "screens/desktop/resultScreen.js": "db347b3522e31ab75b49508d31a86cd6330d732789f4bb84b05fdc5dca1a4876", "styles/desktop-foundation.css": "5aa103df4375c0e4b025dfe791d1bade2cb26eff9b12f4c495a0ac308ab1ff31", "styles/result-screen-base.css": "bc1fdfd2df58c17e38ceb5000ea76bf3828769c1ad6270f6481e40e8cc6d3961", "ui/bodyRegionVisuals.js": "eed15af80d10ec705099081248bb3cfca22300578ddf16335ac7c0f17271c25e"};
test("v133 coloring acceptance pins updated renderer and immutable v48 anatomical geometry", () => {
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
