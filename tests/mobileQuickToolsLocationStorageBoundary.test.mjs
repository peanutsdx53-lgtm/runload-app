import assert from 'node:assert/strict';
import { bindMobileQuickTool } from '../ui/interactions/mobileQuickToolsInteractions.js';
import { addMobileQuickToolEntry, loadMobileQuickTools } from '../ui/mobileQuickToolsStore.js';
import { writeMobileLocalJson } from '../ui/mobileStorageUtilities.js';

const KEY = 'running-record-mobile-quick-tools-v1';
const results = [];
async function check(id, fn) {
  try { await fn(); results.push({ id, status: 'PASS' }); }
  catch (error) { results.push({ id, status: 'FAIL', message: String(error?.stack || error) }); }
}
function storageMock() {
  const entries = new Map();
  return {
    getItem(key) { return entries.has(key) ? entries.get(key) : null; },
    setItem(key, value) { entries.set(key, String(value)); },
    removeItem(key) { entries.delete(key); },
    entries,
  };
}
function makeFormHarness({ geolocation = null, storage = storageMock() } = {}) {
  const old = { document: Object.getOwnPropertyDescriptor(globalThis, "document"),
    navigator: Object.getOwnPropertyDescriptor(globalThis, "navigator"),
    FormData: Object.getOwnPropertyDescriptor(globalThis, "FormData"),
    localStorage: Object.getOwnPropertyDescriptor(globalThis, "localStorage") };
  const callbacks = new Map();
  const rootEvents = new Map();
  const button = { disabled: false, addEventListener(event, cb) { callbacks.set(event, cb); }, removeEventListener(event) { callbacks.delete(event); } };
  const locationStatus = { textContent: '', dataset: {} };
  const formStatus = { textContent: '', dataset: {} };
  const elements = { latitude: { value: '' }, longitude: { value: '' }, accuracy: { value: '' } };
  const form = { dataset: { mobileToolForm: 'location' }, elements, values: { category: '坂', note: '確認メモ' } };
  const root = {
    querySelector(selector) {
      return ({
        '[data-mobile-location-capture]': button,
        '[data-mobile-location-status]': locationStatus,
        '[data-mobile-tool-form="location"]': form,
        '[data-mobile-tool-form]': form,
        '[data-mobile-tool-form-status]': formStatus,
      })[selector] ?? null;
    },
    addEventListener(event, cb) { rootEvents.set(event, cb); },
    removeEventListener(event) { rootEvents.delete(event); },
  };
  class FakeFormData {
    constructor(target) {
      this.data = { ...target.values, ...Object.fromEntries(Object.entries(target.elements).map(([k, v]) => [k, v.value])) };
    }
    entries() { return Object.entries(this.data)[Symbol.iterator](); }
    get(key) { return this.data[key]; }
    getAll(key) { return this.data[key] == null ? [] : [this.data[key]]; }
  }
  globalThis.document = { querySelector: (selector) => selector === '[data-mobile-tool]' ? root : null };
  Object.defineProperty(globalThis, "navigator", { configurable: true, writable: true, value: geolocation ? { geolocation } : {} });
  globalThis.FormData = FakeFormData;
  globalThis.localStorage = storage;
  let rerenderCount = 0;
  const cleanup = bindMobileQuickTool({ rerender() { rerenderCount++; } });
  return {
    button, form, locationStatus, formStatus, storage,
    capture() { callbacks.get('click')(); },
    submit() { rootEvents.get('submit')({ target: form, preventDefault() {} }); },
    saved() { return loadMobileQuickTools().locationNotes; },
    get rerenders() { return rerenderCount; },
    cleanup() { cleanup?.(); for (const [name, descriptor] of Object.entries(old)) {
      if (descriptor) Object.defineProperty(globalThis, name, descriptor);
      else delete globalThis[name];
    } },
  };
}
async function inHarness(id, setup, run) {
  await check(id, () => { const h = makeFormHarness(setup); try { run(h); } finally { h.cleanup(); } });
}

await check('NO-STORAGE-MUST-NOT-REPORT-SUCCESS', () => {
  const previous = globalThis.localStorage;
  try { delete globalThis.localStorage; assert.equal(writeMobileLocalJson('test', { a: 1 }), false); }
  finally { if (previous === undefined) delete globalThis.localStorage; else globalThis.localStorage = previous; }
});
await check('NO-STORAGE-QUICK-ENTRY-IS-REJECTED', () => {
  const previous = globalThis.localStorage;
  try { delete globalThis.localStorage; assert.equal(addMobileQuickToolEntry('quick', { good: 'test' }), null); }
  finally { if (previous === undefined) delete globalThis.localStorage; else globalThis.localStorage = previous; }
});
await check('STORAGE-QUOTA-ERROR-IS-REJECTED', () => {
  const previous = globalThis.localStorage;
  try { globalThis.localStorage = { getItem() { return null; }, setItem() { throw new Error('quota'); } };
    assert.equal(writeMobileLocalJson('test', { a: 1 }), false);
    assert.equal(addMobileQuickToolEntry('quick', { good: 'test' }), null);
  } finally { if (previous === undefined) delete globalThis.localStorage; else globalThis.localStorage = previous; }
});
await inHarness('LOCATION-EMPTY-HIDDEN-COORDS-REJECTED', {}, h => {
  h.submit(); assert.equal(h.saved().length, 0); assert.equal(h.rerenders, 0);
  assert.match(h.formStatus.textContent, /現在地/);
});
await inHarness('LOCATION-WHITESPACE-HIDDEN-COORDS-REJECTED', {}, h => {
  h.form.elements.latitude.value = '  ';
  h.form.elements.longitude.value = '  ';
  h.submit(); assert.equal(h.saved().length, 0); assert.equal(h.rerenders, 0);
});
await inHarness('LOCATION-MALFORMED-GEO-RESPONSE-REJECTED', { geolocation: { getCurrentPosition(ok) { ok({ coords: { latitude: null, longitude: null, accuracy: 0 } }); } } }, h => {
  h.capture(); h.submit(); assert.equal(h.saved().length, 0); assert.equal(h.rerenders, 0);
  assert.equal(h.button.disabled, false);
});
await inHarness('LOCATION-GEO-UNAVAILABLE-REJECTED', {}, h => {
  h.capture(); h.submit(); assert.equal(h.saved().length, 0); assert.equal(h.rerenders, 0);
  assert.match(h.locationStatus.textContent, /利用できません/);
});
await inHarness('LOCATION-DENIED-REJECTED', { geolocation: { getCurrentPosition(ok, fail) { fail({ code: 1 }); } } }, h => {
  h.capture(); h.submit(); assert.equal(h.saved().length, 0); assert.equal(h.rerenders, 0);
  assert.match(h.locationStatus.textContent, /許可/); assert.equal(h.button.disabled, false);
});
await inHarness('LOCATION-VALID-COORDINATES-PERSIST', { geolocation: { getCurrentPosition(ok) { ok({ coords: { latitude: 35.6812, longitude: 139.7671, accuracy: 7 } }); } } }, h => {
  h.capture(); h.submit(); assert.equal(h.saved().length, 1); assert.equal(h.rerenders, 1);
  assert.equal(h.saved()[0].latitude, 35.6812); assert.equal(h.saved()[0].longitude, 139.7671);
});
await inHarness('LOCATION-LEGITIMATE-ZERO-COORDINATES-VALID', { geolocation: { getCurrentPosition(ok) { ok({ coords: { latitude: 0, longitude: 0, accuracy: 1 } }); } } }, h => {
  h.capture(); h.submit(); assert.equal(h.saved().length, 1);
  assert.equal(h.saved()[0].latitude, 0); assert.equal(h.saved()[0].longitude, 0);
});
for (const [id, latitude, longitude] of [
  ['LAT-OVER-90', 90.1, 0], ['LAT-UNDER-MINUS-90', -90.1, 0],
  ['LON-OVER-180', 0, 180.1], ['LON-UNDER-MINUS-180', 0, -180.1],
  ['LAT-NAN', Number.NaN, 2], ['LON-INFINITY', 2, Infinity],
]) {
  await inHarness(`LOCATION-${id}-REJECTED`, { geolocation: { getCurrentPosition(ok) { ok({ coords: { latitude, longitude, accuracy: 3 } }); } } }, h => {
    h.capture(); h.submit(); assert.equal(h.saved().length, 0); assert.equal(h.rerenders, 0);
  });
}
await inHarness('LOCATION-FAILED-RETRY-CLEARS-OLD-COORDINATES', { geolocation: {
  attempts: 0,
  getCurrentPosition(ok, fail) { if (++this.attempts === 1) ok({ coords: { latitude: 35, longitude: 139, accuracy: 4 } }); else fail({ code: 2 }); },
} }, h => {
  h.capture(); h.capture(); h.submit(); assert.equal(h.saved().length, 0); assert.equal(h.rerenders, 0);
});
await inHarness('LOCATION-SYNC-THROW-RECOVERS-BUTTON', { geolocation: { getCurrentPosition() { throw new Error('SecurityError'); } } }, h => {
  h.capture(); assert.equal(h.button.disabled, false); assert.match(h.locationStatus.textContent, /取得できません/);
  h.submit(); assert.equal(h.saved().length, 0);
});
await inHarness('LOCATION-FAILED-STORAGE-REJECTED', { storage: { getItem() { return null; }, setItem() { throw new Error('quota'); } }, geolocation: { getCurrentPosition(ok) { ok({ coords: { latitude: 35, longitude: 139, accuracy: 2 } }); } } }, h => {
  h.capture(); h.submit(); assert.equal(h.rerenders, 0); assert.match(h.formStatus.textContent, /保存できません/);
});

const failed = results.filter(x => x.status === 'FAIL');
console.log(JSON.stringify({ suite: 'Mobile Quick Tools Location/Storage Boundary', total: results.length, passed: results.length - failed.length, failed: failed.length, results }, null, 2));
if (failed.length) process.exitCode = 1;
