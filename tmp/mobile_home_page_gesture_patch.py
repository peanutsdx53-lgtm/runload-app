from pathlib import Path
import re


def sub_one(path, pattern, replacement, flags=0):
    p = Path(path)
    text = p.read_text(encoding="utf-8")
    out, count = re.subn(pattern, replacement, text, count=1, flags=flags)
    if count != 1:
        raise SystemExit(f"{path}: expected one regex match, found {count}: {pattern[:80]}")
    p.write_text(out, encoding="utf-8")


def replace_one(path, old, new):
    p = Path(path)
    text = p.read_text(encoding="utf-8")
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{path}: expected one exact match, found {count}")
    p.write_text(text.replace(old, new, 1), encoding="utf-8")


sub_one(
    "ui/mobileHomeReturnTransition.js",
    r'  const dock = document\.querySelector\("\.mobile-home-dock"\);\n  const indicator = document\.querySelector\("\.mobile-home-page-indicator"\);\n  \[dock, indicator\]\.forEach\(\(element\) => \{.*?\n  \}\);\n\n  const target =',
    '''  const dock = document.querySelector(".mobile-home-dock");
  animateOnce(dock, [
    { transform: "translateY(9px)", opacity: .35 },
    { transform: "translateY(0)", opacity: 1 },
  ], {
    duration: 250,
    delay: 35,
    easing: RETURN_EASING,
  });

  const indicator = document.querySelector(".mobile-home-page-indicator");
  animateOnce(indicator, [
    { transform: "translateX(-50%) translateY(7px)", opacity: .35 },
    { transform: "translateX(-50%) translateY(0)", opacity: 1 },
  ], {
    duration: 250,
    delay: 35,
    easing: RETURN_EASING,
  });

  const target =''',
    re.S,
)

sub_one(
    "styles/mobile-home-editing.css",
    r'  \.mobile-home-page-viewport \{\n.*?\n  \}',
    '''  .mobile-home-page-viewport {
    width: 100%;
    margin-bottom: 40px;
    overflow-x: auto;
    overflow-y: hidden;
    scroll-snap-type: none;
    overscroll-behavior-x: none;
    touch-action: pan-y;
    scrollbar-width: none;
    -webkit-overflow-scrolling: auto;
    transition: height 160ms ease;
  }''',
    re.S,
)
sub_one(
    "styles/mobile-home-editing.css",
    r'  \.mobile-home-os\.is-home-editing \.mobile-home-page-viewport,\n  \.mobile-home-os\.is-home-drag-active \.mobile-home-page-viewport \{\n    overflow-x: hidden;\n    scroll-snap-type: none;\n  \}',
    '''  .mobile-home-os.is-home-drag-active .mobile-home-page-viewport {
    overflow-x: hidden;
  }''',
)

replace_one(
    "ui/interactions/homeInteractions.js",
    "  let scrollFrame = null;\n",
    "  let scrollFrame = null;\n  let pageAnimationFrame = null;\n  let pageSwipePointerId = null;\n  let pageSwipeStartX = 0;\n  let pageSwipeStartY = 0;\n  let pageSwipeStartLeft = 0;\n  let pageSwipeStartTime = 0;\n  let pageSwipeHorizontal = false;\n",
)

sub_one(
    "ui/interactions/homeInteractions.js",
    r'  function setActivePage\(index, \{ smooth = true, persist = false \} = \{\}\) \{.*?\n  \}\n\n  function addPage\(\) \{',
    '''  function cancelPageAnimation() {
    if (pageAnimationFrame) cancelAnimationFrame(pageAnimationFrame);
    pageAnimationFrame = null;
    root.classList.remove("is-home-page-transitioning");
  }

  function animatePageViewport(left) {
    cancelPageAnimation();
    const from = viewport.scrollLeft;
    const distance = left - from;
    const reduceMotion = globalThis.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
    if (reduceMotion || Math.abs(distance) < 1) {
      viewport.scrollLeft = left;
      return;
    }
    const startedAt = globalThis.performance?.now?.() ?? Date.now();
    const duration = 280;
    root.classList.add("is-home-page-transitioning");
    const step = (now) => {
      const progress = Math.min(1, Math.max(0, now - startedAt) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      viewport.scrollLeft = from + distance * eased;
      if (progress < 1) {
        pageAnimationFrame = requestAnimationFrame(step);
        return;
      }
      viewport.scrollLeft = left;
      pageAnimationFrame = null;
      root.classList.remove("is-home-page-transitioning");
    };
    pageAnimationFrame = requestAnimationFrame(step);
  }

  function setActivePage(index, { smooth = true, persist = false } = {}) {
    const pages = pageElements(root);
    if (!pages.length) return;
    activePage = Math.max(0, Math.min(pages.length - 1, Number(index) || 0));
    const left = activePage * viewport.clientWidth;
    if (smooth) animatePageViewport(left);
    else {
      cancelPageAnimation();
      viewport.scrollLeft = left;
    }
    if (dragging) clearDropPreview();
    updatePageIndicator();
    updateViewportHeight();
    if (persist) writeLayout(root, dockContainer, activePage);
  }

  function addPage() {''',
    re.S,
)

replace_one(
    "ui/interactions/homeInteractions.js",
    '  function openHomeLauncher(launcher) {\n    const href = String(launcher?.dataset?.homeHref || "");\n',
    '  function openHomeLauncher(launcher) {\n    if (editing) return;\n    const href = String(launcher?.dataset?.homeHref || "");\n',
)

handlers = '''  function isPageSwipeBlockedTarget(target) {
    return Boolean(target?.closest?.("button, a, input, textarea, select, [contenteditable=\\"true\\"], [data-home-item-id], [data-home-widget-id], [data-home-widget-picker]"));
  }

  function resetPageSwipe() {
    if (pageSwipePointerId != null) {
      try { viewport.releasePointerCapture(pageSwipePointerId); } catch {}
    }
    pageSwipePointerId = null;
    pageSwipeHorizontal = false;
    root.classList.remove("is-home-page-swiping");
  }

  function handlePagePointerDown(event) {
    if (pageSwipePointerId != null || dragging || dragArmed) return;
    if (event.pointerType === "mouse" && event.button !== 0) return;
    if (isPageSwipeBlockedTarget(event.target)) return;
    if (pageElements(root).length < 2) return;
    cancelPageAnimation();
    pageSwipePointerId = event.pointerId;
    pageSwipeStartX = event.clientX;
    pageSwipeStartY = event.clientY;
    pageSwipeStartLeft = viewport.scrollLeft;
    pageSwipeStartTime = globalThis.performance?.now?.() ?? Date.now();
    pageSwipeHorizontal = false;
    try { viewport.setPointerCapture(event.pointerId); } catch {}
  }

  function handlePagePointerMove(event) {
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

  function finishPageSwipe(event, cancelled = false) {
    if (event.pointerId !== pageSwipePointerId) return;
    const dx = event.clientX - pageSwipeStartX;
    const elapsed = Math.max(1, (globalThis.performance?.now?.() ?? Date.now()) - pageSwipeStartTime);
    const velocity = Math.abs(dx) / elapsed;
    const width = Math.max(1, viewport.clientWidth);
    const crossed = Math.abs(dx) >= width * 0.16 || velocity >= 0.45;
    let target = activePage;
    if (!cancelled && pageSwipeHorizontal && crossed) target += dx < 0 ? 1 : -1;
    else if (pageSwipeHorizontal) target = Math.round(viewport.scrollLeft / width);
    target = Math.max(0, Math.min(pageElements(root).length - 1, target));
    if (pageSwipeHorizontal) {
      event.preventDefault();
      suppressClickUntil = Date.now() + 450;
    }
    resetPageSwipe();
    setActivePage(target, { smooth: true, persist: true });
  }

  function handlePagePointerUp(event) {
    finishPageSwipe(event, false);
  }

  function handlePagePointerCancel(event) {
    finishPageSwipe(event, true);
  }

'''
replace_one("ui/interactions/homeInteractions.js", "  function handlePageScroll() {\n", handlers + "  function handlePageScroll() {\n")
replace_one(
    "ui/interactions/homeInteractions.js",
    "      if (!viewport.clientWidth || dragging || dragArmed) return;\n",
    "      if (!viewport.clientWidth || dragging || dragArmed || pageSwipePointerId != null || pageAnimationFrame) return;\n",
)
replace_one(
    "ui/interactions/homeInteractions.js",
    '  viewport.addEventListener("scroll", handlePageScroll, { passive: true });\n',
    '  viewport.addEventListener("pointerdown", handlePagePointerDown);\n  viewport.addEventListener("pointermove", handlePagePointerMove, { passive: false });\n  viewport.addEventListener("pointerup", handlePagePointerUp);\n  viewport.addEventListener("pointercancel", handlePagePointerCancel);\n  viewport.addEventListener("scroll", handlePageScroll, { passive: true });\n',
)
replace_one(
    "ui/interactions/homeInteractions.js",
    '    if (scrollFrame) cancelAnimationFrame(scrollFrame);\n    if (launchTimer) clearTimeout(launchTimer);\n    viewport.removeEventListener("scroll", handlePageScroll);\n',
    '    if (scrollFrame) cancelAnimationFrame(scrollFrame);\n    cancelPageAnimation();\n    resetPageSwipe();\n    if (launchTimer) clearTimeout(launchTimer);\n    viewport.removeEventListener("pointerdown", handlePagePointerDown);\n    viewport.removeEventListener("pointermove", handlePagePointerMove);\n    viewport.removeEventListener("pointerup", handlePagePointerUp);\n    viewport.removeEventListener("pointercancel", handlePagePointerCancel);\n    viewport.removeEventListener("scroll", handlePageScroll);\n',
)

replace_one(
    "tests/mobileHomeFixedUi.test.mjs",
    "test('HOME-RETURN-PAINTS-SNAPSHOT-BEFORE-NAVIGATION', () => {\n",
    "test('HOME-RETURN-KEEPS-PAGE-INDICATOR-CENTERED-DURING-ANIMATION', () => {\n  const source = read('ui/mobileHomeReturnTransition.js');\n  assert.ok(source.includes('translateX(-50%) translateY(7px)'));\n  assert.ok(source.includes('translateX(-50%) translateY(0)'));\n});\n\ntest('HOME-RETURN-PAINTS-SNAPSHOT-BEFORE-NAVIGATION', () => {\n",
)
replace_one(
    "tests/mobileHomeGesturePriority.test.mjs",
    "  assert.ok(interactions.includes('if (!viewport.clientWidth || dragging || dragArmed) return;'));\n",
    "  assert.ok(interactions.includes('if (!viewport.clientWidth || dragging || dragArmed || pageSwipePointerId != null || pageAnimationFrame) return;'));\n",
)

Path("tests/mobileHomePageGesture.test.mjs").write_text('''import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const results = [];
function test(id, fn) { try { fn(); results.push({ id, status: 'PASS' }); } catch (error) { results.push({ id, status: 'FAIL', message: error?.stack || String(error) }); } }
test('HOME-PAGER-RESERVES-HORIZONTAL-GESTURE-FROM-BROWSER-HISTORY', () => { const css = read('styles/mobile-home-editing.css'); assert.ok(css.includes('touch-action: pan-y;')); assert.ok(css.includes('overscroll-behavior-x: none;')); assert.ok(css.includes('scroll-snap-type: none;')); });
test('HOME-PAGER-USES-POINTER-CAPTURED-IN-APP-SWIPE', () => { const source = read('ui/interactions/homeInteractions.js'); for (const name of ['handlePagePointerDown', 'handlePagePointerMove', 'handlePagePointerUp', 'handlePagePointerCancel']) assert.ok(source.includes(name)); assert.ok(source.includes('viewport.setPointerCapture(event.pointerId)')); assert.ok(source.includes('pageSwipeStartLeft - dx')); });
test('HOME-PAGER-FOLLOWS-FINGER-THEN-EASES-TO-PAGE', () => { const source = read('ui/interactions/homeInteractions.js'); assert.ok(source.includes('function animatePageViewport(left)')); assert.ok(source.includes('const duration = 280;')); assert.ok(source.includes('1 - Math.pow(1 - progress, 3)')); assert.ok(source.includes('setActivePage(target, { smooth: true, persist: true })')); });
test('HOME-EDIT-MODE-CANNOT-LAUNCH-APP', () => { const source = read('ui/interactions/homeInteractions.js'); const start = source.indexOf('function openHomeLauncher(launcher)'); assert.ok(start >= 0); assert.ok(source.slice(start, start + 240).includes('if (editing) return;')); assert.ok(source.includes('if (editing || Date.now() < suppressClickUntil) return;')); });
test('HOME-PAGER-DOES-NOT-CHANGE-ACTIVE-PAGE-MID-SWIPE-OR-ANIMATION', () => { const source = read('ui/interactions/homeInteractions.js'); assert.ok(source.includes('pageSwipePointerId != null || pageAnimationFrame')); });
const failed = results.filter((item) => item.status === 'FAIL');
console.log(JSON.stringify({ suite: 'Mobile Home Page Gesture', total: results.length, passed: results.length - failed.length, failed: failed.length, status: failed.length ? 'FAIL' : 'PASS', results }, null, 2));
if (failed.length) process.exitCode = 1;
''', encoding="utf-8")
