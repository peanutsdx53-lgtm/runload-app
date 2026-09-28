import fs from 'node:fs';
import assert from 'node:assert/strict';

const iosFix = fs.readFileSync('ui/iosHomeEditScrollFix.js', 'utf8');
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

test('IOS-EDIT-SCROLL-USES-ABSOLUTE-GESTURE-ORIGIN', () => {
  assert.ok(iosFix.includes('startScrollTop = currentScrollTop();'));
  assert.ok(iosFix.includes('startScrollTop + (startY - event.clientY)'));
  assert.ok(iosFix.includes('globalThis.scrollTo(0, next);'));
  assert.ok(iosFix.includes('event.stopImmediatePropagation();'));
});

test('ANDROID-LEGACY-SCROLL-PATH-REMAINS-LOADED', () => {
  assert.ok(index.includes('./ui/mobileHomeEditScroll.js'));
  const iosIndex = index.indexOf('./ui/iosHomeEditScrollFix.js');
  const legacyIndex = index.indexOf('./ui/mobileHomeEditScroll.js');
  assert.ok(iosIndex >= 0 && legacyIndex > iosIndex);
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
  assert.equal(version, '2026.09.28.1');
  assert.ok(worker.includes(`running-record-app-runtime-${version}`));
  assert.ok(worker.includes('"./ui/iosHomeEditScrollFix.js"'));
  assert.ok(worker.includes('"./ui/mobileHomePageCapacity.js"'));
});

const failed = results.filter((item) => item.status !== 'PASS');
console.log(JSON.stringify({ suite: 'Mobile Home iOS Scroll and Capacity', total: results.length, passed: results.length - failed.length, failed: failed.length, status: failed.length ? 'FAIL' : 'PASS', results }, null, 2));
if (failed.length) process.exit(1);
