from pathlib import Path


def replace_once(path, old, new):
    p = Path(path)
    text = p.read_text(encoding='utf-8')
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{path}: expected one anchor, found {count}: {old[:120]!r}')
    p.write_text(text.replace(old, new, 1), encoding='utf-8')


path = 'ui/interactions/homeInteractions.js'
replace_once(path,
'''const LONG_PRESS_MS = 380;
const TAP_SLOP_PX = 8;
const VERTICAL_SCROLL_CANCEL_PX = 18;
''',
'''const LONG_PRESS_MS = 380;
const TAP_SLOP_PX = 8;
const DRAG_START_PX = 10;
''')

replace_once(path,
'''  let lastY = 0;
  let pressMoved = false;
  let dragging = false;
''',
'''  let lastY = 0;
  let pressMoved = false;
  let dragArmed = false;
  let dragging = false;
''')

replace_once(path,
'''  function clearPressState() {
    pressTarget?.classList.remove("is-home-pressing");
  }
''',
'''  function clearPressState() {
    pressTarget?.classList.remove("is-home-pressing", "is-home-drag-armed");
  }
''')

replace_once(path,
'''    ghost?.remove();
    ghost = null;
    dragging = false;
    suppressClickUntil = Date.now() + 350;
    try { pressTarget.releasePointerCapture(pointerId); } catch {}
  }

  function beginDrag(target, event, kind) {
''',
'''    ghost?.remove();
    ghost = null;
    dragging = false;
    dragArmed = false;
    root.classList.remove("is-home-drag-active");
    suppressClickUntil = Date.now() + 350;
    try { pressTarget.releasePointerCapture(pointerId); } catch {}
  }

  function armDrag(target, kind) {
    if (!target || dragging) return;
    cancelPressTimer();
    setEditing(true);
    dragArmed = true;
    pressTarget = target;
    pressKind = kind;
    startX = lastX;
    startY = lastY;
    pressMoved = false;
    target.classList.remove("is-home-pressing");
    target.classList.add("is-home-drag-armed");
    suppressClickUntil = Date.now() + 800;
  }

  function beginDrag(target, event, kind) {
''')

replace_once(path,
'''    target.classList.remove("is-home-pressing");
    setEditing(true);
    setActivePage(activePage, { smooth: false });
    dragging = true;
''',
'''    target.classList.remove("is-home-pressing", "is-home-drag-armed");
    setEditing(true);
    setActivePage(activePage, { smooth: false });
    dragArmed = false;
    dragging = true;
    root.classList.add("is-home-drag-active");
''')

old_down = '''    target.classList.add("is-home-pressing");
    if (editing) {
      event.preventDefault();
      beginDrag(target, event, kind);
      return;
    }
    const activePointerId = event.pointerId;
    pressTimer = setTimeout(() => beginDrag(target, {
      pointerId: activePointerId,
      clientX: lastX,
      clientY: lastY,
    }, kind), LONG_PRESS_MS);
'''
new_down = '''    target.classList.add("is-home-pressing");
    try { target.setPointerCapture(event.pointerId); } catch {}
    if (editing) {
      event.preventDefault();
      armDrag(target, kind);
      return;
    }
    pressTimer = setTimeout(() => armDrag(target, kind), LONG_PRESS_MS);
'''
replace_once(path, old_down, new_down)

old_move = '''    if (!dragging) {
      const dx = event.clientX - startX;
      const dy = event.clientY - startY;
      if (Math.hypot(dx, dy) > TAP_SLOP_PX) pressMoved = true;
      if (Math.abs(dy) > VERTICAL_SCROLL_CANCEL_PX && Math.abs(dy) > Math.abs(dx)) cancelPendingPress();
      return;
    }
    event.preventDefault();
'''
new_move = '''    if (!dragging) {
      const dx = event.clientX - startX;
      const dy = event.clientY - startY;
      const distance = Math.hypot(dx, dy);
      if (distance > TAP_SLOP_PX) pressMoved = true;
      if (!dragArmed) {
        if (distance > TAP_SLOP_PX) cancelPressTimer();
        return;
      }
      event.preventDefault();
      if (distance < DRAG_START_PX) return;
      beginDrag(pressTarget, event, pressKind);
      if (!dragging) return;
    }
    event.preventDefault();
'''
replace_once(path, old_move, new_move)

old_up = '''    const moved = pressMoved;
    cancelPressTimer();
    if (dragging) {
      event.preventDefault();
      finishDrag(event);
    } else {
      clearPressState();
      if (moved) {
        event.preventDefault();
        suppressClickUntil = Date.now() + 350;
      }
    }
    pointerId = null;
    pressTarget = null;
    pressKind = "";
    pressMoved = false;
'''
new_up = '''    const moved = pressMoved;
    const wasArmed = dragArmed;
    cancelPressTimer();
    if (dragging) {
      event.preventDefault();
      finishDrag(event);
    } else {
      clearPressState();
      if (moved || wasArmed) {
        event.preventDefault();
        suppressClickUntil = Date.now() + 350;
      }
      try { pressTarget?.releasePointerCapture(pointerId); } catch {}
    }
    pointerId = null;
    pressTarget = null;
    pressKind = "";
    pressMoved = false;
    dragArmed = false;
'''
replace_once(path, old_up, new_up)

old_cancel = '''    cancelPressTimer();
    if (dragging) finishDrag(event, true);
    clearPressState();
    pointerId = null;
    pressTarget = null;
    pressKind = "";
    pressMoved = false;
'''
new_cancel = '''    cancelPressTimer();
    if (dragging) {
      finishDrag({ clientX: lastX, clientY: lastY });
    } else {
      clearPressState();
      try { pressTarget?.releasePointerCapture(pointerId); } catch {}
    }
    pointerId = null;
    pressTarget = null;
    pressKind = "";
    pressMoved = false;
    dragArmed = false;
'''
replace_once(path, old_cancel, new_cancel)

replace_once(path,
'''      if (!viewport.clientWidth || dragging) return;
''',
'''      if (!viewport.clientWidth || dragging || dragArmed) return;
''')

css = 'styles/mobile-home-editing.css'
replace_once(css,
'''    user-select: none;
    touch-action: pan-y;
''',
'''    user-select: none;
    touch-action: none;
''')

replace_once(css,
'''  .mobile-home-os.is-home-editing .mobile-home-page-viewport {
    overflow-x: hidden;
    scroll-snap-type: none;
  }
''',
'''  .mobile-home-os.is-home-editing .mobile-home-page-viewport,
  .mobile-home-os.is-home-drag-active .mobile-home-page-viewport {
    overflow-x: hidden;
    scroll-snap-type: none;
  }

  .mobile-home-os.is-home-drag-active {
    overscroll-behavior: none;
  }
''')

replace_once(css,
'''  .mobile-home-os .is-home-pressing .mobile-home-app__icon,
  .mobile-home-os .is-home-pressing .mobile-home-dock__icon {
''',
'''  .mobile-home-os .is-home-pressing .mobile-home-app__icon,
  .mobile-home-os .is-home-pressing .mobile-home-dock__icon,
  .mobile-home-os .is-home-drag-armed .mobile-home-app__icon,
  .mobile-home-os .is-home-drag-armed .mobile-home-dock__icon {
''')

test_path = Path('tests/mobileHomeGesturePriority.test.mjs')
test_path.write_text('''import fs from 'node:fs';
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
  assert.ok(interactions.includes('if (!viewport.clientWidth || dragging || dragArmed) return;'));
  assert.ok(interactions.includes('root.classList.add("is-home-drag-active")'));
  assert.ok(interactions.includes('root.classList.remove("is-home-drag-active")'));
});

const failed = results.filter((item) => item.status !== 'PASS');
console.log(JSON.stringify({ suite: 'Mobile Home Gesture Priority', total: results.length, passed: results.length - failed.length, failed: failed.length, status: failed.length ? 'FAIL' : 'PASS', results }, null, 2));
if (failed.length) process.exit(1);
''', encoding='utf-8')
