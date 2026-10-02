import assert from "node:assert/strict";
import fs from "node:fs";

const read = (path) => fs.readFileSync(path, "utf8");
const css = read("styles/desktop-interpretation-v42.css");
const index = read("index.html");
const worker = read("service-worker.js");
const screen = read("screens/interpretationRoomScreen.js");
const presentation = read("ui/interpretationRoomPresentation.js");
const version = read("ui/appVersionStatus.js");

assert.match(version, /APP_VERSION = "\d{4}\.\d{2}\.\d{2}\.\d+"/);
assert.match(worker, /running-record-app-runtime-\d{4}\.\d{2}\.\d{2}\.\d+/);
assert.match(index, /desktop-interpretation-v42\.css/);
assert.ok(worker.includes('"./styles/desktop-interpretation-v42.css"'));
assert.match(screen, /renderInterpretationRoom/);
assert.match(presentation, /interpretation-room--dashboard/);
assert.match(presentation, /interpretation-room-selected-workspace/);
assert.match(presentation, /interpretation-room-next-rail/);
assert.match(css, /@media \(min-width: 55rem\)/);
assert.match(css, /grid-template-areas:[\s\S]*"insight next"[\s\S]*"patterns next"[\s\S]*"context next"/);
assert.match(css, /position: sticky/);
assert.match(css, /grid-template-areas:[\s\S]*"detail next"[\s\S]*"conditions subjective"[\s\S]*"advanced subjective"/);
assert.match(css, /width: min\(100%, 92rem\)/);
assert.match(css, /prefers-reduced-motion/);

console.log("desktopInterpretationV42.test.mjs: PASS");
