import fs from 'node:fs';
import assert from 'node:assert/strict';

const coordinator = fs.readFileSync('ui/mobileHomeDropCoordinator.js', 'utf8');
const index = fs.readFileSync('index.html', 'utf8');
const worker = fs.readFileSync('service-worker.js', 'utf8');
const versionModule = fs.readFileSync('ui/appVersionStatus.js', 'utf8');

const results = [];
function test(id, fn) {
  try {
    fn();
    results.push({ id, status: 'PASS' });
  } catch (error) {
    results.push({ id, status: 'FAIL', message: String(error?.stack || error) });
  }
}

test('HOME-ICON-SWAP-OWNS-POINTERUP', () => {
  assert.ok(coordinator.includes('event.stopImmediatePropagation();'));
  assert.ok(coordinator.includes('delete candidate.source.dataset.homeItemId;'));
  assert.ok(coordinator.includes('releaseCoreDrag(candidate, event)'));
  assert.ok(coordinator.includes('new PointerEvent("pointercancel"'));
});

test('HOME-ICON-SWAP-USES-ONLY-TWO-ORIGINAL-POSITIONS', () => {
  assert.ok(coordinator.includes('trackedSourcePlacement = placementOf(source);'));
  assert.ok(coordinator.includes('targetPlacement: placementOf(target)'));
  assert.ok(coordinator.includes('applyIconPlacement(source, targetPlacement);'));
  assert.ok(coordinator.includes('applyIconPlacement(target, sourcePlacement);'));
  assert.ok(coordinator.includes('swapDomPositions(source, target);'));
});

test('DIRECT-SWAP-CANCELS-BASE-DRAG-PATH', () => {
  assert.ok(coordinator.includes('event.stopImmediatePropagation();'));
  assert.ok(coordinator.includes('delete candidate.source.dataset.homeItemId;'));
  assert.ok(coordinator.includes('releaseCoreDrag(candidate, event)'));
});

test('DOCK-PLACEMENT-IS-NORMALIZED-CONTINUOUSLY', () => {
  assert.ok(coordinator.includes('.mobile-home-dock [data-home-item-id]'));
  assert.ok(coordinator.includes('element.style.removeProperty("grid-row");'));
  assert.ok(coordinator.includes('element.style.removeProperty("grid-column");'));
  assert.ok(coordinator.includes('delete element.dataset.homeRow;'));
  assert.ok(coordinator.includes('delete element.dataset.homeCol;'));
  assert.ok(coordinator.includes('new MutationObserver(() => queueDockNormalization(appRoot))'));
});

test('COORDINATOR-RUNS-BEFORE-EDIT-HELPER', () => {
  const coordinatorIndex = index.indexOf('./ui/mobileHomeDropCoordinator.js');
  const helperIndex = index.indexOf('./ui/mobileHomeEditScroll.js');
  assert.ok(coordinatorIndex >= 0);
  assert.ok(helperIndex > coordinatorIndex);
});

test('FIX-IS-MOBILE-ONLY', () => {
  assert.ok(coordinator.includes('(max-width: 54.99rem)'));
  assert.ok(coordinator.includes('mobileLayoutMatches()'));
});

test('PWA-CACHE-INCLUDES-COORDINATOR-AND-CURRENT-VERSION', () => {
  const version = versionModule.match(/APP_VERSION = "([^"]+)"/)?.[1] || '';
  assert.equal(version, '2026.09.29.9');
  assert.ok(worker.includes('"./ui/mobileHomeDropCoordinator.js"'));
  assert.ok(worker.includes(`running-record-app-runtime-${version}`));
});


test('ATOMIC-SWAP-PERSISTS-ORDER-AND-PLACEMENT-TOGETHER', () => {
  assert.ok(coordinator.includes('const LAYOUT_STORAGE_KEY = "running-record-mobile-home-layout-v1";'));
  assert.ok(coordinator.includes('const layoutPages = pageElements.map'));
  assert.ok(coordinator.includes('globalThis.localStorage?.setItem(POSITION_STORAGE_KEY'));
  assert.ok(coordinator.includes('globalThis.localStorage?.setItem(LAYOUT_STORAGE_KEY'));
  assert.ok(coordinator.includes('activePage: activePageIndex(root, pageElements.length)'));
});

const failed = results.filter((item) => item.status !== 'PASS');
console.log(JSON.stringify({ suite: 'Mobile Home Atomic Drop Coordinator', total: results.length, passed: results.length - failed.length, failed: failed.length, status: failed.length ? 'FAIL' : 'PASS', results }, null, 2));
if (failed.length) process.exit(1);
