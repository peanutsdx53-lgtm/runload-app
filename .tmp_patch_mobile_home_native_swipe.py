from pathlib import Path


def replace_once(path, old, new):
    p = Path(path)
    text = p.read_text(encoding='utf-8')
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{path}: expected exactly one match, found {count}: {old[:100]!r}')
    p.write_text(text.replace(old, new, 1), encoding='utf-8')

# 1) Let iOS perform normal-mode horizontal paging natively.
replace_once(
    'styles/mobile-home-editing.css',
    '''    scroll-snap-type: none;\n    overscroll-behavior-x: none;\n    touch-action: pan-y;\n    scrollbar-width: none;\n    -webkit-overflow-scrolling: auto;''',
    '''    scroll-snap-type: x mandatory;\n    overscroll-behavior-x: none;\n    touch-action: pan-x pan-y;\n    scrollbar-width: none;\n    -webkit-overflow-scrolling: touch;'''
)
replace_once(
    'styles/mobile-home-editing.css',
    '''  .mobile-home-page {\n    flex: 0 0 100%;\n    min-width: 0;\n    scroll-snap-align: start;\n    scroll-snap-stop: always;\n    transform-origin: center center;\n    will-change: transform, opacity;\n  }''',
    '''  .mobile-home-page {\n    flex: 0 0 100%;\n    min-width: 0;\n    scroll-snap-align: start;\n    scroll-snap-stop: always;\n  }'''
)
replace_once(
    'styles/mobile-home-editing.css',
    '''  .mobile-home-os [data-home-item-id],\n  .mobile-home-os [data-home-widget-id] {\n    -webkit-touch-callout: none;\n    -webkit-user-select: none;\n    user-select: none;\n    touch-action: pan-y;\n  }''',
    '''  .mobile-home-os [data-home-item-id],\n  .mobile-home-os [data-home-widget-id] {\n    -webkit-touch-callout: none;\n    -webkit-user-select: none;\n    user-select: none;\n    touch-action: pan-x pan-y;\n  }\n\n  .mobile-home-os.is-home-editing .mobile-home-page-viewport {\n    touch-action: pan-y;\n  }'''
)

# 2) Only the + control is interactive in the add sheet.
p = Path('ui/interactions/homeInteractions.js')
text = p.read_text(encoding='utf-8')
old_apps = '''    groups.push(`<p class="mobile-home-widget-picker__group-title">アプリアイコン</p>${availableApps.map((item) => `<button type="button" class="mobile-home-widget-picker__option mobile-home-widget-picker__option--app" data-home-app-add-id="${item.id}">${appPickerIconMarkup(root, item.id)}<div class="mobile-home-widget-picker__copy"><strong>${item.label}</strong><span>${item.description}</span></div><b aria-hidden="true">＋</b></button>`).join("")}`);'''
new_apps = '''    groups.push(`<p class="mobile-home-widget-picker__group-title">アプリアイコン</p>${availableApps.map((item) => `<div class="mobile-home-widget-picker__option mobile-home-widget-picker__option--app">${appPickerIconMarkup(root, item.id)}<div class="mobile-home-widget-picker__copy"><strong>${item.label}</strong><span>${item.description}</span></div><button type="button" class="mobile-home-widget-picker__add" data-home-app-add-id="${item.id}" aria-label="${item.label}をホームに追加">＋</button></div>`).join("")}`);'''
if text.count(old_apps) != 1:
    raise SystemExit('app picker markup anchor mismatch')
text = text.replace(old_apps, new_apps, 1)
old_widgets = '''    groups.push(`<p class="mobile-home-widget-picker__group-title">ウィジェット</p>${availableWidgets.map((item) => `<button type="button" class="mobile-home-widget-picker__option mobile-home-widget-picker__option--widget" data-home-widget-add-id="${item.id}"><strong>${item.label}</strong><span>${item.description}</span><b aria-hidden="true">＋</b></button>`).join("")}`);'''
new_widgets = '''    groups.push(`<p class="mobile-home-widget-picker__group-title">ウィジェット</p>${availableWidgets.map((item) => `<div class="mobile-home-widget-picker__option mobile-home-widget-picker__option--widget"><strong>${item.label}</strong><span>${item.description}</span><button type="button" class="mobile-home-widget-picker__add" data-home-widget-add-id="${item.id}" aria-label="${item.label}をホームに追加">＋</button></div>`).join("")}`);'''
if text.count(old_widgets) != 1:
    raise SystemExit('widget picker markup anchor mismatch')
text = text.replace(old_widgets, new_widgets, 1)

# Remove per-frame scale/opacity work; the physical horizontal motion itself is the transition.
start = text.index('  function clearPageMotionVisuals() {')
end = text.index('  function cancelPageAnimation() {', start)
text = text[:start] + text[end:]
text = text.replace('    clearPageMotionVisuals();\n', '', 1)
text = text.replace('    const duration = 280;\n', '    const duration = 180;\n', 1)
text = text.replace('      updatePageMotionVisuals();\n', '', 1)
text = text.replace('      clearPageMotionVisuals();\n', '', 1)
# In normal mode, do not claim the gesture with custom Pointer Events. Native iOS scrolling handles it.
anchor = '''  function handlePagePointerDown(event) {\n    if (pageSwipePointerId != null || dragging || dragArmed) return;'''
replacement = '''  function handlePagePointerDown(event) {\n    if (!editing) return;\n    if (pageSwipePointerId != null || dragging || dragArmed) return;'''
if text.count(anchor) != 1:
    raise SystemExit('page pointer down anchor mismatch')
text = text.replace(anchor, replacement, 1)
text = text.replace('    updatePageMotionVisuals();\n', '')
p.write_text(text, encoding='utf-8')

# 3) Style the dedicated + button, not the whole card.
p = Path('styles/mobile-home-editing.css')
css = p.read_text(encoding='utf-8')
old = '''  .mobile-home-widget-picker__option b {\n    grid-column: 2;\n    grid-row: 1 / 3;\n    align-self: center;\n    justify-self: end;\n    display: grid;\n    place-items: center;\n    width: 34px;\n    height: 34px;\n    border-radius: 50%;\n    background: var(--color-accent-strong);\n    color: var(--color-on-accent);\n    font-size: 20px;\n  }\n\n  .mobile-home-widget-picker__option.mobile-home-widget-picker__option--app > b {\n    grid-column: 3;\n    grid-row: 1;\n    align-self: center;\n    justify-self: end;\n  }'''
new = '''  .mobile-home-widget-picker__add {\n    grid-column: 2;\n    grid-row: 1 / 3;\n    align-self: center;\n    justify-self: end;\n    display: grid;\n    place-items: center;\n    width: 44px;\n    height: 44px;\n    min-height: 44px;\n    padding: 0;\n    border: 0;\n    border-radius: 50%;\n    background: var(--color-accent-strong);\n    color: var(--color-on-accent);\n    font-size: 24px;\n    font-weight: 700;\n    line-height: 1;\n    touch-action: manipulation;\n  }\n\n  .mobile-home-widget-picker__option--app > .mobile-home-widget-picker__add {\n    grid-column: 3;\n    grid-row: 1;\n  }'''
if css.count(old) != 1:
    raise SystemExit('picker plus CSS anchor mismatch')
css = css.replace(old, new, 1)
p.write_text(css, encoding='utf-8')

# 4) Update regression contracts.
p = Path('tests/mobileHomePageGestureV2.test.mjs')
test = p.read_text(encoding='utf-8')
old = '''test('PAGE-SWIPE-IS-RESPONSIVE-AND-FINGER-TRACKED', () => {\n  assert.ok(source.includes('Math.min(56, width * 0.12)'));\n  assert.ok(source.includes('velocity >= 0.28'));\n  assert.ok(source.includes('pageSwipeStartLeft - dx'));\n  assert.ok(source.includes('function updatePageMotionVisuals()'));\n  assert.ok(source.includes('const duration = 280;'));\n});\n\ntest('NORMAL-ITEM-TOUCH-ALLOWS-VERTICAL-PAN', () => {\n  const block = css.slice(css.indexOf('.mobile-home-os [data-home-item-id]'), css.indexOf('.mobile-home-os.is-home-drag-active'));\n  assert.ok(block.includes('touch-action: pan-y;'));\n  assert.ok(css.includes('.mobile-home-os.is-home-editing [data-home-item-id]'));\n  assert.ok(css.includes('touch-action: none;'));\n});\n\ntest('PAGE-MOTION-HAS-SUBTLE-SEAMLESS-VISUAL', () => {\n  assert.ok(css.includes('will-change: transform, opacity;'));\n  assert.ok(source.includes('page.style.transform = `scale('));\n  assert.ok(source.includes('page.style.opacity = String('));\n});'''
new = '''test('NORMAL-MODE-USES-NATIVE-IOS-HORIZONTAL-PAGING', () => {\n  assert.ok(css.includes('scroll-snap-type: x mandatory;'));\n  assert.ok(css.includes('-webkit-overflow-scrolling: touch;'));\n  assert.ok(css.includes('touch-action: pan-x pan-y;'));\n  const down = source.slice(source.indexOf('function handlePagePointerDown'), source.indexOf('function claimPageSwipe'));\n  assert.ok(down.includes('if (!editing) return;'));\n});\n\ntest('EDIT-MODE-KEEPS-CUSTOM-HORIZONTAL-SWIPE-AND-DRAG-SEPARATE', () => {\n  assert.ok(source.includes('Math.min(56, width * 0.12)'));\n  assert.ok(source.includes('velocity >= 0.28'));\n  assert.ok(source.includes('pageSwipeStartLeft - dx'));\n  assert.ok(source.includes('const duration = 180;'));\n  assert.ok(css.includes('.mobile-home-os.is-home-editing .mobile-home-page-viewport'));\n  assert.ok(css.includes('touch-action: pan-y;'));\n  assert.ok(css.includes('.mobile-home-os.is-home-editing [data-home-item-id]'));\n  assert.ok(css.includes('touch-action: none;'));\n});\n\ntest('PAGE-MOTION-AVOIDS-PER-FRAME-SCALE-AND-OPACITY-WORK', () => {\n  assert.equal(source.includes('function updatePageMotionVisuals()'), false);\n  assert.equal(source.includes('page.style.transform = `scale('), false);\n  assert.equal(css.includes('will-change: transform, opacity;'), false);\n});'''
if test.count(old) != 1:
    raise SystemExit('gesture test block anchor mismatch')
test = test.replace(old, new, 1)
p.write_text(test, encoding='utf-8')

p = Path('tests/mobileQuickTools.test.mjs')
test = p.read_text(encoding='utf-8')
replace_old = "  assert.ok(css.includes('.mobile-home-widget-picker__option.mobile-home-widget-picker__option--app > b'));\n"
replace_new = "  assert.ok(css.includes('.mobile-home-widget-picker__option--app > .mobile-home-widget-picker__add'));\n  assert.ok(interactions.includes('<div class=\"mobile-home-widget-picker__option mobile-home-widget-picker__option--app\">'));\n  assert.ok(interactions.includes('class=\"mobile-home-widget-picker__add\" data-home-app-add-id='));\n"
if test.count(replace_old) != 1:
    raise SystemExit('quick tools picker test anchor mismatch')
test = test.replace(replace_old, replace_new, 1)
p.write_text(test, encoding='utf-8')

# New explicit contract for plus-only addition.
Path('tests/mobileHomePickerAddControl.test.mjs').write_text('''import assert from 'node:assert/strict';\nimport fs from 'node:fs';\nimport path from 'node:path';\nimport { fileURLToPath } from 'node:url';\nconst here = path.dirname(fileURLToPath(import.meta.url));\nconst root = path.resolve(here, '..');\nconst source = fs.readFileSync(path.join(root, 'ui/interactions/homeInteractions.js'), 'utf8');\nconst css = fs.readFileSync(path.join(root, 'styles/mobile-home-editing.css'), 'utf8');\nassert.ok(source.includes('<div class="mobile-home-widget-picker__option mobile-home-widget-picker__option--app">'));\nassert.ok(source.includes('<div class="mobile-home-widget-picker__option mobile-home-widget-picker__option--widget">'));\nassert.ok(source.includes('class="mobile-home-widget-picker__add" data-home-app-add-id='));\nassert.ok(source.includes('class="mobile-home-widget-picker__add" data-home-widget-add-id='));\nassert.equal(source.includes('class="mobile-home-widget-picker__option mobile-home-widget-picker__option--app" data-home-app-add-id='), false);\nassert.equal(source.includes('class="mobile-home-widget-picker__option mobile-home-widget-picker__option--widget" data-home-widget-add-id='), false);\nassert.ok(css.includes('.mobile-home-widget-picker__add'));\nassert.ok(css.includes('min-height: 44px;'));\nconsole.log(JSON.stringify({ suite: 'Mobile Home Picker Add Control', status: 'PASS' }, null, 2));\n''', encoding='utf-8')
