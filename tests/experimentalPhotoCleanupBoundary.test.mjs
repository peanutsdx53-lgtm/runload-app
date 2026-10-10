import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { clearAppDataAcrossStores } from "../ui/interactions/settingsInteractions.js";
import { clearPlatformUserData } from "../ui/mobileAppRuntime.js";

const runtime = fs.readFileSync(new URL("../ui/interactions/settingsInteractions.js", import.meta.url), "utf8");
const store = fs.readFileSync(new URL("../ui/mobilePhotoMemoStore.js", import.meta.url), "utf8");

test("experimental photos remain in local IndexedDB unchanged", () => {
  assert.match(store, /running-record-mobile-media-v1/);
  assert.match(store, /indexedDB/);
  assert.match(store, /export async function clearAllPhotoMemos/);
});

test("platform clear returns false when IndexedDB store opening is refused", async () => {
  const previous = globalThis.indexedDB;
  try {
    globalThis.indexedDB = { open() {
      const request = {};
      queueMicrotask(() => { request.error = new Error("injected open error"); request.onerror?.(); });
      return request;
    }};
    assert.equal(await clearPlatformUserData(), false);
  } finally {
    if (previous === undefined) delete globalThis.indexedDB;
    else globalThis.indexedDB = previous;
  }
});

test("G-01 refused photo cleanup protects ordinary records by rejecting before any primary deletion", async () => {
  let primaryClearCalls = 0;
  const result = await clearAppDataAcrossStores({
    services: {dataManagement:{clearAllUserData(){ primaryClearCalls += 1; return {ok:true}; }}},
    platformRuntime: {async clearPlatformUserData(){return false;}},
  });
  assert.equal(result.ok, false);
  assert.equal(result.stage, "PLATFORM");
  assert.equal(primaryClearCalls, 0);
});
test("G-01 healthy deletion runs photo cleanup before primary store", async () => {
  const steps=[];
  const result = await clearAppDataAcrossStores({
    services: {dataManagement:{clearAllUserData(){steps.push("primary");return {ok:true};}}},
    platformRuntime: {async clearPlatformUserData(){steps.push("photo");return true;}},
  });
  assert.equal(result.ok, true);
  assert.deepEqual(steps, ["photo", "primary"]);
});
test("G-01 later primary-storage failure is not falsely reported as completed", async () => {
  const result = await clearAppDataAcrossStores({
    services: {dataManagement:{clearAllUserData(){return {ok:false, code:"QUOTA_EXCEEDED"};}}},
    platformRuntime: {async clearPlatformUserData(){return true;}},
  });
  assert.equal(result.ok, false);
  assert.equal(result.stage, "PRIMARY");
  assert.equal(result.code, "QUOTA_EXCEEDED");
});
test("G-01 data-management handler does not show home when cross-store cleanup fails",()=> {
  assert.match(runtime,/await clearAppDataAcrossStores\(\{ services, platformRuntime \}\)/);
  assert.match(runtime,/if \(!result\.ok\) \{[\s\S]*?return;[\s\S]*?\}\s*clearRecordInputWorkspace\(\)/);
  assert.match(runtime,/通常の記録は削除していません/);
});
