import test from "node:test";
import assert from "node:assert/strict";
import { renderGpxAnalysisScreen as renderMobile } from "../screens/mobile/gpxAnalysisScreen.js";
import { renderGpxAnalysisScreen as renderDesktop } from "../screens/desktop/gpxAnalysisScreen.js";
import { bindGpxAnalysis } from "../ui/interactions/gpxAnalysisInteractions.js";
import { clearGpxCandidate, peekGpxCandidate } from "../ui/flowSessionState.js";

test("E-07 mobile GPX picker does not apply an OS file-type filter that hides .gpx on iOS", () => {
  const mobile = renderMobile({ context: {} });
  const desktop = renderDesktop({ context: {} });
  const mobileInput = mobile.match(/<input\b[^>]*\bid="gpx-file"[^>]*>/)?.[0];
  const desktopInput = desktop.match(/<input\b[^>]*\bid="gpx-file"[^>]*>/)?.[0];
  assert.ok(mobileInput, "mobile GPX file input must exist");
  assert.match(mobileInput, /\btype="file"/);
  assert.doesNotMatch(mobileInput, /\baccept\s*=/i, "native picker must not gray out unknown GPX MIME types");
  assert.match(mobile, /ルートファイル（GPX）を選ぶ/);
  assert.match(mobile, /端末内で処理・外部送信なし/);
  assert.match(mobile, /id="gpx-apply"[^>]*\bdisabled\b/);
  assert.ok(desktopInput, "desktop GPX picker must remain available");
  assert.match(desktopInput, /\baccept="\.gpx,application\/gpx\+xml,application\/xml,text\/xml"/);
});

function setup() {
  const originals = {
    document: globalThis.document,
    window: globalThis.window,
    DOMParser: globalThis.DOMParser,
  };
  const nodes = new Map();
  function element(id) {
    if (!nodes.has(id)) nodes.set(id, {
      id, value: "", textContent: "", innerHTML: "", files: [],
      disabled: false, hidden: false, handlers: new Map(),
      addEventListener(type, fn) { this.handlers.set(type, fn); },
    });
    return nodes.get(id);
  }
  globalThis.document = { getElementById: element };
  globalThis.window = { location: { hash: "" } };
  globalThis.DOMParser = class {
    parseFromString(source) {
      return {
        querySelector(selector) {
          return selector === "parsererror" && source === "NOT_XML" ? { textContent: "invalid" } : null;
        },
        querySelectorAll() { return []; },
      };
    }
  };
  element("gpx-return-to").value = "#/record-input";
  clearGpxCandidate();
  bindGpxAnalysis();
  return {
    element,
    async select(name, contents) {
      element("gpx-file").files = [{ name, size: contents.length, text: async () => contents }];
      await element("gpx-file").handlers.get("change")();
    },
    restore() {
      clearGpxCandidate();
      for (const [key, value] of Object.entries(originals)) {
        if (value === undefined) delete globalThis[key];
        else globalThis[key] = value;
      }
    },
  };
}
for (const [name, contents] of [
  ["broken.gpx", "NOT_XML"],
  ["broken.xml", "<not-a-gpx/>"],
  ["unrelated.txt", "NOT_XML"],
]) {
  test("E-07 selectable " + name + " is rejected by content validation without course approval", async () => {
    const state = setup();
    try {
      await state.select(name, contents);
      assert.match(state.element("gpx-status").textContent, /解析できません/);
      assert.equal(state.element("gpx-apply").disabled, true);
      assert.equal(state.element("gpx-result-area").hidden, true);
      assert.equal(peekGpxCandidate(), null);
      state.element("gpx-apply").handlers.get("click")();
      assert.equal(globalThis.window.location.hash, "");
    } finally { state.restore(); }
  });
}
