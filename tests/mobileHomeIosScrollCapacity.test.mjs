import fs from 'node:fs';
import assert from 'node:assert/strict';

const iosFix = fs.readFileSync('ui/iosHomeEditScrollFix.js', 'utf8');
const iosCss = fs.readFileSync('styles/mobile-home-ios-editing.css', 'utf8');
const threeRowCss = fs.readFileSync('styles/mobile-home-three-row.css', 'utf8');
const capacity = fs.readFileSync('ui/mobileHomePageCapacity.js', 'utf8');
const grid = fs.readFileSync('ui/interactions/homeGridModel.js', 'utf8');
const index = fs.readFileSync('index.html', 'utf8');
const worker = fs.readFileSync('service-worker.js', 'utf8');
const versionModule = fs.readFileSync('ui/appVersionStatus.js', 'utf8');
const coordinator = fs.readFileSync('ui/mobileHomeDropCoordinator.js', 'utf8');
const crossSwap = fs.readFileSync('ui/mobileHomeWidgetIconSwap.js', 'utf8');

const results = [];
function test(id, fn) {
  try { fn(); results.push({ id, status: 'PASS' }); }
  catch (error) { results.push({ id, status: 'FAIL', message: String(error?.stack || error) }); }
}

test('IOS-EDIT-PAGING-IS-IOS-ONLY', () => {
  assert.ok(iosFix.includes('/iPhone|iPad|iPod/i'));
  assert.ok(iosFix.includes('platform === "MacIntel" && touchPoints > 1'));
  assert.ok(iosFix.includes('mobileLayoutMatches()'));
});

test('EDIT-PAGE-SWIPE-IS-RESTORED', () => {
  assert.ok(threeRowCss.includes('.mobile-home-os.is-home-editing .mobile-home-page-viewport'));
  assert.ok(threeRowCss.includes('overflow-x: auto;'));
  assert.ok(threeRowCss.includes('touch-action: pan-x;'));
  assert.ok(threeRowCss.includes('scroll-snap-type: x mandatory;'));
  assert.ok(iosFix.includes('nativePagingViewportFromEvent'));
  assert.ok(iosFix.includes('event.stopImmediatePropagation();'));
  assert.ok(!iosFix.includes('event.preventDefault();'));
});

test('PAGE-INDICATOR-USES-CIRCLES-NOT-ELONGATED-PILL', () => {
  assert.ok(threeRowCss.includes('.mobile-home-os.is-home-editing .mobile-home-page-dot'));
  assert.ok(threeRowCss.includes('width: 28px;'));
  assert.ok(threeRowCss.includes('.mobile-home-page-dot::after'));
  assert.ok(threeRowCss.includes('width: 8px;'));
  assert.ok(threeRowCss.includes('.mobile-home-page-dot[aria-current="page"]::after'));
  assert.ok(threeRowCss.includes('width: 10px;'));
  assert.ok(threeRowCss.includes('.mobile-home-page-dot[aria-current="page"] {'));
  assert.ok(threeRowCss.includes('background: transparent;'));
});

test('EDIT-PAGE-NO-LONGER-DEPENDS-ON-VERTICAL-SCROLL', () => {
  assert.ok(threeRowCss.includes('.mobile-home-os.is-home-editing .mobile-home-page'));
  assert.ok(threeRowCss.includes('min-height: 0;'));
  assert.ok(threeRowCss.includes('grid-auto-rows: 112px;'));
  assert.ok(threeRowCss.includes('grid-template-rows: repeat(var(--home-grid-rows, 3), 112px);'));
});

test('EDIT-MODE-LOCKS-VERTICAL-DOCUMENT-OVERFLOW', () => {
  assert.ok(threeRowCss.includes('html:has(.mobile-home-os.is-home-editing)'));
  assert.ok(threeRowCss.includes('body:has(.mobile-home-os.is-home-editing)'));
  assert.ok(threeRowCss.includes('overflow-y: hidden;'));
  assert.ok(threeRowCss.includes('::-webkit-scrollbar'));
  assert.ok(threeRowCss.includes('max-height: 100dvh;'));
});

test('IOS-EDIT-HARD-LOCKS-DOCUMENT-VERTICALLY', () => {
  assert.ok(iosFix.includes('IOS_VERTICAL_LOCK_CLASS'));
  assert.ok(iosFix.includes('is-runload-ios-home-edit-vertical-locked'));
  assert.ok(iosFix.includes('lockedScrollY'));
  assert.ok(iosFix.includes('lockVerticalDocument()'));
  assert.ok(iosFix.includes('unlockVerticalDocument()'));
  assert.ok(iosFix.includes('globalThis.scrollTo?.'));
  assert.ok(iosCss.includes('html.is-runload-ios-home-edit-vertical-locked body'));
  assert.ok(iosCss.includes('position: fixed;'));
  assert.ok(iosCss.includes('height: 100dvh;'));
  assert.ok(iosCss.includes('overflow: hidden !important;'));
});

test('IOS-REORDERING-HANDLE-REMAINS-EXPLICIT', () => {
  assert.ok(iosFix.includes('handle.dataset.homeDragHandle = "";'));
  assert.ok(iosFix.includes('handle.className = "mobile-home-ios-drag-handle";'));
  assert.ok(iosFix.includes('handle.textContent = "移動";'));
  assert.ok(iosFix.includes('[data-home-drag-handle]'));
  assert.ok(iosCss.includes('.mobile-home-ios-drag-handle'));
  assert.ok(iosCss.includes('touch-action: none;'));
});

test('IOS-DOCK-ITEMS-ALSO-GET-MOVE-HANDLES', () => {
  assert.ok(iosFix.includes('.mobile-home-dock [data-home-item-id]'));
  assert.ok(iosCss.includes('.mobile-home-dock [data-home-item-id] > .mobile-home-ios-drag-handle'));
  assert.ok(iosCss.includes(':is(.mobile-home-page, .mobile-home-dock)'));
});

test('IOS-EDIT-SUPPRESSES-COPY-CALLOUT-AND-SELECTION', () => {
  assert.ok(threeRowCss.includes('-webkit-touch-callout: none;'));
  assert.ok(threeRowCss.includes('-webkit-user-select: none;'));
  assert.ok(threeRowCss.includes('user-select: none;'));
  assert.ok(iosCss.includes('-webkit-user-drag: none;'));
});

test('THREE-ROW-OVERRIDE-LOADS-AFTER-IOS-EDITING-CSS', () => {
  const iosIndex = index.indexOf('./styles/mobile-home-ios-editing.css');
  const threeRowIndex = index.indexOf('./styles/mobile-home-three-row.css');
  assert.ok(iosIndex >= 0 && threeRowIndex > iosIndex);
});

test('HOME-PAGE-CAPACITY-IS-THREE-ROWS', () => {
  assert.ok(grid.includes('export const HOME_MIN_ROWS = 3;'));
  assert.ok(grid.includes('export const HOME_MAX_ROWS = 3;'));
  assert.ok(capacity.includes('const MAX_ROWS = 3;'));
  assert.ok(capacity.includes('const COLUMNS = 4;'));
  assert.ok(capacity.includes('const MAX_PAGES = 4;'));
});

test('WIDGET-FOOTPRINTS-SHARE-THE-THREE-ROW-BUDGET', () => {
  assert.ok(capacity.includes('if (size === "large") return { columns: 4, rows: 2 };'));
  assert.ok(capacity.includes('if (size === "medium") return { columns: 4, rows: 1 };'));
  assert.ok(capacity.includes('return { columns: 2, rows: 1 };'));
});

test('OLD-FOURTH-ROW-CONTENT-MIGRATES-TO-LATER-PAGES', () => {
  assert.ok(capacity.includes('migrateStoredPositions();'));
  assert.ok(capacity.includes('for (let pageIndex = originalPage; pageIndex < MAX_PAGES'));
  assert.ok(capacity.includes('while (output.length <= pageIndex) output.push([]);'));
  assert.ok(capacity.includes('pageByToken'));
});

test('INITIAL-AND-FUTURE-OVERFLOW-CREATES-A-PAGE-WITHOUT-EDIT-MODE', () => {
  assert.ok(capacity.includes('function createRepairPage(root)'));
  assert.ok(capacity.includes('track.append(page);'));
  assert.ok(capacity.includes('function placeOverflowItem('));
  assert.ok(capacity.includes('while (pages.length < MAX_PAGES)'));
  assert.ok(capacity.includes('const page = createRepairPage(root);'));
  assert.ok(capacity.includes('syncPassivePageIndicator(root);'));
  assert.ok(!capacity.includes('root.querySelector("[data-home-page-add]")?.click();'));
});

test('FUTURE-OVERFLOW-IS-REPAIRED', () => {
  assert.ok(capacity.includes('new MutationObserver(queueRepair)'));
  assert.ok(capacity.includes('placeOverflowItem(root, element, token, startPage, sizes, visible)'));
  assert.ok(capacity.includes('persistDom(root);'));
});

test('PAGE-INDICATOR-IS-MOVED-SLIGHTLY-DOWN', () => {
  assert.ok(threeRowCss.includes('bottom: calc(106px + env(safe-area-inset-bottom));'));
});

test('ICON-SWAP-FIX-REMAINS-PRESENT', () => {
  assert.ok(coordinator.includes('event.stopImmediatePropagation();'));
  assert.ok(coordinator.includes('releaseCoreDrag(candidate, event)'));
  assert.ok(coordinator.includes('swapDomPositions(source, target);'));
});

test('WIDGET-ICON-CROSS-SWAP-IS-OWNED-SEPARATELY', () => {
  assert.ok(index.includes('./ui/mobileHomeWidgetIconSwap.js'));
  assert.ok(worker.includes('"./ui/mobileHomeWidgetIconSwap.js"'));
  assert.ok(crossSwap.includes('sourceIsWidget && targetIsApp'));
  assert.ok(crossSwap.includes('sourceIsApp && targetIsWidget'));
  assert.ok(crossSwap.includes('conflicts'));
  assert.ok(crossSwap.includes('originCells'));
  assert.ok(crossSwap.includes('delete candidate.source.dataset[identity.key]'));
  assert.ok(crossSwap.includes('ensurePagingUnlocked'));
  assert.ok(crossSwap.includes('WIDGET_STORAGE_KEY'));
  assert.ok(crossSwap.includes('LAYOUT_STORAGE_KEY'));
});

test('VERSION-AND-PWA-CACHE-MATCH', () => {
  const version = versionModule.match(/APP_VERSION = "([^"]+)"/)?.[1] || '';
  assert.equal(version, '2026.09.29.2');
  assert.ok(worker.includes(`running-record-app-runtime-${version}`));
  assert.ok(worker.includes('"./ui/iosHomeEditScrollFix.js"'));
  assert.ok(worker.includes('"./styles/mobile-home-three-row.css"'));
  assert.ok(worker.includes('"./ui/mobileHomePageCapacity.js"'));
  assert.ok(worker.includes('"./ui/mobileHomeWidgetIconSwap.js"'));
});

const failed = results.filter((item) => item.status !== 'PASS');
console.log(JSON.stringify({ suite: 'Mobile Home Swipe Editing Navigation', total: results.length, passed: results.length - failed.length, failed: failed.length, status: failed.length ? 'FAIL' : 'PASS', results }, null, 2));
if (failed.length) process.exit(1);
