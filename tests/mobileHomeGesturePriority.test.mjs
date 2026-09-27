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

await test('HOME-ITEM-TOUCH-IS-RESERVED-FOR-TAP-OR-DRAG', () => {
  assert.ok(css.includes('touch-action: none;'));
  assert.ok(css.includes('.mobile-home-os.is-home-drag-active .mobile-home-page-viewport'));
  assert.ok(css.includes('overflow-x: hidden;'));
  assert.ok(css.includes('scroll-snap-type: none;'));
});

await test('HOME-LONG-PRESS-ARMS-BEFORE-MOVING-THE-ICON', () => {
  assert.ok(interactions.includes('const DRAG_START_PX = 10;'));
  assert.ok(interactions.includes('let dragArmed = false;'));
  assert.ok(interactions.includes('function armDrag(target, kind)'));
  assert.ok(interactions.includes('if (distance < DRAG_START_PX) return;'));
  assert.ok(interactions.includes('beginDrag(pressTarget, event, pressKind);'));
  assert.ok(!interactions.includes('setTimeout(() => beginDrag'));
});

await test('HOME-POINTER-STREAM-IS-CAPTURED-FROM-TOUCH-DOWN', () => {
  assert.ok(interactions.includes('target.setPointerCapture(event.pointerId)'));
  assert.ok(interactions.includes('pressTarget?.releasePointerCapture(pointerId)'));
});

await test('HOME-POINTER-CANCEL-COMMITS-LAST-VALID-DRAG-POSITION', () => {
  assert.ok(interactions.includes('finishDrag({ clientX: lastX, clientY: lastY });'));
  assert.ok(!interactions.includes('if (dragging) finishDrag(event, true);'));
});

await test('HOME-MOVE-INTENT-CANNOT-FALL-THROUGH-TO-APP-LAUNCH', () => {
  assert.ok(interactions.includes('const wasArmed = dragArmed;'));
  assert.ok(interactions.includes('if (moved || wasArmed)'));
  assert.ok(interactions.includes('suppressClickUntil = Date.now() + 350;'));
});

await test('HOME-PAGE-SCROLL-STATE-DOES-NOT-UPDATE-WHILE-ARMED-OR-DRAGGING', () => {
  assert.ok(interactions.includes('if (!viewport.clientWidth || dragging || dragArmed || pageSwipePointerId != null || pageAnimationFrame) return;'));
  assert.ok(interactions.includes('root.classList.add("is-home-drag-active")'));
  assert.ok(interactions.includes('root.classList.remove("is-home-drag-active")'));
});

const failed = results.filter((item) => item.status !== 'PASS');
console.log(JSON.stringify({ suite: 'Mobile Home Gesture Priority', total: results.length, passed: results.length - failed.length, failed: failed.length, status: failed.length ? 'FAIL' : 'PASS', results }, null, 2));
if (failed.length) process.exit(1);
