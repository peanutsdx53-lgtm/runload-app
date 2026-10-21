import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import crypto from "node:crypto";
const read = path => fs.readFileSync(new URL(path, import.meta.url));
const hash = data => crypto.createHash("sha256").update(data).digest("hex");
const fileHashes = {"screens/resultScreen.js": "fa349e9f50a86caa5fb13b3450ed341a8b98ffa60df5272e0e2f691d1862dffb", "screens/desktop/resultScreen.js": "db347b3522e31ab75b49508d31a86cd6330d732789f4bb84b05fdc5dca1a4876", "styles/desktop-foundation.css": "58bcab8f81bb71fc38d3fe8244f7be743d0c73c6b6e982f529ae493ff17d2eb5", "styles/result-screen-base.css": "d5b6f09cc8fc1035cef549b8b6b40c8e69534ae4009080593e8935bbb87b31ac", "ui/bodyRegionVisuals.js": "259417b238242ae0552f194a5160d717b2d9ee0436f8f9f2b4f0420f617e93eb"};
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
