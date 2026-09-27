from pathlib import Path

path = Path('tests/mobileHomeGesturePriority.test.mjs')
text = path.read_text(encoding='utf-8')
old = '''await test('HOME-ITEM-TOUCH-IS-RESERVED-FOR-TAP-OR-DRAG', () => {
  assert.ok(css.includes('touch-action: none;'));
  assert.ok(css.includes('.mobile-home-os.is-home-drag-active .mobile-home-page-viewport'));
  assert.ok(css.includes('overflow-x: hidden;'));
  assert.ok(css.includes('scroll-snap-type: none;'));
});'''
new = '''await test('HOME-ITEM-TOUCH-USES-NATIVE-PAGING-UNTIL-EDIT-DRAG', () => {
  assert.ok(css.includes('scroll-snap-type: x mandatory;'));
  assert.ok(css.includes('touch-action: pan-x pan-y;'));
  assert.ok(css.includes('.mobile-home-os.is-home-editing [data-home-item-id]'));
  assert.ok(css.includes('touch-action: none;'));
  assert.ok(css.includes('.mobile-home-os.is-home-drag-active .mobile-home-page-viewport'));
  assert.ok(css.includes('overflow-x: hidden;'));
});'''
if text.count(old) != 1:
    raise SystemExit(f'gesture priority test anchor mismatch: {text.count(old)}')
path.write_text(text.replace(old, new, 1), encoding='utf-8')
