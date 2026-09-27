from pathlib import Path


def replace_once(path, old, new):
    p = Path(path)
    text = p.read_text(encoding='utf-8')
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{path}: expected one anchor, found {count}')
    p.write_text(text.replace(old, new, 1), encoding='utf-8')


replace_once(
    'screens/homeScreen.js',
    '  return `<div class="${className} mobile-home-launcher" data-home-launcher><a class="mobile-home-app__launch" href="${escapeHtml(href)}" aria-label="${escapeHtml(label)}">${content}</a><button type="button" class="mobile-home-app-remove" data-home-app-remove aria-label="${escapeHtml(label)}をホームから外す">−</button></div>`;',
    '  return `<div class="${className} mobile-home-launcher" data-home-launcher><div class="mobile-home-app__launch" data-home-launch data-home-href="${escapeHtml(href)}" role="link" tabindex="0" aria-label="${escapeHtml(label)}">${content}</div><button type="button" class="mobile-home-app-remove" data-home-app-remove aria-label="${escapeHtml(label)}をホームから外す">−</button></div>`;'
)

replace_once(
    'ui/interactions/homeInteractions.js',
    '    const href = item.getAttribute("href") || item.querySelector("a[href]")?.getAttribute("href") || "";',
    '    const href = item.querySelector("[data-home-launch]")?.dataset.homeHref || item.getAttribute("href") || item.querySelector("a[href]")?.getAttribute("href") || "";'
)

replace_once(
    'ui/interactions/homeInteractions.js',
    '''  function handleSelectStart(event) {
    if (event.target.closest('input, textarea, [contenteditable="true"]')) return;
    event.preventDefault();
  }

  function handleClick(event) {
''',
    '''  function handleSelectStart(event) {
    if (event.target.closest('input, textarea, [contenteditable="true"]')) return;
    event.preventDefault();
  }

  function openHomeLauncher(launcher) {
    const href = String(launcher?.dataset?.homeHref || "");
    if (!href.startsWith("#/")) return;
    globalThis.location.hash = href.slice(1);
  }

  function handleClick(event) {
'''
)

replace_once(
    'ui/interactions/homeInteractions.js',
    '''    if (event.target.closest("[data-home-widget-picker-close]")) {
      event.preventDefault();
      closeWidgetPicker();
      return;
    }
    if ((event.target.closest("[data-home-item-id]") || event.target.closest("[data-home-widget-id]")) && (editing || Date.now() < suppressClickUntil)) {
      event.preventDefault();
    }
''',
    '''    if (event.target.closest("[data-home-widget-picker-close]")) {
      event.preventDefault();
      closeWidgetPicker();
      return;
    }
    const launcher = event.target.closest("[data-home-launch]");
    if (launcher) {
      event.preventDefault();
      if (editing || Date.now() < suppressClickUntil) return;
      openHomeLauncher(launcher);
      return;
    }
    if ((event.target.closest("[data-home-item-id]") || event.target.closest("[data-home-widget-id]")) && (editing || Date.now() < suppressClickUntil)) {
      event.preventDefault();
    }
'''
)

replace_once(
    'ui/interactions/homeInteractions.js',
    '''  function handleKeyDown(event) {
    if (event.key === "Escape") {
      if (widgetPicker && !widgetPicker.hidden) closeWidgetPicker();
      else if (editing) setEditing(false);
    }
  }
''',
    '''  function handleKeyDown(event) {
    const launcher = event.target.closest?.("[data-home-launch]") || null;
    if (launcher && !editing && (event.key === "Enter" || event.key === " ")) {
      event.preventDefault();
      openHomeLauncher(launcher);
      return;
    }
    if (event.key === "Escape") {
      if (widgetPicker && !widgetPicker.hidden) closeWidgetPicker();
      else if (editing) setEditing(false);
    }
  }
'''
)

replace_once(
    'tests/mobileQuickTools.test.mjs',
    '''await test('MOBILE-HOME-NESTED-LAUNCH-LINK-SUPPRESSES-IOS-LINK-CALLOUT', () => {
  const home = read('screens/homeScreen.js');
  const css = read('styles/mobile-quick-tools.css');
''',
    '''await test('MOBILE-HOME-NESTED-LAUNCH-LINK-SUPPRESSES-IOS-LINK-CALLOUT', () => {
  const home = read('screens/homeScreen.js');
  const interactions = read('ui/interactions/homeInteractions.js');
  const css = read('styles/mobile-quick-tools.css');
'''
)

replace_once(
    'tests/mobileQuickTools.test.mjs',
    "  assert.ok(css.includes('-webkit-touch-callout: none !important'));\n",
    "  assert.ok(css.includes('-webkit-touch-callout: none !important'));\n  assert.ok(home.includes('data-home-launch data-home-href='));\n  assert.ok(home.includes('role=\\\"link\\\" tabindex=\\\"0\\\"'));\n  assert.ok(!home.includes('<a class=\\\"mobile-home-app__launch\\\"'));\n  assert.ok(interactions.includes('function openHomeLauncher(launcher)'));\n  assert.ok(interactions.includes('globalThis.location.hash = href.slice(1)'));\n"
)
