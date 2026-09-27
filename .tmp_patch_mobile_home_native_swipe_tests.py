from pathlib import Path


def replace_once(path, old, new):
    target = Path(path)
    text = target.read_text(encoding='utf-8')
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{path}: expected 1 test anchor, found {count}')
    target.write_text(text.replace(old, new, 1), encoding='utf-8')

replace_once(
    'tests/mobileHomeGesturePriority.test.mjs',
    '''await test('HOME-ITEM-TOUCH-IS-RESERVED-FOR-TAP-OR-DRAG', () => {
  assert.ok(css.includes('touch-action: none;'));
  assert.ok(css.includes('.mobile-home-os.is-home-drag-active .mobile-home-page-viewport'));
  assert.ok(css.includes('overflow-x: hidden;'));
  assert.ok(css.includes('scroll-snap-type: none;'));
});''',
    '''await test('HOME-ITEM-TOUCH-USES-NATIVE-PAGING-UNTIL-EDIT-DRAG', () => {
  assert.ok(css.includes('scroll-snap-type: x mandatory;'));
  assert.ok(css.includes('touch-action: pan-x pan-y;'));
  assert.ok(css.includes('.mobile-home-os.is-home-editing [data-home-item-id]'));
  assert.ok(css.includes('touch-action: none;'));
  assert.ok(css.includes('.mobile-home-os.is-home-drag-active .mobile-home-page-viewport'));
  assert.ok(css.includes('overflow-x: hidden;'));
});'''
)

replace_once(
    'tests/mobileHomePageGesture.test.mjs',
    "test('HOME-PAGER-RESERVES-HORIZONTAL-GESTURE-FROM-BROWSER-HISTORY', () => { const css = read('styles/mobile-home-editing.css'); assert.ok(css.includes('touch-action: pan-y;')); assert.ok(css.includes('overscroll-behavior-x: none;')); assert.ok(css.includes('scroll-snap-type: none;')); });",
    "test('HOME-PAGER-USES-NATIVE-SCROLL-SNAP-IN-NORMAL-MODE', () => { const css = read('styles/mobile-home-editing.css'); assert.ok(css.includes('touch-action: pan-x pan-y;')); assert.ok(css.includes('overscroll-behavior-x: none;')); assert.ok(css.includes('scroll-snap-type: x mandatory;')); assert.ok(css.includes('-webkit-overflow-scrolling: touch;')); });"
)

replace_once(
    'tests/mobileHomePageGesture.test.mjs',
    "test('HOME-PAGER-FOLLOWS-FINGER-THEN-EASES-TO-PAGE', () => { const source = read('ui/interactions/homeInteractions.js'); assert.ok(source.includes('function animatePageViewport(left)')); assert.ok(source.includes('const duration = 280;')); assert.ok(source.includes('1 - Math.pow(1 - progress, 3)')); assert.ok(source.includes('setActivePage(target, { smooth: true, persist: true })')); });",
    "test('HOME-PAGER-NATIVE-SCROLLS-NORMALLY-AND-EDIT-MODE-SNAPS-QUICKLY', () => { const source = read('ui/interactions/homeInteractions.js'); assert.ok(source.includes('function animatePageViewport(left)')); assert.ok(source.includes('const duration = 180;')); assert.ok(source.includes('1 - Math.pow(1 - progress, 3)')); assert.ok(source.includes('if (!editing) return;')); assert.ok(source.includes('setActivePage(target, { smooth: true, persist: true })')); });"
)
