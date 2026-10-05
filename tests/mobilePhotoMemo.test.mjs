import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const results = [];

async function test(id, fn) {
  try {
    await fn();
    results.push({ id, status: 'PASS' });
  } catch (error) {
    results.push({ id, status: 'FAIL', message: error?.stack || String(error) });
  }
}

await test('PHOTO-MEMO-HOME-ENTRY-USES-EMOJI', () => {
  const home = read('screens/mobile/homeScreen.js');
  const homeLayout = read('ui/interactions/homeLayoutState.js');
  assert.ok(home.includes('href: "#/photo-note"'));
  assert.ok(home.includes('label: "写真メモ"'));
  assert.ok(home.includes('emoji: "📷"'));
  assert.ok(homeLayout.includes('id: "photo-note"'));
  assert.ok(homeLayout.includes('["#/photo-note", "photo-note"]'));
});

await test('PHOTO-MEMO-HAS-ROUTE-BINDER-AND-HOME-RETURN', () => {
  const registry = read('screens/mobileScreenRegistry.js');
  const binders = read('ui/mobileScreenInteractionBinders.js');
  const architecture = read('ui/screenArchitecture.js');
  assert.ok(registry.includes('renderPhotoMemoScreen'));
  assert.ok(registry.includes('"photo-note": renderPhotoMemoScreen'));
  assert.ok(binders.includes('bindMobilePhotoMemo'));
  assert.ok(binders.includes('"photo-note": bindMobilePhotoMemo'));
  assert.ok(architecture.includes('screen === "photo-note"'));
  assert.ok(architecture.includes('title: "写真メモ", ...mobileUtilityReturn()'));
  assert.ok(architecture.includes('return { backHref: "#/home", backLabel: "ホーム" };'));
});

await test('PHOTO-MEMO-USES-LOCAL-INDEXEDDB-WITH-CONSERVATIVE-LIMITS', () => {
  const store = read('ui/mobilePhotoMemoStore.js');
  assert.ok(store.includes('running-record-mobile-media-v1'));
  assert.ok(store.includes('indexedDB'));
  assert.ok(store.includes('PHOTO_MEMO_MAX_COUNT = 20'));
  assert.ok(store.includes('PHOTO_MEMO_MAX_BYTES = 1_000_000'));
  assert.ok(store.includes('PHOTO_MEMO_MAX_DIMENSION = 1440'));
  assert.ok(!store.includes('localStorage'));
  assert.ok(!store.includes('fetch('));
  assert.ok(!store.includes('XMLHttpRequest'));
});

await test('PHOTO-MEMO-SCREEN-ACCEPTS-USER-SELECTED-IMAGES-ONLY', () => {
  const screen = read('screens/mobile/photoMemoScreen.js');
  assert.ok(screen.includes('type="file"'));
  assert.ok(screen.includes('accept="image/*"'));
  assert.ok(screen.includes('写真とメモは、この端末のブラウザ内にのみ保存します。自動送信はしません。'));
  assert.ok(!screen.includes('http://'));
  assert.ok(!screen.includes('https://'));
});

await test('PHOTO-MEMO-COMPRESSES-AND-DOES-NOT-UPLOAD', () => {
  const interactions = read('ui/interactions/mobilePhotoMemoInteractions.js');
  assert.ok(interactions.includes('preparePhoto'));
  assert.ok(interactions.includes('canvas.toBlob'));
  assert.ok(interactions.includes('PHOTO_MEMO_MAX_BYTES'));
  assert.ok(interactions.includes('PHOTO_MEMO_MAX_DIMENSION'));
  assert.ok(interactions.includes('URL.createObjectURL'));
  assert.ok(!interactions.includes('fetch('));
  assert.ok(!interactions.includes('XMLHttpRequest'));
});

await test('PHOTO-MEMO-HISTORY-OPENS-VIEWER-AND-CONFIRMS-DELETE', () => {
  const interactions = read('ui/interactions/mobilePhotoMemoInteractions.js');
  const css = read('styles/mobile-quick-tools.css');
  assert.ok(interactions.includes('data-mobile-photo-memo-open'));
  assert.ok(interactions.includes('data-mobile-photo-memo-viewer'));
  assert.ok(interactions.includes('globalThis.confirm("この写真メモを削除しますか？")'));
  assert.ok(interactions.includes('entry.note ?'));
  assert.ok(!interactions.includes('entry.note || "写真メモ"'));
  assert.ok(css.includes('.mobile-photo-memo-viewer'));
  assert.ok(css.includes('.mobile-photo-memo-history__open'));
});

await test('PHOTO-MEMO-NORMALIZES-NEW-PHOTOS-TO-JPEG', () => {
  const interactions = read('ui/interactions/mobilePhotoMemoInteractions.js');
  assert.ok(interactions.includes('canvas.toBlob'));
  assert.ok(interactions.includes('"image/jpeg"'));
  assert.ok(!interactions.includes('return { blob: file, width, height };'));
  assert.ok(interactions.includes('displayBlobForEntry'));
});

await test('PHOTO-MEMO-STORES-BYTES-AND-DISPLAYS-VIA-DATA-URL', () => {
  const store = read('ui/mobilePhotoMemoStore.js');
  const interactions = read('ui/interactions/mobilePhotoMemoInteractions.js');
  assert.ok(store.includes('const imageBytes = await blob.arrayBuffer()'));
  assert.ok(store.includes('imageBytes,'));
  assert.ok(interactions.includes('detectImageMime'));
  assert.ok(interactions.includes('blobToDataUrl'));
  assert.ok(interactions.includes('reader.readAsDataURL(blob)'));
  assert.ok(interactions.includes('entry?.imageBytes instanceof ArrayBuffer'));
  assert.ok(interactions.includes('previewUrl = await blobToDataUrl(prepared.blob)'));
  assert.ok(!interactions.includes('previewUrl = URL.createObjectURL(prepared.blob)'));
});

await test('PHOTO-MEMO-PWA-ASSETS-ARE-PRECACHED', () => {
  const sw = read('service-worker.js');
  for (const asset of [
    './screens/mobile/photoMemoScreen.js',
    './ui/interactions/mobilePhotoMemoInteractions.js',
    './ui/mobilePhotoMemoStore.js',
  ]) assert.ok(sw.includes(asset));
});

await test('PHOTO-MEMO-STYLE-IS-SMARTPHONE-SCOPED', () => {
  const css = read('styles/mobile-quick-tools.css');
  assert.ok(css.includes('.mobile-photo-memo-picker'));
  assert.ok(css.includes('.mobile-photo-memo-preview'));
  assert.ok(css.includes('.mobile-photo-memo-history__item'));
  assert.ok(css.includes('@media (max-width: 54.99rem)'));
});

const failed = results.filter((item) => item.status === 'FAIL');
console.log(JSON.stringify({
  suite: 'Mobile Photo Memo',
  total: results.length,
  passed: results.length - failed.length,
  failed: failed.length,
  status: failed.length ? 'FAIL' : 'PASS',
  results,
}, null, 2));
if (failed.length) process.exitCode = 1;
