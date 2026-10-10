import test from 'node:test';
import assert from 'node:assert/strict';
import { clearAllPhotoMemos } from '../ui/mobilePhotoMemoStore.js';
import { clearPlatformUserData } from '../ui/mobileAppRuntime.js';
import { clearAppDataAcrossStores } from '../ui/interactions/settingsInteractions.js';

// In browsers with an unavailable IndexedDB API, existing persisted media may
// still be inaccessible temporarily. A full deletion cannot be acknowledged.
test('G-01 photo-store deletion fails closed if IndexedDB API is unavailable', async () => {
 const original = Object.getOwnPropertyDescriptor(globalThis,'indexedDB');
 try {
  Object.defineProperty(globalThis,'indexedDB',{configurable:true,value:undefined});
  assert.equal(await clearAllPhotoMemos(),false);
  assert.equal(await clearPlatformUserData(),false);
  let primaryCalls=0;
  const result=await clearAppDataAcrossStores({
    services:{dataManagement:{clearAllUserData(){primaryCalls++;return {ok:true};}}},
    platformRuntime:{clearPlatformUserData},
  });
  assert.equal(result.ok,false);assert.equal(result.stage,'PLATFORM');
  assert.equal(primaryCalls,0,'Primary records may not be deleted when photo deletion cannot be verified');
 } finally {
  if(original)Object.defineProperty(globalThis,'indexedDB',original);
  else delete globalThis.indexedDB;
 }
});
