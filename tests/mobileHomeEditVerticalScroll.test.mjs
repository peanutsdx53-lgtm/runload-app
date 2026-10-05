import fs from 'node:fs';
import assert from 'node:assert/strict';

const support = fs.readFileSync('ui/mobileHomeEditScroll.js', 'utf8');
const gridUtilities = fs.readFileSync('ui/mobileHomeGridUtilities.js', 'utf8');
const index = fs.readFileSync('index.html', 'utf8');
const mobileEntry = fs.readFileSync('ui/mobileRuntimeEntry.js', 'utf8');
const worker = fs.readFileSync('service-worker.js', 'utf8');

const results = [];
function test(id, fn) {
  try {
    fn();
    results.push({ id, status: 'PASS' });
  } catch (error) {
    results.push({ id, status: 'FAIL', message: String(error?.stack || error) });
  }
}

test('EDIT-VERTICAL-SWIPE-SCROLLS-BEFORE-DRAG-IS-ARMED', () => {
  assert.ok(support.includes('gestureTarget?.classList.contains("is-home-drag-armed")'));
  assert.ok(support.includes('dispatchSyntheticPointerCancel();'));
  assert.ok(support.includes('event.stopPropagation();'));
  assert.ok(support.includes('scrollDocumentBy(lastY - event.clientY);'));
});

test('EDIT-DRAG-AUTO-SCROLLS-AT-VIEWPORT-EDGES', () => {
  assert.ok(support.includes('root.classList.contains("is-home-drag-active")'));
  assert.ok(support.includes('function dragScrollSpeedForPoint(clientX, clientY)'));
  assert.ok(support.includes('requestAnimationFrame(dragAutoScrollStep)'));
  assert.ok(support.includes('refreshExistingDragTarget(now)'));
});

test('NORMAL-LONG-PRESS-DRAG-CAN-JOIN-AUTO-SCROLL', () => {
  assert.ok(support.includes('function adoptActiveDrag(event)'));
  assert.ok(support.includes('.mobile-home-os.is-home-drag-active'));
  assert.ok(support.includes('if (pointerId == null) adoptActiveDrag(event);'));
});

test('DRAG-AUTO-SCROLL-STOPS-AT-DOCUMENT-EDGE', () => {
  assert.ok(support.includes('if (!moved) {'));
  assert.ok(support.includes('dragScrollSpeed = 0;'));
});

test('DRAG-AUTO-SCROLL-DOES-NOT-FIGHT-DOCK-OR-PAGE-CONTROLS', () => {
  assert.ok(support.includes('.mobile-home-dock, .mobile-home-page-indicator, [data-home-widget-picker]'));
});

test('HOME-ICON-DROP-ON-ICON-SWAPS-GRID-POSITIONS', () => {
  assert.ok(support.includes('function iconSwapCandidate(event)'));
  assert.ok(support.includes('.is-home-dragging[data-home-item-id]'));
  assert.ok(support.includes('.is-home-drop-target[data-home-item-id]'));
  assert.ok(support.includes('applyIconPlacement(source, targetPlacement);'));
  assert.ok(support.includes('applyIconPlacement(target, sourcePlacement);'));
  assert.ok(support.includes('persistHomePositions(homeRoot);'));
});

test('HOME-ICON-SWAP-EXCLUDES-DOCK-AND-WIDGETS', () => {
  assert.ok(support.includes('source.closest(".mobile-home-dock")'));
  assert.ok(support.includes('target.closest(".mobile-home-dock")'));
  assert.ok(support.includes('.is-home-dragging[data-home-item-id]'));
  assert.ok(!support.includes('.is-home-dragging[data-home-widget-id]'));
});

test('ICON-TARGET-HIDES-EMPTY-SLOT-PREVIEW', () => {
  assert.ok(support.includes('function hideFreePlacementPreviewForIconTarget()'));
  assert.ok(support.includes('root.querySelectorAll(".mobile-home-drop-preview")'));
});

test('SUPPORT-IS-MOBILE-ONLY', () => {
  assert.ok(support.includes('matchesMobileHomeLayout as mobileLayoutMatches'));
  assert.ok(gridUtilities.includes('(max-width: 54.99rem)'));
  assert.ok(gridUtilities.includes('typeof globalThis.matchMedia === "function"'));
});

test('SUPPORT-IS-LOADED-AND-PRECACHED', () => {
  assert.ok(mobileEntry.includes('./mobileHomeEditScroll.js'));
  assert.ok(worker.includes('"./ui/mobileHomeEditScroll.js"'));
  assert.ok(worker.includes('"./ui/mobileHomeGridUtilities.js"'));
});

const failed = results.filter((item) => item.status !== 'PASS');
console.log(JSON.stringify({ suite: 'Mobile Home Edit Vertical Scroll', total: results.length, passed: results.length - failed.length, failed: failed.length, status: failed.length ? 'FAIL' : 'PASS', results }, null, 2));
if (failed.length) process.exit(1);
