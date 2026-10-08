import assert from "node:assert/strict";
import test from "node:test";

test("home capacity import does not rewrite stored positions or layout", async () => {
  const previous = {
    document: globalThis.document,
    localStorage: globalThis.localStorage,
    requestAnimationFrame: globalThis.requestAnimationFrame,
    MutationObserver: globalThis.MutationObserver,
  };
  const writes = [];
  const saved = new Map([
    ["running-record-mobile-home-positions-v1", JSON.stringify({ version: 1, pages: [[{ token: "app:reading", row: 3, col: 3 }]] })],
    ["running-record-mobile-home-layout-v1", JSON.stringify({ version: 4, pages: [["app:reading"]], activePage: 0 })],
    ["running-record-mobile-home-widgets-v1", JSON.stringify({ visible: ["today", "plan", "changes"] })],
  ]);
  try {
    globalThis.localStorage = {
      getItem: (key) => saved.get(key) ?? null,
      setItem: (key, value) => { writes.push([key, value]); saved.set(key, value); },
    };
    globalThis.document = { getElementById: () => null };
    globalThis.requestAnimationFrame = () => 1;
    globalThis.MutationObserver = class { observe() {} };
    await import("../ui/mobileHomePageCapacity.js?audit-current-startup-no-migration");
    assert.deepEqual(writes, [], "Import-time migration must not mutate persisted layout");
  } finally {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete globalThis[key];
      else globalThis[key] = value;
    }
  }
});
