from pathlib import Path


def replace_once(path, old, new):
    p = Path(path)
    text = p.read_text(encoding='utf-8')
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{path}: expected one match, found {count}')
    p.write_text(text.replace(old, new, 1), encoding='utf-8')

home = 'ui/interactions/homeInteractions.js'
test = 'tests/mobileHomePageGestureV2.test.mjs'

replace_once(home,
'''    pageSwipeStartTime = globalThis.performance?.now?.() ?? Date.now();
    pageSwipeHorizontal = false;
    try { viewport.setPointerCapture(event.pointerId); } catch {}
  }''',
'''    pageSwipeStartTime = globalThis.performance?.now?.() ?? Date.now();
    pageSwipeHorizontal = false;
  }''')

replace_once(home,
'''      pageSwipeHorizontal = true;
      claimPageSwipe();
      root.classList.add("is-home-page-swiping");''',
'''      pageSwipeHorizontal = true;
      claimPageSwipe();
      try { viewport.setPointerCapture(event.pointerId); } catch {}
      root.classList.add("is-home-page-swiping");''')

replace_once(test,
'''test('PAGE-SWIPE-WINS-BEFORE-DRAG-AND-BLOCKS-NAVIGATION', () => {
  assert.ok(source.includes('function claimPageSwipe()'));
  assert.ok(source.includes('navigationSurface && (editing || Date.now() < suppressClickUntil)'));
  assert.ok(source.includes('suppressClickUntil = Date.now() + 700;'));
});''',
'''test('PAGE-SWIPE-WINS-BEFORE-DRAG-AND-BLOCKS-NAVIGATION', () => {
  assert.ok(source.includes('function claimPageSwipe()'));
  assert.ok(source.includes('navigationSurface && (editing || Date.now() < suppressClickUntil)'));
  assert.ok(source.includes('suppressClickUntil = Date.now() + 700;'));
  const down = source.slice(source.indexOf('function handlePagePointerDown'), source.indexOf('function claimPageSwipe'));
  const move = source.slice(source.indexOf('function handlePagePointerMove'), source.indexOf('function finishPageSwipe'));
  assert.equal(down.includes('viewport.setPointerCapture'), false);
  assert.ok(move.includes('viewport.setPointerCapture(event.pointerId)'));
});''')
