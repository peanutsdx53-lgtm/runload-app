from pathlib import Path


def replace_once(path, old, new):
    p = Path(path)
    text = p.read_text(encoding='utf-8')
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{path}: expected one match, found {count}: {old[:100]!r}')
    p.write_text(text.replace(old, new, 1), encoding='utf-8')

home = 'ui/interactions/homeInteractions.js'
css = 'styles/mobile-home-editing.css'
ret = 'ui/mobileHomeReturnTransition.js'
fixed = 'tests/mobileHomeFixedUi.test.mjs'

replace_once(home,
    'const LONG_PRESS_MS = 380;\nconst LAUNCH_ANIMATION_MS = 360;',
    'const LONG_PRESS_MS = 380;\nconst EDIT_DRAG_ARM_MS = 180;\nconst LAUNCH_ANIMATION_MS = 360;')

replace_once(home,
'''  function cancelPageAnimation() {
    if (pageAnimationFrame) cancelAnimationFrame(pageAnimationFrame);
    pageAnimationFrame = null;
    root.classList.remove("is-home-page-transitioning");
  }
''',
'''  function clearPageMotionVisuals() {
    pageElements(root).forEach((page) => {
      page.style.removeProperty("transform");
      page.style.removeProperty("opacity");
    });
  }

  function updatePageMotionVisuals() {
    const width = Math.max(1, viewport.clientWidth);
    const progress = viewport.scrollLeft / width;
    pageElements(root).forEach((page, index) => {
      const distance = Math.min(1, Math.abs(index - progress));
      page.style.transform = `scale(${(1 - distance * 0.018).toFixed(4)})`;
      page.style.opacity = String((1 - distance * 0.14).toFixed(3));
    });
  }

  function cancelPageAnimation() {
    if (pageAnimationFrame) cancelAnimationFrame(pageAnimationFrame);
    pageAnimationFrame = null;
    root.classList.remove("is-home-page-transitioning");
    clearPageMotionVisuals();
  }
''')

replace_once(home,
    '      viewport.scrollLeft = from + distance * eased;\n      if (progress < 1) {',
    '      viewport.scrollLeft = from + distance * eased;\n      updatePageMotionVisuals();\n      if (progress < 1) {')
replace_once(home,
    '      viewport.scrollLeft = left;\n      pageAnimationFrame = null;\n      root.classList.remove("is-home-page-transitioning");',
    '      viewport.scrollLeft = left;\n      pageAnimationFrame = null;\n      root.classList.remove("is-home-page-transitioning");\n      clearPageMotionVisuals();')

replace_once(home,
'''    target.classList.add("is-home-pressing");
    try { target.setPointerCapture(event.pointerId); } catch {}
    if (editing) {
      event.preventDefault();
      armDrag(target, kind);
      return;
    }
    pressTimer = setTimeout(() => armDrag(target, kind), LONG_PRESS_MS);''',
'''    target.classList.add("is-home-pressing");
    if (editing) {
      event.preventDefault();
      pressTimer = setTimeout(() => armDrag(target, kind), EDIT_DRAG_ARM_MS);
      return;
    }
    pressTimer = setTimeout(() => armDrag(target, kind), LONG_PRESS_MS);''')

replace_once(home,
    '  function handleClick(event) {\n    const pageTarget = event.target.closest("[data-home-page-target]");',
    '  function handleClick(event) {\n    const navigationSurface = event.target.closest("[data-home-launch], [data-home-widget-id]");\n    if (navigationSurface && (editing || Date.now() < suppressClickUntil)) {\n      event.preventDefault();\n      event.stopPropagation();\n      return;\n    }\n    const pageTarget = event.target.closest("[data-home-page-target]");')

replace_once(home,
'''  function isPageSwipeBlockedTarget(target) {
    return Boolean(target?.closest?.("button, a, input, textarea, select, [contenteditable=\"true\"], [data-home-item-id], [data-home-widget-id], [data-home-widget-picker]"));
  }
''',
'''  function isPageSwipeBlockedTarget(target) {
    return Boolean(target?.closest?.("button, input, textarea, select, [contenteditable=\"true\"], [data-home-widget-picker]"));
  }
''')

replace_once(home,
'''  function handlePagePointerMove(event) {
    if (event.pointerId !== pageSwipePointerId) return;
    const dx = event.clientX - pageSwipeStartX;
    const dy = event.clientY - pageSwipeStartY;
    const absX = Math.abs(dx);
    const absY = Math.abs(dy);
    if (!pageSwipeHorizontal) {
      if (absX < 8 && absY < 8) return;
      if (absY > absX) {
        resetPageSwipe();
        return;
      }
      pageSwipeHorizontal = true;
      root.classList.add("is-home-page-swiping");
      suppressClickUntil = Date.now() + 500;
    }
    event.preventDefault();
    const width = Math.max(1, viewport.clientWidth);
    const maxLeft = Math.max(0, (pageElements(root).length - 1) * width);
    viewport.scrollLeft = Math.max(0, Math.min(maxLeft, pageSwipeStartLeft - dx));
  }
''',
'''  function claimPageSwipe() {
    cancelPressTimer();
    clearPressState();
    dragArmed = false;
    if (pointerId === pageSwipePointerId) {
      pointerId = null;
      pressTarget = null;
      pressKind = "";
      pressMoved = true;
    }
    suppressClickUntil = Date.now() + 700;
  }

  function handlePagePointerMove(event) {
    if (event.pointerId !== pageSwipePointerId) return;
    if (dragging || dragArmed) {
      resetPageSwipe();
      return;
    }
    const dx = event.clientX - pageSwipeStartX;
    const dy = event.clientY - pageSwipeStartY;
    const absX = Math.abs(dx);
    const absY = Math.abs(dy);
    if (!pageSwipeHorizontal) {
      if (absX < 6 && absY < 6) return;
      if (absY > absX * 1.05) {
        resetPageSwipe();
        return;
      }
      if (absX < 8) return;
      pageSwipeHorizontal = true;
      claimPageSwipe();
      root.classList.add("is-home-page-swiping");
    }
    event.preventDefault();
    const width = Math.max(1, viewport.clientWidth);
    const maxLeft = Math.max(0, (pageElements(root).length - 1) * width);
    viewport.scrollLeft = Math.max(0, Math.min(maxLeft, pageSwipeStartLeft - dx));
    updatePageMotionVisuals();
  }
''')

replace_once(home,
    '    const crossed = Math.abs(dx) >= width * 0.16 || velocity >= 0.45;',
    '    const crossed = Math.abs(dx) >= Math.min(56, width * 0.12) || velocity >= 0.28;')
replace_once(home,
    '      suppressClickUntil = Date.now() + 450;',
    '      suppressClickUntil = Date.now() + 700;')

replace_once(css,
'''  .mobile-home-os [data-home-item-id],
  .mobile-home-os [data-home-widget-id] {
    -webkit-touch-callout: none;
    -webkit-user-select: none;
    user-select: none;
    touch-action: none;
  }''',
'''  .mobile-home-os [data-home-item-id],
  .mobile-home-os [data-home-widget-id] {
    -webkit-touch-callout: none;
    -webkit-user-select: none;
    user-select: none;
    touch-action: pan-y;
  }''')
replace_once(css,
'''  .mobile-home-page {
    flex: 0 0 100%;
    min-width: 0;
    scroll-snap-align: start;
    scroll-snap-stop: always;
  }''',
'''  .mobile-home-page {
    flex: 0 0 100%;
    min-width: 0;
    scroll-snap-align: start;
    scroll-snap-stop: always;
    transform-origin: center center;
    will-change: transform, opacity;
  }''')

replace_once(ret,
'''  animateOnce(indicator, [
    { transform: "translateX(-50%) translateY(7px)", opacity: .35 },
    { transform: "translateX(-50%) translateY(0)", opacity: 1 },
  ], {''',
'''  animateOnce(indicator, [
    { opacity: .35 },
    { opacity: 1 },
  ], {''')

replace_once(fixed,
'''test('HOME-RETURN-KEEPS-PAGE-INDICATOR-CENTERED-DURING-ANIMATION', () => {
  const source = read('ui/mobileHomeReturnTransition.js');
  assert.ok(source.includes('translateX(-50%) translateY(7px)'));
  assert.ok(source.includes('translateX(-50%) translateY(0)'));
});''',
'''test('HOME-RETURN-KEEPS-PAGE-INDICATOR-FIXED-DURING-ANIMATION', () => {
  const source = read('ui/mobileHomeReturnTransition.js');
  const block = source.slice(source.indexOf('const indicator ='), source.indexOf('const target ='));
  assert.ok(block.includes('{ opacity: .35 }'));
  assert.equal(block.includes('transform:'), false);
});''')

Path('tests/mobileHomePageGestureV2.test.mjs').write_text(r'''import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const source = read('ui/interactions/homeInteractions.js');
const css = read('styles/mobile-home-editing.css');
const ret = read('ui/mobileHomeReturnTransition.js');
const results = [];
function test(id, fn) { try { fn(); results.push({ id, status: 'PASS' }); } catch (error) { results.push({ id, status: 'FAIL', message: error?.stack || String(error) }); } }

test('SWIPE-CAN-START-ON-APP-OR-WIDGET-SURFACE', () => {
  const block = source.slice(source.indexOf('function isPageSwipeBlockedTarget'), source.indexOf('function resetPageSwipe'));
  assert.equal(block.includes('[data-home-item-id]'), false);
  assert.equal(block.includes('[data-home-widget-id]'), false);
});

test('EDIT-MODE-USES-SHORT-HOLD-BEFORE-DRAG', () => {
  assert.ok(source.includes('const EDIT_DRAG_ARM_MS = 180;'));
  assert.ok(source.includes('pressTimer = setTimeout(() => armDrag(target, kind), EDIT_DRAG_ARM_MS);'));
  const block = source.slice(source.indexOf('function handlePointerDown'), source.indexOf('function handlePointerMove'));
  assert.equal(block.includes('target.setPointerCapture(event.pointerId)'), false);
});

test('PAGE-SWIPE-WINS-BEFORE-DRAG-AND-BLOCKS-NAVIGATION', () => {
  assert.ok(source.includes('function claimPageSwipe()'));
  assert.ok(source.includes('navigationSurface && (editing || Date.now() < suppressClickUntil)'));
  assert.ok(source.includes('suppressClickUntil = Date.now() + 700;'));
});

test('PAGE-SWIPE-IS-RESPONSIVE-AND-FINGER-TRACKED', () => {
  assert.ok(source.includes('Math.min(56, width * 0.12)'));
  assert.ok(source.includes('velocity >= 0.28'));
  assert.ok(source.includes('pageSwipeStartLeft - dx'));
  assert.ok(source.includes('function updatePageMotionVisuals()'));
  assert.ok(source.includes('const duration = 280;'));
});

test('NORMAL-ITEM-TOUCH-ALLOWS-VERTICAL-PAN', () => {
  const block = css.slice(css.indexOf('.mobile-home-os [data-home-item-id]'), css.indexOf('.mobile-home-os.is-home-drag-active'));
  assert.ok(block.includes('touch-action: pan-y;'));
  assert.ok(css.includes('.mobile-home-os.is-home-editing [data-home-item-id]'));
  assert.ok(css.includes('touch-action: none;'));
});

test('PAGE-MOTION-HAS-SUBTLE-SEAMLESS-VISUAL', () => {
  assert.ok(css.includes('will-change: transform, opacity;'));
  assert.ok(source.includes('page.style.transform = `scale('));
  assert.ok(source.includes('page.style.opacity = String('));
});

test('RETURN-INDICATOR-NEVER-CHANGES-POSITION', () => {
  const block = ret.slice(ret.indexOf('const indicator ='), ret.indexOf('const target ='));
  assert.equal(block.includes('transform:'), false);
  assert.ok(block.includes('{ opacity: .35 }'));
});

const failed = results.filter((item) => item.status === 'FAIL');
console.log(JSON.stringify({ suite: 'Mobile Home Page Gesture V2', total: results.length, passed: results.length - failed.length, failed: failed.length, status: failed.length ? 'FAIL' : 'PASS', results }, null, 2));
if (failed.length) process.exitCode = 1;
''', encoding='utf-8')
