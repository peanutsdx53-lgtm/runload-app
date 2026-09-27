import fs from 'node:fs';
import assert from 'node:assert/strict';

const support = fs.readFileSync('ui/mobileHomeEditScroll.js', 'utf8');
const index = fs.readFileSync('index.html', 'utf8');
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

test('DRAG-AUTO-SCROLL-DOES-NOT-FIGHT-DOCK-OR-PAGE-CONTROLS', () => {
  assert.ok(support.includes('.mobile-home-dock, .mobile-home-page-indicator, [data-home-widget-picker]'));
});

test('SUPPORT-IS-MOBILE-ONLY', () => {
  assert.ok(support.includes('(max-width: 54.99rem)'));
  assert.ok(support.includes('mobileLayoutMatches()'));
});

test('SUPPORT-IS-LOADED-AND-PRECACHED', () => {
  assert.ok(index.includes('<script type="module" src="./ui/mobileHomeEditScroll.js"></script>'));
  assert.ok(worker.includes('"./ui/mobileHomeEditScroll.js"'));
});

const failed = results.filter((item) => item.status !== 'PASS');
console.log(JSON.stringify({ suite: 'Mobile Home Edit Vertical Scroll', total: results.length, passed: results.length - failed.length, failed: failed.length, status: failed.length ? 'FAIL' : 'PASS', results }, null, 2));
if (failed.length) process.exit(1);
