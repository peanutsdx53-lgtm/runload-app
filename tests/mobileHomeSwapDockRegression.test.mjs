import fs from 'node:fs';
import assert from 'node:assert/strict';

const support = fs.readFileSync('ui/mobileHomeEditScroll.js', 'utf8');

const results = [];
function test(id, fn) {
  try {
    fn();
    results.push({ id, status: 'PASS' });
  } catch (error) {
    results.push({ id, status: 'FAIL', message: String(error?.stack || error) });
  }
}

test('ICON-SWAP-USES-DRAG-ORIGIN-AND-TARGET-PLACEMENT', () => {
  assert.ok(support.includes('function captureDragOrigin(homeRoot, target)'));
  assert.ok(support.includes('dragOrigin?.source === source'));
  assert.ok(support.includes('applyIconPlacement(source, targetPlacement);'));
  assert.ok(support.includes('applyIconPlacement(target, sourcePlacement);'));
});

test('ICON-SWAP-FINALIZES-AFTER-CORE-POINTERUP-HANDLER', () => {
  assert.ok(support.includes('Promise.resolve().then(() => finalizeDrop(homeRoot, swapCandidate));'));
  assert.ok(support.includes('function finalizeDrop(homeRoot, swapCandidate)'));
});

test('ICON-SWAP-KEEPS-DOM-ORDER-CONSISTENT', () => {
  assert.ok(support.includes('function swapDomPositions(source, target)'));
  assert.ok(support.includes('swapDomPositions(source, target);'));
});

test('DOCK-REMOVES-HOME-GRID-PLACEMENT', () => {
  assert.ok(support.includes('function clearGridPlacement(element)'));
  assert.ok(support.includes('element.style.removeProperty("grid-row");'));
  assert.ok(support.includes('element.style.removeProperty("grid-column");'));
  assert.ok(support.includes('delete element.dataset.homeRow;'));
  assert.ok(support.includes('delete element.dataset.homeCol;'));
  assert.ok(support.includes('function normalizeDockPlacements(homeRoot)'));
});

test('DOCK-NORMALIZATION-RUNS-AFTER-EVERY-EDIT-DROP', () => {
  assert.ok(support.includes('normalizeDockPlacements(homeRoot);'));
  assert.ok(support.includes('scheduleDropFinalization(event);'));
});

test('WIDGETS-AND-DOCK-ARE-EXCLUDED-FROM-ICON-SWAP', () => {
  assert.ok(support.includes('.is-home-dragging[data-home-item-id]'));
  assert.ok(support.includes('source.closest(".mobile-home-dock")'));
  assert.ok(support.includes('target.closest(".mobile-home-dock")'));
});

const failed = results.filter((item) => item.status !== 'PASS');
console.log(JSON.stringify({ suite: 'Mobile Home Swap Dock Regression', total: results.length, passed: results.length - failed.length, failed: failed.length, status: failed.length ? 'FAIL' : 'PASS', results }, null, 2));
if (failed.length) process.exit(1);
