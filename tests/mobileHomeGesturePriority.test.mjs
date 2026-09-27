import fs from 'node:fs';
import assert from 'node:assert/strict';

const interactions = fs.readFileSync('ui/interactions/homeInteractions.js', 'utf8');
const css = fs.readFileSync('styles/mobile-home-editing.css', 'utf8');

const results = [];
async function test(id, fn) {
  try {
    await fn();
    results.push({ id, status: 'PASS' });
  } catch (error) {
    results.push({ id, status: 'FAIL', message: String(error?.stack || error) });
  }
}

await test('HOME-EDITABLE-SURFACES-RESERVE-HORIZONTAL-GESTURES-FOR-DRAG', () => {
  assert.ok(css.includes('touch-action: pan-y;'));
  assert.ok(css.includes('.mobile-home-os.is-home-editing .mobile-home-page-viewport'));
  assert.ok(css.includes('overflow-x: hidden;'));
  assert.ok(css.includes('scroll-snap-type: none;'));
});

await test('HOME-PENDING-LONG-PRESS-TOLERATES-HORIZONTAL-DRIFT', () => {
  assert.ok(interactions.includes('const TAP_SLOP_PX = 8;'));
  assert.ok(interactions.includes('const VERTICAL_SCROLL_CANCEL_PX = 18;'));
  assert.ok(interactions.includes('Math.abs(dy) > VERTICAL_SCROLL_CANCEL_PX && Math.abs(dy) > Math.abs(dx)'));
  assert.ok(!interactions.includes('Math.hypot(event.clientX - startX, event.clientY - startY) > MOVE_CANCEL_PX'));
});

await test('HOME-MOVE-INTENT-CANNOT-FALL-THROUGH-TO-APP-LAUNCH', () => {
  assert.ok(interactions.includes('let pressMoved = false;'));
  assert.ok(interactions.includes('if (Math.hypot(dx, dy) > TAP_SLOP_PX) pressMoved = true;'));
  assert.ok(interactions.includes('if (moved) {'));
  assert.ok(interactions.includes('suppressClickUntil = Date.now() + 350;'));
});

await test('HOME-LONG-PRESS-DRAG-STARTS-AT-CURRENT-FINGER-POSITION', () => {
  assert.ok(interactions.includes('clientX: lastX'));
  assert.ok(interactions.includes('clientY: lastY'));
  assert.ok(interactions.includes('setActivePage(activePage, { smooth: false });'));
});

const failed = results.filter((item) => item.status !== 'PASS');
console.log(JSON.stringify({ suite: 'Mobile Home Gesture Priority', total: results.length, passed: results.length - failed.length, failed: failed.length, status: failed.length ? 'FAIL' : 'PASS', results }, null, 2));
if (failed.length) process.exit(1);
