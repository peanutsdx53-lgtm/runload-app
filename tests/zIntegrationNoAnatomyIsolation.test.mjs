import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import crypto from "node:crypto";
const read = path => fs.readFileSync(new URL(path, import.meta.url));
const hash = data => crypto.createHash("sha256").update(data).digest("hex");
const fileHashes = {"screens/resultScreen.js": "73cfb6991b6bf8b10bfbd08596467d50b8523025c4292df3b14b348859fc03f1", "screens/desktop/resultScreen.js": "db347b3522e31ab75b49508d31a86cd6330d732789f4bb84b05fdc5dca1a4876", "styles/desktop-foundation.css": "58bcab8f81bb71fc38d3fe8244f7be743d0c73c6b6e982f529ae493ff17d2eb5", "styles/result-screen-base.css": "77957ee5621a2a1949f4572bad4a74433f74fe8ee7bb56c17f20fb3eadf20ed5", "ui/bodyRegionVisuals.js": "259417b238242ae0552f194a5160d717b2d9ee0436f8f9f2b4f0420f617e93eb"};
test("v134 coloring acceptance pins mirrored region geometry, stroke-free narrow anatomy and the current renderer", () => {
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
