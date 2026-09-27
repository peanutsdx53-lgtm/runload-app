from pathlib import Path
import re

ROOT = Path('.')

def read(path):
    return (ROOT / path).read_text(encoding='utf-8')

def write(path, text):
    (ROOT / path).write_text(text, encoding='utf-8')

def replace_once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected 1 match, got {count}')
    return text.replace(old, new, 1)

# 1) Render every launcher with the same wrapper + launch link + remove control.
path = 'screens/homeScreen.js'
text = read(path)
pattern = re.compile(r'function renderMobileLauncherItem\(\{ href, label, emoji, tone = "blue", dock = false, optional = false \}\) \{.*?\n\}\n\nfunction renderMobileTodayWidget', re.S)
replacement = '''function renderMobileLauncherItem({ href, label, emoji, tone = "blue", dock = false }) {
  const className = dock ? "mobile-home-dock__item" : "mobile-home-app";
  const iconClass = dock ? "mobile-home-dock__icon" : "mobile-home-app__icon";
  const labelClass = dock ? "mobile-home-dock__label" : "mobile-home-app__label";
  const iconMarkup = `<span class="mobile-home-emoji" aria-hidden="true">${escapeHtml(emoji)}</span>`;
  const content = `<span class="${iconClass} mobile-home-tone--${escapeHtml(tone)}">${iconMarkup}</span><span class="${labelClass}">${escapeHtml(label)}</span>`;
  return `<div class="${className} mobile-home-launcher" data-home-launcher><a class="mobile-home-app__launch" href="${escapeHtml(href)}" aria-label="${escapeHtml(label)}">${content}</a><button type="button" class="mobile-home-app-remove" data-home-app-remove aria-label="${escapeHtml(label)}をホームから外す">−</button></div>`;
}

function renderMobileTodayWidget'''
text, count = pattern.subn(replacement, text, count=1)
if count != 1:
    raise SystemExit(f'home launcher renderer: expected 1 match, got {count}')
write(path, text)

# 2) Make every launcher catalogued/removable, while keeping the existing default layout.
path = 'ui/interactions/homeInteractions.js'
text = read(path)
pattern = re.compile(r'const OPTIONAL_APP_CATALOG = Object\.freeze\(\[.*?\n\]\);\nconst OPTIONAL_ITEM_IDS = Object\.freeze\(OPTIONAL_APP_CATALOG\.map\(\(item\) => item\.id\)\);', re.S)
replacement = '''const HOME_APP_CATALOG = Object.freeze([
  Object.freeze({ id: "simulation", label: "条件比較", description: "条件を変えて比較" }),
  Object.freeze({ id: "plan", label: "予定", description: "次の予定を作成・確認" }),
  Object.freeze({ id: "reading", label: "読みもの", description: "走行に関する情報を確認" }),
  Object.freeze({ id: "share", label: "共有", description: "記録を共有用に整理" }),
  Object.freeze({ id: "settings", label: "設定", description: "表示や共有情報を設定" }),
  Object.freeze({ id: "record", label: "記録", description: "走行・休養を記録" }),
  Object.freeze({ id: "measure", label: "測定", description: "GPSで走行を測定" }),
  Object.freeze({ id: "history", label: "履歴", description: "保存した記録を確認" }),
  Object.freeze({ id: "course", label: "コース", description: "コースを保存・確認" }),
  Object.freeze({ id: "location-note", label: "地点メモ", description: "現在地と短いメモを保存" }),
  Object.freeze({ id: "quick-note", label: "1分メモ", description: "気づきを短く残す" }),
  Object.freeze({ id: "gear-note", label: "装備メモ", description: "その日の装備を保存" }),
  Object.freeze({ id: "departure-check", label: "出発チェック", description: "出発前の準備を確認" }),
  Object.freeze({ id: "fuel-note", label: "補給メモ", description: "水分や補給を時刻付きで記録" }),
  Object.freeze({ id: "photo-note", label: "写真メモ", description: "自分の写真と短いメモを端末内に保存" }),
  Object.freeze({ id: "pace-tool", label: "ペース換算", description: "距離と時間からペースを換算" }),
]);'''
text, count = pattern.subn(replacement, text, count=1)
if count != 1:
    raise SystemExit(f'app catalog: expected 1 match, got {count}')

old = '''const REQUIRED_ITEM_IDS = Object.freeze([...DEFAULT_LAYOUT.pages.flat(), ...DEFAULT_LAYOUT.dock]);
const ALL_ITEM_IDS = Object.freeze([...REQUIRED_ITEM_IDS, ...OPTIONAL_ITEM_IDS]);
const ALL_ITEM_ID_SET = new Set(ALL_ITEM_IDS);'''
new = '''const ALL_ITEM_IDS = Object.freeze(HOME_APP_CATALOG.map((item) => item.id));
const ALL_ITEM_ID_SET = new Set(ALL_ITEM_IDS);'''
text = replace_once(text, old, new, 'all item ids')

old = '''    const dock = Array.isArray(parsed.dock) ? parsed.dock.map(String) : [];
    if (dock.length !== DEFAULT_LAYOUT.dock.length || new Set(dock).size !== dock.length || !dock.every((id) => ALL_ITEM_ID_SET.has(id))) {
      return defaultGridLayout();
    }'''
new = '''    const dock = Array.isArray(parsed.dock) ? parsed.dock.map(String) : [...DEFAULT_LAYOUT.dock];
    if (dock.length > DEFAULT_LAYOUT.dock.length || new Set(dock).size !== dock.length || !dock.every((id) => ALL_ITEM_ID_SET.has(id))) {
      return defaultGridLayout();
    }'''
text = replace_once(text, old, new, 'dock validation')

text = replace_once(text,
'''        || !allApps.every((id) => ALL_ITEM_ID_SET.has(id))
        || !REQUIRED_ITEM_IDS.every((id) => allApps.includes(id))
        || widgetIds.length !== DEFAULT_WIDGET_ORDER.length''',
'''        || !allApps.every((id) => ALL_ITEM_ID_SET.has(id))
        || widgetIds.length !== DEFAULT_WIDGET_ORDER.length''',
'grid required app validation')

text = replace_once(text,
'''      if (new Set(allApps).size !== allApps.length
        || !allApps.every((id) => ALL_ITEM_ID_SET.has(id))
        || !REQUIRED_ITEM_IDS.every((id) => allApps.includes(id))) {''',
'''      if (new Set(allApps).size !== allApps.length
        || !allApps.every((id) => ALL_ITEM_ID_SET.has(id))) {''',
'legacy required app validation')

old = '''  layout.dock.forEach((id) => {
    const item = apps.get(id);
    if (!item) return;
    setItemZone(item, "dock");
    dockContainer.append(item);
  });
  return Math.max(0, Math.min(pageElements(root).length - 1, layout.activePage || 0));'''
new = '''  layout.dock.forEach((id) => {
    const item = apps.get(id);
    if (!item) return;
    setItemZone(item, "dock");
    dockContainer.append(item);
  });

  const installedIds = new Set([
    ...layout.pages.flatMap((tokens) => tokens.filter((token) => token.startsWith(APP_TOKEN_PREFIX)).map((token) => token.slice(APP_TOKEN_PREFIX.length))),
    ...layout.dock,
  ]);
  const catalog = root.querySelector("[data-home-app-catalog]");
  apps.forEach((item, id) => {
    if (installedIds.has(id)) return;
    setItemZone(item, "apps");
    catalog?.append(item);
    item.style.removeProperty("grid-row");
    item.style.removeProperty("grid-column");
    delete item.dataset.homeRow;
    delete item.dataset.homeCol;
  });
  return Math.max(0, Math.min(pageElements(root).length - 1, layout.activePage || 0));'''
text = replace_once(text, old, new, 'apply layout hidden catalog')

text = replace_once(text,
'''  const availableApps = OPTIONAL_APP_CATALOG.filter((item) => !installedApps.has(item.id));''',
'''  const availableApps = HOME_APP_CATALOG.filter((item) => !installedApps.has(item.id));''',
'picker app catalog')

# Allow a dock app to be dragged back to an empty grid location.
text = replace_once(text,
'''    if (!dragging || !pressTarget || pressTarget.closest(".mobile-home-dock")) return;''',
'''    if (!dragging || !pressTarget) return;''',
'dock placement preview')

old = '''    if (sourceDock) {
      if (targetApp && targetApp !== source && !targetApp.closest(".mobile-home-dock")) {
        const targetRow = Number(targetApp.dataset.homeRow) || 1;
        const targetCol = Number(targetApp.dataset.homeCol) || 1;
        swapItems(source, targetApp);
        setItemZone(source, "apps");
        setItemZone(targetApp, "dock");
        applyPlacementStyle(source, { row: targetRow, col: targetCol }, currentWidgetSizes(root));
        changed = true;
      } else if (targetApp && targetApp !== source && targetApp.closest(".mobile-home-dock")) {
        targetApp.before(source);
        changed = true;
      }
    } else if (!sourceIsWidget && targetDock && targetApp && targetApp !== source) {
      const sourceRow = Number(source.dataset.homeRow) || 1;
      const sourceCol = Number(source.dataset.homeCol) || 1;
      swapItems(source, targetApp);
      setItemZone(source, "dock");
      setItemZone(targetApp, "apps");
      applyPlacementStyle(targetApp, { row: sourceRow, col: sourceCol }, currentWidgetSizes(root));
      changed = true;
    } else if (dropPlacement && dropPlacement.pageIndex === activePage && sourceToken) {'''
new = '''    if (sourceDock) {
      if (targetApp && targetApp !== source && !targetApp.closest(".mobile-home-dock")) {
        const targetRow = Number(targetApp.dataset.homeRow) || 1;
        const targetCol = Number(targetApp.dataset.homeCol) || 1;
        swapItems(source, targetApp);
        setItemZone(source, "apps");
        setItemZone(targetApp, "dock");
        applyPlacementStyle(source, { row: targetRow, col: targetCol }, currentWidgetSizes(root));
        changed = true;
      } else if (targetApp && targetApp !== source && targetApp.closest(".mobile-home-dock")) {
        targetApp.before(source);
        changed = true;
      } else if (dropPlacement && dropPlacement.pageIndex === activePage && sourceToken) {
        const destinationGrid = pageContainers(currentPageElement()).grid;
        if (destinationGrid) {
          destinationGrid.append(source);
          setItemZone(source, "apps");
          applyPlacementStyle(source, dropPlacement, currentWidgetSizes(root));
          changed = true;
        }
      }
    } else if (!sourceIsWidget && targetDock) {
      if (targetApp && targetApp !== source) {
        const sourceRow = Number(source.dataset.homeRow) || 1;
        const sourceCol = Number(source.dataset.homeCol) || 1;
        swapItems(source, targetApp);
        setItemZone(source, "dock");
        setItemZone(targetApp, "apps");
        applyPlacementStyle(targetApp, { row: sourceRow, col: sourceCol }, currentWidgetSizes(root));
        changed = true;
      } else if (!targetApp && targetDock.querySelectorAll("[data-home-item-id]").length < DEFAULT_LAYOUT.dock.length) {
        targetDock.append(source);
        setItemZone(source, "dock");
        source.style.removeProperty("grid-row");
        source.style.removeProperty("grid-column");
        delete source.dataset.homeRow;
        delete source.dataset.homeCol;
        changed = true;
      }
    } else if (dropPlacement && dropPlacement.pageIndex === activePage && sourceToken) {'''
text = replace_once(text, old, new, 'dock drag flexibility')

pattern = re.compile(r'  function addOptionalApp\(id\) \{.*?\n  \}\n\n  function removeOptionalApp\(id\) \{.*?\n  \}\n', re.S)
replacement = '''  function addHomeApp(id) {
    const item = root.querySelector(`[data-home-app-catalog] [data-home-item-id="${id}"]`);
    if (!item || !ALL_ITEM_ID_SET.has(id)) return;
    const page = currentPageElement();
    const grid = pageContainers(page).grid;
    if (!grid) return;
    grid.append(item);
    setItemZone(item, "apps");
    const token = appToken(id);
    const placements = placementsForPage(page).filter((entry) => entry.token !== token);
    const free = findNearestFreePlacement(placements, token, { row: 1, col: 1 }, {
      widgetSizes: currentWidgetSizes(root),
      occupiedTokens: visibleTokensForPage(page),
    });
    if (free) applyPlacementStyle(item, free, currentWidgetSizes(root));
    refreshPageSlots(root, editing);
    persistHomeLayout();
    closeWidgetPicker();
    updatePageIndicator();
    updateViewportHeight();
  }

  function removeHomeApp(id) {
    if (!ALL_ITEM_ID_SET.has(id)) return;
    const item = root.querySelector(`[data-home-item-id="${id}"]`);
    const catalog = root.querySelector("[data-home-app-catalog]");
    if (!item || !catalog) return;
    catalog.append(item);
    setItemZone(item, "apps");
    item.style.removeProperty("grid-row");
    item.style.removeProperty("grid-column");
    delete item.dataset.homeRow;
    delete item.dataset.homeCol;
    refreshPageSlots(root, editing);
    persistHomeLayout();
    refreshWidgetPicker(root);
    updatePageIndicator();
    updateViewportHeight();
  }
'''
text, count = pattern.subn(replacement, text, count=1)
if count != 1:
    raise SystemExit(f'add/remove app functions: expected 1 match, got {count}')

text = text.replace('addOptionalApp(', 'addHomeApp(')
text = text.replace('removeOptionalApp(', 'removeHomeApp(')
if 'addOptionalApp(' in text or 'removeOptionalApp(' in text:
    raise SystemExit('old optional app function reference remains')
if 'OPTIONAL_APP_CATALOG' in text or 'OPTIONAL_ITEM_IDS' in text or 'REQUIRED_ITEM_IDS' in text:
    raise SystemExit('obsolete app catalog constants remain')
write(path, text)

# 3) Suppress WebKit link callout on the nested launch link and show remove control for all launchers.
path = 'styles/mobile-quick-tools.css'
text = read(path)
old = '''  .mobile-home-app--optional .mobile-home-app__launch {
    display: contents;
    color: inherit;
    text-decoration: none;
  }'''
new = '''  .mobile-home-app__launch {
    display: contents;
    color: inherit;
    text-decoration: none;
    -webkit-touch-callout: none !important;
    -webkit-user-select: none;
    user-select: none;
  }'''
text = replace_once(text, old, new, 'launcher link callout css')
text = replace_once(text,
'''  .mobile-home-os.is-home-editing .mobile-home-app--optional:not(.mobile-home-dock__item) .mobile-home-app-remove {
    display: grid;
    place-items: center;
  }''',
'''  .mobile-home-os.is-home-editing .mobile-home-app-remove {
    display: grid;
    place-items: center;
  }''',
'all launcher remove controls css')
write(path, text)

# 4) Update regression expectations for configurable built-in apps and iOS long-press behavior.
path = 'tests/mobileQuickTools.test.mjs'
text = read(path)
text = replace_once(text,
'''  assert.ok(interactions.includes('OPTIONAL_APP_CATALOG'));
  assert.ok(interactions.includes('data-home-app-add-id'));
  assert.ok(interactions.includes('removeOptionalApp'));''',
'''  assert.ok(interactions.includes('HOME_APP_CATALOG'));
  assert.ok(interactions.includes('data-home-app-add-id'));
  assert.ok(interactions.includes('removeHomeApp'));''',
'quick tools catalog assertions')

old = '''await test('MOBILE-QUICK-TOOLS-PRESERVE-REQUIRED-HOME-LAYOUT', () => {
  const interactions = read('ui/interactions/homeInteractions.js');
  assert.ok(interactions.includes('const REQUIRED_ITEM_IDS'));
  assert.ok(interactions.includes('REQUIRED_ITEM_IDS.every'));
  assert.ok(interactions.includes('OPTIONAL_ITEM_IDS'));
});'''
new = '''await test('MOBILE-HOME-ALL-APP-LAUNCHERS-ARE-REMOVABLE-AND-RESTORABLE', () => {
  const home = read('screens/homeScreen.js');
  const interactions = read('ui/interactions/homeInteractions.js');
  const css = read('styles/mobile-quick-tools.css');
  assert.ok(interactions.includes('const HOME_APP_CATALOG'));
  for (const id of ['simulation', 'plan', 'reading', 'share', 'settings', 'record', 'measure', 'history', 'course', 'pace-tool']) {
    assert.ok(interactions.includes(`id: "${id}"`), `missing app catalog entry ${id}`);
  }
  assert.ok(interactions.includes('function removeHomeApp(id)'));
  assert.ok(interactions.includes('function addHomeApp(id)'));
  assert.ok(interactions.includes('dock.length > DEFAULT_LAYOUT.dock.length'));
  assert.ok(!interactions.includes('REQUIRED_ITEM_IDS.every'));
  assert.ok(home.includes('data-home-app-remove'));
  assert.ok(css.includes('.mobile-home-os.is-home-editing .mobile-home-app-remove'));
});

await test('MOBILE-HOME-NESTED-LAUNCH-LINK-SUPPRESSES-IOS-LINK-CALLOUT', () => {
  const home = read('screens/homeScreen.js');
  const css = read('styles/mobile-quick-tools.css');
  assert.ok(home.includes('class="mobile-home-app__launch"'));
  assert.ok(css.includes('.mobile-home-app__launch'));
  assert.ok(css.includes('-webkit-touch-callout: none !important'));
});'''
text = replace_once(text, old, new, 'required layout test replacement')
write(path, text)

# Remove temporary implementation files before the workflow commits validated changes.
for temp in [Path('.github/scripts/mobile_home_launcher_patch.py'), Path('.github/workflows/mobile-home-launcher-temp.yml')]:
    if temp.exists():
        temp.unlink()
