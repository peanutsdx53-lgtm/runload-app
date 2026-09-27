from pathlib import Path


def replace_once(path, old, new):
    p = Path(path)
    text = p.read_text(encoding='utf-8')
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{path}: expected one anchor, found {count}')
    p.write_text(text.replace(old, new, 1), encoding='utf-8')


replace_once(
    'ui/interactions/homeInteractions.js',
    'const LONG_PRESS_MS = 380;\nconst MOVE_CANCEL_PX = 10;',
    'const LONG_PRESS_MS = 380;\nconst TAP_SLOP_PX = 8;\nconst VERTICAL_SCROLL_CANCEL_PX = 18;'
)

replace_once(
    'ui/interactions/homeInteractions.js',
    '  let startX = 0;\n  let startY = 0;\n  let dragging = false;',
    '  let startX = 0;\n  let startY = 0;\n  let lastX = 0;\n  let lastY = 0;\n  let pressMoved = false;\n  let dragging = false;'
)

replace_once(
    'ui/interactions/homeInteractions.js',
    '    setEditing(true);\n    dragging = true;',
    '    setEditing(true);\n    setActivePage(activePage, { smooth: false });\n    dragging = true;'
)

replace_once(
    'ui/interactions/homeInteractions.js',
    '''    startX = event.clientX;
    startY = event.clientY;
    target.classList.add("is-home-pressing");
    if (editing) {
      event.preventDefault();
      beginDrag(target, event, kind);
      return;
    }
    pressTimer = setTimeout(() => beginDrag(target, event, kind), LONG_PRESS_MS);
''',
    '''    startX = event.clientX;
    startY = event.clientY;
    lastX = event.clientX;
    lastY = event.clientY;
    pressMoved = false;
    target.classList.add("is-home-pressing");
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
)

replace_once(
    'ui/interactions/homeInteractions.js',
    '''  function handlePointerMove(event) {
    if (event.pointerId !== pointerId) return;
    if (!dragging) {
      if (Math.hypot(event.clientX - startX, event.clientY - startY) > MOVE_CANCEL_PX) cancelPendingPress();
      return;
    }
''',
    '''  function handlePointerMove(event) {
    if (event.pointerId !== pointerId) return;
    lastX = event.clientX;
    lastY = event.clientY;
    if (!dragging) {
      const dx = event.clientX - startX;
      const dy = event.clientY - startY;
      if (Math.hypot(dx, dy) > TAP_SLOP_PX) pressMoved = true;
      if (Math.abs(dy) > VERTICAL_SCROLL_CANCEL_PX && Math.abs(dy) > Math.abs(dx)) cancelPendingPress();
      return;
    }
'''
)

replace_once(
    'ui/interactions/homeInteractions.js',
    '''  function handlePointerUp(event) {
    if (event.pointerId !== pointerId) return;
    cancelPressTimer();
    if (dragging) {
      event.preventDefault();
      finishDrag(event);
    } else {
      clearPressState();
    }
    pointerId = null;
    pressTarget = null;
    pressKind = "";
  }
''',
    '''  function handlePointerUp(event) {
    if (event.pointerId !== pointerId) return;
    const moved = pressMoved;
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
  }
'''
)

replace_once(
    'ui/interactions/homeInteractions.js',
    '''    clearPressState();
    pointerId = null;
    pressTarget = null;
    pressKind = "";
  }

  function cycleWidgetSize(id) {
''',
    '''    clearPressState();
    pointerId = null;
    pressTarget = null;
    pressKind = "";
    pressMoved = false;
  }

  function cycleWidgetSize(id) {
'''
)

replace_once(
    'styles/mobile-home-editing.css',
    '''  .mobile-home-os [data-home-item-id],
  .mobile-home-os [data-home-widget-id] {
    -webkit-touch-callout: none;
    -webkit-user-select: none;
    user-select: none;
    touch-action: manipulation;
  }
''',
    '''  .mobile-home-os [data-home-item-id],
  .mobile-home-os [data-home-widget-id] {
    -webkit-touch-callout: none;
    -webkit-user-select: none;
    user-select: none;
    touch-action: pan-y;
  }

  .mobile-home-os.is-home-editing .mobile-home-page-viewport {
    overflow-x: hidden;
    scroll-snap-type: none;
  }
'''
)
