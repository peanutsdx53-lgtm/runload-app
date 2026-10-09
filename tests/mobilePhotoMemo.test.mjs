import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { savePhotoMemo, listPhotoMemos, deletePhotoMemo, clearAllPhotoMemos } from "../ui/mobilePhotoMemoStore.js";
const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
test("retired mobile photo memo has no interactive entry points", () => {
  for (const path of ["screens/mobile/homeScreen.js", "screens/mobileScreenRegistry.js", "ui/mobileScreenInteractionBinders.js", "ui/interactions/mobileHomeLayoutState.js", "ui/screenArchitecture.js", "screens/mobile/quickToolsScreen.js", "ui/interactions/mobileQuickToolsInteractions.js"]) {
    assert.doesNotMatch(read(path), /photo-note|renderLocationNoteScreen|renderQuickNoteScreen|renderGearNoteScreen|renderFuelNoteScreen/);
  }
  assert.equal(fs.existsSync(new URL("../screens/mobile/photoMemoScreen.js", import.meta.url)), false);
  assert.equal(fs.existsSync(new URL("../ui/interactions/mobilePhotoMemoInteractions.js", import.meta.url)), false);
});
test("photo storage remains an independently importable experimental module", () => {
  assert.equal(typeof savePhotoMemo, "function");
  assert.equal(typeof listPhotoMemos, "function");
  assert.equal(typeof deletePhotoMemo, "function");
  assert.equal(typeof clearAllPhotoMemos, "function");
  const store = read("ui/mobilePhotoMemoStore.js");
  assert.match(store, /running-record-mobile-media-v1/);
  assert.match(store, /indexedDB/);
  assert.match(store, /PHOTO_MEMO_MAX_COUNT = 20/);
  assert.match(store, /PHOTO_MEMO_MAX_BYTES = 1_000_000/);
  assert.match(store, /PHOTO_MEMO_MAX_DIMENSION = 1440/);
  assert.doesNotMatch(store, /fetch\(|XMLHttpRequest/);
});
test("photo persistence module stays in the offline mobile asset list", () => {
  const sw = read("service-worker.js");
  assert.match(sw, /\.\/ui\/mobilePhotoMemoStore\.js/);
  assert.doesNotMatch(sw, /photoMemoScreen\.js|mobilePhotoMemoInteractions\.js/);
});
