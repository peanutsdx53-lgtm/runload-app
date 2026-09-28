import fs from 'node:fs';
import assert from 'node:assert/strict';

const iosFix = fs.readFileSync('ui/iosHomeEditScrollFix.js', 'utf8');
const iosCss = fs.readFileSync('styles/mobile-home-ios-editing.css', 'utf8');
const capacity = fs.readFileSync('ui/mobileHomePageCapacity.js', 'utf8');
const grid = fs.readFileSync('ui/interactions/homeGridModel.js', 'utf8');
const index = fs.readFileSync('index.html', 'utf8');
const worker = fs.readFileSync('service-worker.js', 'utf8');
const versionModule = fs.readFileSync('ui/appVersionStatus.js', 'utf8');
const coordinator = fs.readFileSync('ui/mobileHomeDropCoordinator.js', 'utf8');

const results = [];
function test(id, fn) {
  try { fn(); results.push({ id, status: 'PASS' }); }
  catch (error) { results.push({ id, status: 'FAIL', message: String(error?.stack || error) }); }
}

test('IOS-EDIT-SCROLL-IS-IOS-ONLY', () => {
  assert.ok(iosFix.includes('/iPhone|iPad|iPod/i'));
  assert.ok(iosFix.includes('platform === "MacIntel" && touchPoints > 1'));
  assert.ok(iosFix.includes('mobileLayoutMatches()'));
});

test('ICON-AND-WIDGET-BODIES-KEEP-NATIVE-IOS-VERTICAL-PAN', () => {
  assert.ok(iosCss.includes('touch-action: pan-y;'));
  assert.ok(iosCss.includes('.mobile-home-page [data-home-item-id]'));
  assert.ok(iosCss.includes('.mobile-home-page [data-home-widget-id]'));
  assert.ok(!iosFix.includes('globalThis.scrollTo('));
  assert.ok(!iosFix.includes('startScrollTop'));
});

test('ICON-ORIGIN-HORIZONTAL-SWIPE-RESTORES-PAGE-MOVEMENT', () => {
  assert.ok(iosFix.includes('const PAGE_SWIPE_SLOP_PX = 8;'));
  assert.ok(iosFix.includes('pageHorizontal = true;'));
  assert.ok(iosFix.includes('pageViewport.scrollLeft = clampPageLeft'));
  assert.ok(iosFix.includes('viewport.scrollTo({ left, behavior: "smooth" });'));
  assert.ok(iosFix.includes('document.addEventListener("pointermove", handlePointerMove, { capture: true, passive: false });'));
});

test('VERTICAL-GESTURE-DOES-NOT-ENTER-HORIZONTAL-PAGE-SWIPE', () => {
  assert.ok(iosFix.includes('if (absY > absX * PAGE_SWIPE_AXIS_RATIO)'));
  assert.ok(iosFix.includes('pageVertical = true;'));
  assert.ok(iosFix.includes('if (!pageHorizontal) return;'));
});

test('IOS-REORDERING-HANDLE-IS-EXPLICIT', () => {
  assert.ok(iosFix.includes('handle.dataset.homeDragHandle = "";'));
  assert.ok(iosFix.includes('handle.className = "mobile-home-ios-drag-handle";'));
  assert.ok(iosFix.includes('handle.textContent = "移動";'));
  assert.ok(iosFix.includes('button, [data-home-drag-handle]'));
  assert.ok(iosCss.includes('.mobile-home-ios-drag-handle'));
  assert.ok(iosCss.includes('touch-action: none;'));
});

test('IOS-EDIT-SUPPRESSES-COPY-CALLOUT-AND-SELECTION', () => {
  assert.ok(iosCss.includes('-webkit-touch-callout: none;'));
  assert.ok(iosCss.includes('-webkit-user-select: none;'));
  assert.ok(iosCss.includes('user-select: none;'));
  assert.ok(iosCss.includes('-webkit-user-drag: none;'));
});

test('IOS-NATIVE-SCROLL-OVERRIDE-LOADS-AFTER-BASE-EDITING-CSS', () => {
  const baseIndex = index.indexOf('./styles/mobile-home-editing.css');
  const iosIndex = index.indexOf('./styles/mobile-home-ios-editing.css');
  assert.ok(baseIndex >= 0 && iosIndex > baseIndex);
});

test('ANDROID-GENERIC-HELPER-REMAINS-LOADED', () => {
  assert.ok(index.includes('./ui/mobileHomeEditScroll.js'));
  assert.ok(index.includes('./ui/iosHomeEditScrollFix.js'));
});

test('HOME-PAGE-CAPACITY-IS-FOUR-ROWS', () => {
  assert.ok(grid.includes('export const HOME_MAX_ROWS = 4;'));
  assert.ok(capacity.includes('const MAX_ROWS = 4;'));
  assert.ok(capacity.includes('const COLUMNS = 4;'));
  assert.ok(capacity.includes('const MAX_PAGES = 4;'));
});

test('WIDGET-FOOTPRINTS-SHARE-THE-FOUR-ROW-BUDGET', () => {
  assert.ok(capacity.includes('if (size === "large") return { columns: 4, rows: 2 };'));
  assert.ok(capacity.includes('if (size === "medium") return { columns: 4, rows: 1 };'));
  assert.ok(capacity.includes('return { columns: 2, rows: 1 };'));
});

test('OLD-OVERFLOW-MIGRATES-TO-LATER-PAGES', () => {
  assert.ok(capacity.includes('migrateStoredPositions();'));
  assert.ok(capacity.includes('for (let pageIndex = originalPage; pageIndex < MAX_PAGES'));
  assert.ok(capacity.includes('while (output.length <= pageIndex) output.push([]);'));
  assert.ok(capacity.includes('pageByToken'));
});

test('FUTURE-OVERFLOW-IS-REPAIRED', () => {
  assert.ok(capacity.includes('new MutationObserver(queueRepair)'));
  assert.ok(capacity.includes('root.querySelector("[data-home-page-add]")?.click();'));
  assert.ok(capacity.includes('persistDom(root);'));
});

test('ICON-SWAP-FIX-REMAINS-PRESENT', () => {
  assert.ok(coordinator.includes('event.stopImmediatePropagation();'));
  assert.ok(coordinator.includes('releaseCoreDrag(candidate, event)'));
  assert.ok(coordinator.includes('swapDomPositions(source, target);'));
});

test('VERSION-AND-PWA-CACHE-MATCH', () => {
  const version = versionModule.match(/APP_VERSION = "([^"]+)"/)?.[1] || '';
  assert.equal(version, '2026.09.28.4');
  assert.ok(worker.includes(`running-record-app-runtime-${version}`));
  assert.ok(worker.includes('"./ui/iosHomeEditScrollFix.js"'));
  assert.ok(worker.includes('"./styles/mobile-home-ios-editing.css"'));
  assert.ok(worker.includes('"./ui/mobileHomePageCapacity.js"'));
});

const failed = results.filter((item) => item.status !== 'PASS');
console.log(JSON.stringify({ suite: 'Mobile Home iOS Native Scroll and Capacity', total: results.length, passed: results.length - failed.length, failed: failed.length, status: failed.length ? 'FAIL' : 'PASS', results }, null, 2));
if (failed.length) process.exit(1);
