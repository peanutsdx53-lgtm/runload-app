from pathlib import Path

path = Path('ui/interactions/homeInteractions.js')
s = path.read_text()

imp = '''import {
  HOME_COLUMNS,
  HOME_MAX_ROWS,
  HOME_MIN_ROWS,
  findNearestFreePlacement,
  footprintForToken,
  normalizePlacement,
  packTokens,
  usedRowCount,
} from "./homeGridModel.js";

'''
if './homeGridModel.js' not in s:
    s = imp + s

s = s.replace('const STORAGE_KEY = "running-record-mobile-home-layout-v1";\n', 'const STORAGE_KEY = "running-record-mobile-home-layout-v1";\nconst POSITION_STORAGE_KEY = "running-record-mobile-home-positions-v1";\n', 1)
s = s.replace('const PAGE_EDGE_PX = 34;\nconst PAGE_EDGE_DELAY_MS = 420;', 'const PAGE_EDGE_PX = 16;\nconst PAGE_EDGE_DELAY_MS = 850;', 1)

marker = '''function gridTokenForElement(element) {
  const appId = element?.dataset?.homeItemId || "";
  if (appId) return appToken(appId);
  const widgetId = element?.dataset?.homeWidgetId || "";
  if (widgetId) return widgetToken(widgetId);
  return "";
}

'''
helpers = marker + '''function currentWidgetSizes(root) {
  return Object.fromEntries([...root.querySelectorAll("[data-home-widget-id]")].map((item) => [
    item.dataset.homeWidgetId,
    item.dataset.homeWidgetSize || DEFAULT_WIDGET_SIZES[item.dataset.homeWidgetId] || "small",
  ]));
}

function visibleTokensForPage(page) {
  const tokens = [];
  page?.querySelectorAll("[data-home-item-id]").forEach((item) => tokens.push(appToken(item.dataset.homeItemId)));
  page?.querySelectorAll("[data-home-widget-id]:not([hidden])").forEach((item) => tokens.push(widgetToken(item.dataset.homeWidgetId)));
  return new Set(tokens);
}

function placementsForPage(page) {
  const placements = [];
  page?.querySelectorAll("[data-home-item-id], [data-home-widget-id]").forEach((item) => {
    const token = gridTokenForElement(item);
    if (!token) return;
    placements.push({ token, row: Number(item.dataset.homeRow) || 1, col: Number(item.dataset.homeCol) || 1 });
  });
  return placements;
}

function applyPlacementStyle(element, placement, widgetSizes) {
  if (!element || !placement) return;
  const token = gridTokenForElement(element);
  if (!token) return;
  const footprint = footprintForToken(token, widgetSizes);
  const normalized = normalizePlacement(placement, footprint);
  element.dataset.homeRow = String(normalized.row);
  element.dataset.homeCol = String(normalized.col);
  element.style.gridRow = `${normalized.row} / span ${footprint.rows}`;
  element.style.gridColumn = `${normalized.col} / span ${footprint.columns}`;
}

function buildPositionLayoutFromDom(root) {
  const widgetSizes = currentWidgetSizes(root);
  return {
    version: 1,
    pages: pageElements(root).map((page) => {
      const tokens = [...page.querySelectorAll("[data-home-item-id], [data-home-widget-id]")].map(gridTokenForElement).filter(Boolean);
      return packTokens(tokens, { widgetSizes, occupiedTokens: visibleTokensForPage(page) });
    }),
  };
}

function readPositionLayout(root) {
  try {
    const parsed = JSON.parse(globalThis.localStorage?.getItem(POSITION_STORAGE_KEY) || "null");
    if (!parsed || !Array.isArray(parsed.pages)) return buildPositionLayoutFromDom(root);
    const seen = new Set();
    const pages = parsed.pages.slice(0, MAX_HOME_PAGES).map((page) => {
      if (!Array.isArray(page)) return [];
      return page.flatMap((entry) => {
        const token = String(entry?.token || "");
        if (!token || seen.has(token)) return [];
        const valid = token.startsWith(APP_TOKEN_PREFIX)
          ? ALL_ITEM_ID_SET.has(token.slice(APP_TOKEN_PREFIX.length))
          : token.startsWith(WIDGET_TOKEN_PREFIX) && WIDGET_ID_SET.has(token.slice(WIDGET_TOKEN_PREFIX.length));
        if (!valid) return [];
        seen.add(token);
        return [{ token, row: Number(entry?.row) || 1, col: Number(entry?.col) || 1 }];
      });
    });
    return { version: 1, pages: pages.length ? pages : [[]] };
  } catch {
    return buildPositionLayoutFromDom(root);
  }
}

function writePositionLayout(root) {
  const layout = { version: 1, pages: pageElements(root).map(placementsForPage) };
  try {
    globalThis.localStorage?.setItem(POSITION_STORAGE_KEY, JSON.stringify(layout));
  } catch {
    // Position persistence is optional; ordered layout remains a fallback.
  }
}

function applyPositionLayout(root, layout) {
  ensurePageCount(root, Math.max(1, layout?.pages?.length || 1));
  const widgetSizes = currentWidgetSizes(root);
  const elements = new Map([...root.querySelectorAll("[data-home-item-id], [data-home-widget-id]")].map((item) => [gridTokenForElement(item), item]));
  const positioned = new Set();

  (layout?.pages || []).forEach((entries, pageIndex) => {
    const page = pageElements(root)[pageIndex];
    const grid = pageContainers(page).grid;
    if (!grid) return;
    (entries || []).forEach((entry) => {
      const element = elements.get(entry.token);
      if (!element || element.closest(".mobile-home-dock")) return;
      grid.append(element);
      applyPlacementStyle(element, entry, widgetSizes);
      positioned.add(entry.token);
    });
  });

  pageElements(root).forEach((page) => {
    const grid = pageContainers(page).grid;
    if (!grid) return;
    const occupied = visibleTokensForPage(page);
    const placements = placementsForPage(page).filter((entry) => positioned.has(entry.token));
    [...grid.querySelectorAll("[data-home-item-id], [data-home-widget-id]")].forEach((element) => {
      const token = gridTokenForElement(element);
      if (!token || positioned.has(token)) return;
      const free = findNearestFreePlacement(placements, token, { row: 1, col: 1 }, { widgetSizes, occupiedTokens: occupied });
      if (!free) return;
      applyPlacementStyle(element, free, widgetSizes);
      placements.push({ token, ...free });
      positioned.add(token);
    });
  });
}

function refreshPageSlots(root, editing = false) {
  const widgetSizes = currentWidgetSizes(root);
  pageElements(root).forEach((page) => {
    const grid = pageContainers(page).grid;
    if (!grid) return;
    grid.querySelectorAll(".mobile-home-grid-slot").forEach((slot) => slot.remove());
    const placements = placementsForPage(page);
    const occupied = visibleTokensForPage(page);
    const rows = Math.min(HOME_MAX_ROWS, usedRowCount(placements, { widgetSizes, occupiedTokens: occupied, minRows: HOME_MIN_ROWS }) + (editing ? 1 : 0));
    grid.style.setProperty("--home-grid-rows", String(rows));
    const fragment = document.createDocumentFragment();
    for (let row = 1; row <= rows; row += 1) {
      for (let col = 1; col <= HOME_COLUMNS; col += 1) {
        const slot = document.createElement("span");
        slot.className = "mobile-home-grid-slot";
        slot.setAttribute("aria-hidden", "true");
        slot.style.gridRow = String(row);
        slot.style.gridColumn = String(col);
        fragment.append(slot);
      }
    }
    grid.prepend(fragment);
  });
}

'''
if marker not in s:
    raise SystemExit('grid token marker not found')
s = s.replace(marker, helpers, 1)

startup_old = '''  ensurePageCount(root, appLayout.pages.length);
  let activePage = applyLayout(root, dockContainer, appLayout);
  applyWidgetLayout(root, widgetLayout);
  ensureWidgetPicker(root);'''
startup_new = '''  ensurePageCount(root, appLayout.pages.length);
  let activePage = applyLayout(root, dockContainer, appLayout);
  applyWidgetLayout(root, widgetLayout);
  applyPositionLayout(root, readPositionLayout(root));
  refreshPageSlots(root, false);
  ensureWidgetPicker(root);'''
if startup_old not in s:
    raise SystemExit('startup target not found')
s = s.replace(startup_old, startup_new, 1)

s = s.replace('''  let dropItem = null;
  let suppressClickUntil = 0;''', '''  let dropItem = null;
  let dropPlacement = null;
  let dropPreview = null;
  let suppressClickUntil = 0;''', 1)

persist_old = '''  function persistHomeLayout() {
    writeLayout(root, dockContainer, activePage);
    writeWidgetLayout(root);
  }'''
persist_new = '''  function persistHomeLayout() {
    writeLayout(root, dockContainer, activePage);
    writeWidgetLayout(root);
    writePositionLayout(root);
  }'''
if persist_old not in s:
    raise SystemExit('persist target not found')
s = s.replace(persist_old, persist_new, 1)

clear_old = '''  function clearDropTarget() {
    dropItem?.classList.remove("is-home-drop-target", "is-home-widget-drop-target");
    dropItem = null;
  }'''
clear_new = '''  function clearDropItemOnly() {
    dropItem?.classList.remove("is-home-drop-target", "is-home-widget-drop-target");
    dropItem = null;
  }

  function clearDropPreview() {
    dropPreview?.remove();
    dropPreview = null;
    dropPlacement = null;
  }

  function clearDropTarget() {
    clearDropItemOnly();
    clearDropPreview();
  }

  function placementFromPointer(grid, clientX, clientY, token) {
    const rect = grid?.getBoundingClientRect();
    if (!rect || rect.width <= 0) return null;
    const style = getComputedStyle(grid);
    const columnGap = Number.parseFloat(style.columnGap) || 8;
    const rowGap = Number.parseFloat(style.rowGap) || 12;
    const rowHeight = Number.parseFloat(style.gridAutoRows) || 132;
    const cellWidth = (rect.width - columnGap * (HOME_COLUMNS - 1)) / HOME_COLUMNS;
    const rawCol = Math.floor(Math.max(0, clientX - rect.left) / Math.max(1, cellWidth + columnGap)) + 1;
    const rawRow = Math.floor(Math.max(0, clientY - rect.top) / Math.max(1, rowHeight + rowGap)) + 1;
    return normalizePlacement({ row: rawRow, col: rawCol }, footprintForToken(token, currentWidgetSizes(root)));
  }

  function renderDropPreview(grid, token, placement) {
    clearDropPreview();
    if (!grid || !placement) return;
    const footprint = footprintForToken(token, currentWidgetSizes(root));
    const preview = document.createElement("span");
    preview.className = "mobile-home-drop-preview";
    preview.setAttribute("aria-hidden", "true");
    preview.style.gridRow = `${placement.row} / span ${footprint.rows}`;
    preview.style.gridColumn = `${placement.col} / span ${footprint.columns}`;
    grid.append(preview);
    dropPreview = preview;
    dropPlacement = { pageIndex: activePage, ...placement };
  }

  function updatePlacementPreview(event) {
    if (!dragging || !pressTarget || pressTarget.closest(".mobile-home-dock")) return;
    const page = currentPageElement();
    const grid = pageContainers(page).grid;
    const token = gridTokenForElement(pressTarget);
    if (!grid || !token) return;
    const desired = placementFromPointer(grid, event.clientX, event.clientY, token);
    if (!desired) return;
    const placements = placementsForPage(page).filter((entry) => entry.token !== token);
    const free = findNearestFreePlacement(placements, token, desired, {
      widgetSizes: currentWidgetSizes(root),
      occupiedTokens: visibleTokensForPage(page),
    });
    if (free) renderDropPreview(grid, token, free);
  }'''
if clear_old not in s:
    raise SystemExit('clear target not found')
s = s.replace(clear_old, clear_new, 1)

set_edit_tail = '''    updatePageIndicator();
  }

  function finishGridDrag'''
if set_edit_tail not in s:
    raise SystemExit('set editing tail not found')
s = s.replace(set_edit_tail, '''    updatePageIndicator();
    refreshPageSlots(root, editing);
    updateViewportHeight();
  }

  function finishGridDrag''', 1)

start = s.index('  function finishGridDrag(event, cancelled) {')
end = s.index('  function finishDrag(event, cancelled = false) {', start)
finish_grid = '''  function finishGridDrag(event, cancelled) {
    if (cancelled || !pressTarget) return;
    const source = pressTarget;
    const sourceToken = gridTokenForElement(source);
    const sourceIsWidget = Boolean(source.dataset.homeWidgetId);
    const sourceDock = source.closest(".mobile-home-dock");
    const pointTarget = document.elementFromPoint(event?.clientX ?? startX, event?.clientY ?? startY);
    const targetApp = pointTarget?.closest?.("[data-home-item-id]") || null;
    const targetDock = pointTarget?.closest?.(".mobile-home-dock") || null;
    let changed = false;

    if (sourceDock) {
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
    } else if (dropPlacement && dropPlacement.pageIndex === activePage && sourceToken) {
      const destinationGrid = pageContainers(currentPageElement()).grid;
      if (destinationGrid) {
        destinationGrid.append(source);
        if (!sourceIsWidget) setItemZone(source, "apps");
        applyPlacementStyle(source, dropPlacement, currentWidgetSizes(root));
        changed = true;
      }
    }

    if (changed) {
      refreshPageSlots(root, editing);
      persistHomeLayout();
      updatePageIndicator();
      updateViewportHeight();
    }
  }

'''
s = s[:start] + finish_grid + s[end:]

move_start = s.index('  function handlePointerMove(event) {')
move_end = s.index('  function handlePointerUp(event) {', move_start)
move_fn = '''  function handlePointerMove(event) {
    if (event.pointerId !== pointerId) return;
    if (!dragging) {
      if (Math.hypot(event.clientX - startX, event.clientY - startY) > MOVE_CANCEL_PX) cancelPendingPress();
      return;
    }
    event.preventDefault();
    moveGhost(ghost, event.clientX, event.clientY);
    scheduleEdgePaging(event.clientX);
    clearDropItemOnly();
    const hit = document.elementFromPoint(event.clientX, event.clientY)?.closest?.("[data-home-item-id], [data-home-widget-id]") || null;
    if (hit && hit !== pressTarget) {
      dropItem = hit;
      dropItem.classList.add(hit.dataset.homeWidgetId ? "is-home-widget-drop-target" : "is-home-drop-target");
    }
    updatePlacementPreview(event);
  }

'''
s = s[:move_start] + move_fn + s[move_end:]

s = s.replace('''    viewport.scrollTo({ left, behavior: smooth ? "smooth" : "auto" });
    updatePageIndicator();''', '''    viewport.scrollTo({ left, behavior: smooth ? "smooth" : "auto" });
    if (dragging) clearDropPreview();
    updatePageIndicator();''', 1)

resize_old = '''    applyWidgetSize(widget, next);
    persistHomeLayout();'''
resize_new = '''    applyWidgetSize(widget, next);
    const page = widget.closest(".mobile-home-page");
    const token = widgetToken(id);
    const placements = placementsForPage(page).filter((entry) => entry.token !== token);
    const free = findNearestFreePlacement(placements, token, { row: Number(widget.dataset.homeRow) || 1, col: Number(widget.dataset.homeCol) || 1 }, {
      widgetSizes: currentWidgetSizes(root),
      occupiedTokens: visibleTokensForPage(page),
    });
    if (free) applyPlacementStyle(widget, free, currentWidgetSizes(root));
    refreshPageSlots(root, editing);
    persistHomeLayout();'''
if resize_old not in s:
    raise SystemExit('resize target not found')
s = s.replace(resize_old, resize_new, 1)

add_old = '''    pageContainers(currentPageElement()).grid?.append(widget);
    persistHomeLayout();'''
add_new = '''    const page = currentPageElement();
    const grid = pageContainers(page).grid;
    grid?.append(widget);
    const token = widgetToken(id);
    const placements = placementsForPage(page).filter((entry) => entry.token !== token);
    const free = findNearestFreePlacement(placements, token, { row: 1, col: 1 }, {
      widgetSizes: currentWidgetSizes(root),
      occupiedTokens: visibleTokensForPage(page),
    });
    if (free) applyPlacementStyle(widget, free, currentWidgetSizes(root));
    refreshPageSlots(root, editing);
    persistHomeLayout();'''
if add_old not in s:
    raise SystemExit('add widget target not found')
s = s.replace(add_old, add_new, 1)

path.write_text(s)

css = Path('styles/mobile-home-editing.css')
c = css.read_text()
c += '''

@media (max-width: 54.99rem) {
  .mobile-home-grid {
    grid-template-columns: repeat(4, minmax(0, 1fr));
    grid-auto-rows: 132px;
    grid-template-rows: repeat(var(--home-grid-rows, 4), 132px);
    grid-auto-flow: unset;
    min-height: 0;
    align-content: start;
    position: relative;
  }

  .mobile-home-grid > [data-home-item-id],
  .mobile-home-grid > [data-home-widget-id] {
    z-index: 2;
    min-width: 0;
    align-self: stretch;
  }

  .mobile-home-grid > .mobile-home-app,
  .mobile-home-grid > .mobile-home-widget-shell,
  .mobile-home-grid > .mobile-home-widget-shell > .mobile-home-widget {
    min-height: 0;
    height: 100%;
  }

  .mobile-home-grid-slot {
    z-index: 0;
    display: block;
    min-width: 0;
    border: 1px dashed transparent;
    border-radius: 18px;
    pointer-events: none;
  }

  .mobile-home-os.is-home-editing .mobile-home-grid-slot {
    border-color: color-mix(in srgb, var(--color-line) 45%, transparent);
    background: color-mix(in srgb, var(--color-surface) 22%, transparent);
  }

  .mobile-home-drop-preview {
    z-index: 1;
    display: block;
    border: 2px solid color-mix(in srgb, var(--color-accent-strong) 64%, transparent);
    border-radius: 20px;
    background: color-mix(in srgb, var(--color-accent-soft) 44%, transparent);
    box-shadow: inset 0 0 0 1px rgba(255,255,255,.6);
    pointer-events: none;
  }

  .mobile-home-widget-drag-ghost.mobile-home-widget-shell--size-small,
  .mobile-home-widget-drag-ghost.mobile-home-widget-shell--wide.mobile-home-widget-shell--size-small {
    width: min(43vw, 185px);
    min-height: 112px;
  }
}
'''
css.write_text(c)

sw = Path('service-worker.js')
w = sw.read_text()
needle = '  "./ui/interactions/homeInteractions.js",\n'
if './ui/interactions/homeGridModel.js' not in w:
    if needle not in w:
        raise SystemExit('service worker homeInteractions entry not found')
    w = w.replace(needle, needle + '  "./ui/interactions/homeGridModel.js",\n', 1)
sw.write_text(w)
