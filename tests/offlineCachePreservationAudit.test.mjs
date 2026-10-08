import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const recoverySource = readFileSync(new URL("../ui/bootRecovery.js", import.meta.url), "utf8");
const updateSource = readFileSync(new URL("../ui/appVersionStatus.js", import.meta.url), "utf8");

const notices = [];
let deletes = 0;
let unregistrations = 0;
let reloads = 0;
let callbacks = [];
const boot = { querySelector: () => ({ set textContent(value) { notices.push(value); } }) };
const context = {
  document: { querySelector: (selector) => selector === "#app > .app-boot" ? boot : null },
  navigator: {
    onLine: false,
    serviceWorker: { getRegistrations: async () => [{ active: { scriptURL: "https://example.org/service-worker.js" }, unregister: async () => { unregistrations += 1; } }] },
  },
  sessionStorage: {
    getItem: () => null,
    setItem: () => {},
    removeItem: () => {},
  },
  caches: { keys: async () => ["running-record-app-runtime-test"], delete: async () => { deletes += 1; } },
  setTimeout: (f) => { callbacks.push(f); },
};
context.globalThis = { ...context, location: { reload: () => { reloads += 1; } } };
vm.runInNewContext(recoverySource, context, { filename: "bootRecovery.js" });
assert.equal(callbacks.length, 1);
await callbacks[0]();
assert.equal(deletes, 0, "offline startup must preserve cached app files");
assert.equal(unregistrations, 0, "offline startup must preserve service worker");
assert.equal(reloads, 0, "offline startup must not reload into a failing state");
assert.ok(notices.some(x => x.includes("オフライン")));
assert.match(updateSource, /if \(navigator\.onLine === false\)/);
assert.match(updateSource, /オフラインでは更新できません/);
console.log("PASS offline boot and update cache preservation");
