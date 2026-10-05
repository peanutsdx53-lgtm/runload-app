import { bindMobileHomeHub } from "../mobileHomeHub.js";
import {
  HOME_COLUMNS,
  findNearestFreePlacement,
  footprintForToken,
  normalizePlacement,
} from "./mobileHomeGridModel.js";
import { rememberMobileHomeLaunch } from "../mobileHomeReturnTransition.js";
import {
  ALL_ITEM_ID_SET,
  DEFAULT_LAYOUT,
  MAX_HOME_PAGES,
  WIDGET_SIZE_ORDER,
  appToken,
  widgetToken,
  gridTokenForElement,
  currentWidgetSizes,
  visibleTokensForPage,
  placementsForPage,
  applyPlacementStyle,
  readPositionLayout,
  writePositionLayout,
  applyPositionLayout,
  refreshPageSlots,
  readLayout,
  readWidgetLayout,
  writeLayout,
  writeWidgetLayout,
  setItemZone,
  prepareItems,
  syncPageIndices,
  ensurePageScaffold,
  ensurePageCount,
  pageElements,
  pageContainers,
  createCheckpointWidget,
  normalizeWidgetSize,
  applyWidgetSize,
  makeWidgetShell,
  prepareWidgets,
  applyLayout,
  applyWidgetLayout,
} from "./mobileHomeLayoutState.js";
import {
  ensureEditControls,
  ensureWidgetPicker,
  refreshWidgetPicker,
  swapItems,
  createDragGhost,
  moveGhost,
} from "./mobileHomeEditPresentation.js";

const LONG_PRESS_MS = 380;
const EDIT_DRAG_ARM_MS = 180;
const LAUNCH_ANIMATION_MS = 360;
const LAUNCH_NAVIGATION_MS = 260;
const TAP_SLOP_PX = 8;
const DRAG_START_PX = 10;
const PAGE_EDGE_PX = 16;
const PAGE_EDGE_DELAY_MS = 850;

export function bindHome(context = {}) {
  const root = document.querySelector(".mobile-home-os");
  if (!root) return null;
  const dockContainer = root.querySelector(".mobile-home-dock");
  const sourceWidgets = root.querySelector(".mobile-home-widgets");
  if (!dockContainer || !sourceWidgets) return null;
  const cleanupHub = bindMobileHomeHub(root);

  prepareWidgets(sourceWidgets, context.services);
  prepareItems(root);
  const viewport = ensurePageScaffold(root);
  if (!viewport) return null;
  ensureEditControls(root);
  const appLayout = readLayout();
  const widgetLayout = readWidgetLayout();
  ensurePageCount(root, appLayout.pages.length);
  let activePage = applyLayout(root, dockContainer, appLayout);
  applyWidgetLayout(root, widgetLayout);
  syncConfirmationBanner();
  applyPositionLayout(root, readPositionLayout(root));
  refreshPageSlots(root, false);
  ensureWidgetPicker(root);

  let editing = false;
  let pressTimer = null;
  let pressTarget = null;
  let pressKind = "";
  let pointerId = null;
  let startX = 0;
  let startY = 0;
  let lastX = 0;
  let lastY = 0;
  let pressMoved = false;
  let dragArmed = false;
  let dragging = false;
  let ghost = null;
  let dropItem = null;
  let dropPlacement = null;
  let dropPreview = null;
  let suppressClickUntil = 0;
  let launchTimer = null;
  let edgeTimer = null;

  function syncConfirmationBanner() {
    const banner = root.querySelector("[data-mobile-confirmation-banner]");
    if (!banner) return;
    const checkpoint = root.querySelector('[data-home-widget-id="checkpoint"]');
    banner.hidden = Boolean(checkpoint && !checkpoint.hidden);
  }
  let edgeTargetPage = -1;
  let scrollFrame = null;
  let pageAnimationFrame = null;
  let pageSwipePointerId = null;
  let pageSwipeStartX = 0;
  let pageSwipeStartY = 0;
  let pageSwipeStartLeft = 0;
  let pageSwipeStartTime = 0;
  let pageSwipeHorizontal = false;

  const editButton = root.querySelector("[data-home-edit-toggle]");
  const widgetPicker = root.querySelector("[data-home-widget-picker]");
  const pageIndicator = root.querySelector("[data-home-page-indicator]");

  function currentPageElement() {
    return pageElements(root)[activePage] || pageElements(root)[0] || null;
  }

  function persistHomeLayout() {
    writeLayout(root, dockContainer, activePage);
    writeWidgetLayout(root);
    writePositionLayout(root);
  }

  function updateViewportHeight() {
    requestAnimationFrame(() => {
      const page = currentPageElement();
      if (!page) return;
      viewport.style.height = `${Math.max(1, page.scrollHeight)}px`;
    });
  }

  function updatePageIndicator() {
    if (!pageIndicator) return;
    const pages = pageElements(root);
    pageIndicator.hidden = false;
    pageIndicator.replaceChildren();
    pages.forEach((page, index) => {
      const dot = document.createElement("button");
      dot.type = "button";
      dot.className = "mobile-home-page-dot";
      dot.dataset.homePageTarget = String(index);
      dot.setAttribute("aria-label", `${index + 1}ページ目へ移動`);
      dot.setAttribute("aria-current", index === activePage ? "page" : "false");
      pageIndicator.append(dot);
    });
    if (editing && pages.length < MAX_HOME_PAGES) {
      const add = document.createElement("button");
      add.type = "button";
      add.className = "mobile-home-page-control";
      add.dataset.homePageAdd = "";
      add.setAttribute("aria-label", "ホームページを追加");
      add.textContent = "+";
      pageIndicator.append(add);
    }
    if (editing && activePage > 0) {
      const page = pages[activePage];
      const grid = pageContainers(page).grid;
      const hasApps = Boolean(grid?.querySelector("[data-home-item-id]"));
      const hasVisibleWidgets = Boolean(grid?.querySelector("[data-home-widget-id]:not([hidden])"));
      if (!hasApps && !hasVisibleWidgets) {
        const remove = document.createElement("button");
        remove.type = "button";
        remove.className = "mobile-home-page-control mobile-home-page-control--remove";
        remove.dataset.homePageRemove = "";
        remove.setAttribute("aria-label", "空のホームページを削除");
        remove.textContent = "−";
        pageIndicator.append(remove);
      }
    }
  }

  function cancelPageAnimation() {
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
    const duration = 180;
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

  function addPage() {
    const pages = pageElements(root);
    if (pages.length >= MAX_HOME_PAGES) return;
    ensurePageCount(root, pages.length + 1);
    syncPageIndices(root);
    setActivePage(pageElements(root).length - 1, { smooth: true, persist: true });
  }

  function removeCurrentPage() {
    const pages = pageElements(root);
    if (activePage <= 0 || activePage >= pages.length) return;
    const page = pages[activePage];
    const grid = pageContainers(page).grid;
    if (grid?.querySelector("[data-home-item-id]")) return;
    if (grid?.querySelector("[data-home-widget-id]:not([hidden])")) return;
    const fallback = pages[activePage - 1];
    const fallbackGrid = pageContainers(fallback).grid;
    grid?.querySelectorAll("[data-home-widget-id][hidden]").forEach((widget) => fallbackGrid?.append(widget));
    page.remove();
    syncPageIndices(root);
    activePage = Math.max(0, activePage - 1);
    setActivePage(activePage, { smooth: false });
    persistHomeLayout();
  }

  function clearEdgePaging() {
    if (edgeTimer) clearTimeout(edgeTimer);
    edgeTimer = null;
    edgeTargetPage = -1;
  }

  function scheduleEdgePaging(clientX) {
    if (!dragging || pageElements(root).length < 2) {
      clearEdgePaging();
      return;
    }
    const rect = viewport.getBoundingClientRect();
    let target = -1;
    if (clientX - rect.left <= PAGE_EDGE_PX && activePage > 0) target = activePage - 1;
    else if (rect.right - clientX <= PAGE_EDGE_PX && activePage < pageElements(root).length - 1) target = activePage + 1;
    if (target < 0) {
      clearEdgePaging();
      return;
    }
    if (edgeTimer && edgeTargetPage === target) return;
    clearEdgePaging();
    edgeTargetPage = target;
    edgeTimer = setTimeout(() => {
      const next = edgeTargetPage;
      clearEdgePaging();
      setActivePage(next, { smooth: false });
    }, PAGE_EDGE_DELAY_MS);
  }

  function clearDropItemOnly() {
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
    if (!dragging || !pressTarget) return;
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
  }

  function clearPressState() {
    pressTarget?.classList.remove("is-home-pressing", "is-home-drag-armed");
  }

  function closeWidgetPicker() {
    if (widgetPicker) widgetPicker.hidden = true;
  }

  function openWidgetPicker() {
    refreshWidgetPicker(root);
    if (widgetPicker) widgetPicker.hidden = false;
  }

  function setEditing(next) {
    editing = Boolean(next);
    root.classList.toggle("is-home-editing", editing);
    if (editButton) {
      editButton.textContent = editing ? "完了" : "編集";
      editButton.setAttribute("aria-pressed", String(editing));
    }
    if (!editing) {
      clearDropTarget();
      clearEdgePaging();
      closeWidgetPicker();
    }
    updatePageIndicator();
    refreshPageSlots(root, editing);
    updateViewportHeight();
  }

  function finishGridDrag(event, cancelled) {
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

  function finishDrag(event, cancelled = false) {
    if (!dragging || !pressTarget) return;
    finishGridDrag(event, cancelled);

    pressTarget.classList.remove("is-home-dragging", "is-home-widget-dragging", "is-home-pressing");
    clearDropTarget();
    clearEdgePaging();
    ghost?.remove();
    ghost = null;
    dragging = false;
    dragArmed = false;
    root.classList.remove("is-home-drag-active");
    suppressClickUntil = Date.now() + 350;
    try { pressTarget.releasePointerCapture(pointerId); } catch {}
  }

  function armDrag(target, kind) {
    if (!target || dragging) return;
    cancelPressTimer();
    setEditing(true);
    dragArmed = true;
    pressTarget = target;
    pressKind = kind;
    startX = lastX;
    startY = lastY;
    pressMoved = false;
    target.classList.remove("is-home-pressing");
    target.classList.add("is-home-drag-armed");
    suppressClickUntil = Date.now() + 800;
  }

  function beginDrag(target, event, kind) {
    if (!target || dragging) return;
    target.classList.remove("is-home-pressing", "is-home-drag-armed");
    setEditing(true);
    setActivePage(activePage, { smooth: false });
    dragArmed = false;
    dragging = true;
    root.classList.add("is-home-drag-active");
    pressTarget = target;
    pressKind = kind;
    pointerId = event.pointerId;
    target.classList.add(kind === "widget" ? "is-home-widget-dragging" : "is-home-dragging");
    ghost = createDragGhost(target, kind);
    moveGhost(ghost, event.clientX, event.clientY);
    suppressClickUntil = Date.now() + 800;
    try { target.setPointerCapture(event.pointerId); } catch {}
  }

  function cancelPressTimer() {
    if (pressTimer) clearTimeout(pressTimer);
    pressTimer = null;
  }

  function cancelPendingPress() {
    cancelPressTimer();
    clearPressState();
  }

  function handlePointerDown(event) {
    if (event.target.closest("button")) return;
    const widget = event.target.closest("[data-home-widget-id]");
    const item = event.target.closest("[data-home-item-id]");
    const target = widget || item;
    const kind = widget ? "widget" : item ? "app" : "";
    if (!target || (event.pointerType === "mouse" && event.button !== 0)) return;
    cancelPendingPress();
    pressTarget = target;
    pressKind = kind;
    pointerId = event.pointerId;
    startX = event.clientX;
    startY = event.clientY;
    lastX = event.clientX;
    lastY = event.clientY;
    pressMoved = false;
    target.classList.add("is-home-pressing");
    if (editing) {
      event.preventDefault();
      pressTimer = setTimeout(() => armDrag(target, kind), EDIT_DRAG_ARM_MS);
      return;
    }
    pressTimer = setTimeout(() => armDrag(target, kind), LONG_PRESS_MS);
  }

  function handlePointerMove(event) {
    if (event.pointerId !== pointerId) return;
    lastX = event.clientX;
    lastY = event.clientY;
    if (!dragging) {
      const dx = event.clientX - startX;
      const dy = event.clientY - startY;
      const distance = Math.hypot(dx, dy);
      if (distance > TAP_SLOP_PX) pressMoved = true;
      if (!dragArmed) {
        if (distance > TAP_SLOP_PX) cancelPressTimer();
        return;
      }
      event.preventDefault();
      if (distance < DRAG_START_PX) return;
      beginDrag(pressTarget, event, pressKind);
      if (!dragging) return;
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

  function handlePointerUp(event) {
    if (event.pointerId !== pointerId) return;
    const moved = pressMoved;
    const wasArmed = dragArmed;
    cancelPressTimer();
    if (dragging) {
      event.preventDefault();
      finishDrag(event);
    } else {
      clearPressState();
      if (moved || wasArmed) {
        event.preventDefault();
        suppressClickUntil = Date.now() + 350;
      }
      try { pressTarget?.releasePointerCapture(pointerId); } catch {}
    }
    pointerId = null;
    pressTarget = null;
    pressKind = "";
    pressMoved = false;
    dragArmed = false;
  }

  function handlePointerCancel(event) {
    if (event.pointerId !== pointerId) return;
    const cancelledNavigationGesture = Boolean(pressTarget) && !editing;
    cancelPressTimer();
    if (dragging) {
      finishDrag({ clientX: lastX, clientY: lastY });
    } else {
      clearPressState();
      try { pressTarget?.releasePointerCapture(pointerId); } catch {}
    }
    if (cancelledNavigationGesture) suppressClickUntil = Date.now() + 700;
    pointerId = null;
    pressTarget = null;
    pressKind = "";
    pressMoved = false;
    dragArmed = false;
  }

  function cycleWidgetSize(id) {
    const widget = root.querySelector(`[data-home-widget-id="${id}"]`);
    if (!widget) return;
    const current = normalizeWidgetSize(widget.dataset.homeWidgetSize, id);
    const index = WIDGET_SIZE_ORDER.indexOf(current);
    const next = WIDGET_SIZE_ORDER[(index + 1) % WIDGET_SIZE_ORDER.length];
    applyWidgetSize(widget, next);
    const page = widget.closest(".mobile-home-page");
    const token = widgetToken(id);
    const placements = placementsForPage(page).filter((entry) => entry.token !== token);
    const free = findNearestFreePlacement(placements, token, { row: Number(widget.dataset.homeRow) || 1, col: Number(widget.dataset.homeCol) || 1 }, {
      widgetSizes: currentWidgetSizes(root),
      occupiedTokens: visibleTokensForPage(page),
    });
    if (free) applyPlacementStyle(widget, free, currentWidgetSizes(root));
    refreshPageSlots(root, editing);
    persistHomeLayout();
    updatePageIndicator();
    updateViewportHeight();
  }

  function removeWidget(id) {
    const widget = root.querySelector(`[data-home-widget-id="${id}"]`);
    if (!widget) return;
    widget.hidden = true;
    syncConfirmationBanner();
    persistHomeLayout();
    refreshWidgetPicker(root);
    updatePageIndicator();
    updateViewportHeight();
  }

  function addWidget(id) {
    let widget = root.querySelector(`[data-home-widget-id="${id}"]`);
    if (!widget && id === "checkpoint") {
      widget = makeWidgetShell(createCheckpointWidget(context.services), "checkpoint");
      pageContainers(currentPageElement()).grid?.append(widget);
    }
    if (!widget) return;
    widget.hidden = false;
    widget.removeAttribute("hidden");
    widget.style.removeProperty("display");
    syncConfirmationBanner();
    const page = currentPageElement();
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
    persistHomeLayout();
    closeWidgetPicker();
    updatePageIndicator();
    updateViewportHeight();
  }

  function addHomeApp(id) {
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

  function handleWidgetPickerPointerUp(event) {
    const appOption = event.target.closest("[data-home-app-add-id]");
    if (appOption) {
      event.preventDefault();
      event.stopPropagation();
      addHomeApp(appOption.dataset.homeAppAddId);
      return;
    }
    const option = event.target.closest("[data-home-widget-add-id]");
    if (!option) return;
    event.preventDefault();
    event.stopPropagation();
    addWidget(option.dataset.homeWidgetAddId);
  }

  function handleSelectStart(event) {
    if (event.target.closest('input, textarea, [contenteditable="true"]')) return;
    event.preventDefault();
  }

  function createLaunchSurface(launcher) {
    const icon = launcher.querySelector(".mobile-home-app__icon, .mobile-home-dock__icon");
    if (!(icon instanceof HTMLElement)) return null;
    const rect = icon.getBoundingClientRect();
    if (!(rect.width > 0) || !(rect.height > 0)) return null;

    const iconStyle = getComputedStyle(icon);
    const surface = document.createElement("div");
    surface.className = "mobile-home-launch-surface";
    surface.setAttribute("aria-hidden", "true");
    surface.style.setProperty("--launch-left", `${rect.left}px`);
    surface.style.setProperty("--launch-top", `${rect.top}px`);
    surface.style.setProperty("--launch-width", `${rect.width}px`);
    surface.style.setProperty("--launch-height", `${rect.height}px`);
    surface.style.setProperty("--launch-radius", iconStyle.borderRadius || "17px");
    surface.style.setProperty("--launch-start-color", iconStyle.backgroundColor || "var(--color-surface)");

    const glyph = document.createElement("span");
    glyph.className = "mobile-home-launch-surface__glyph";
    glyph.innerHTML = icon.innerHTML;
    surface.append(glyph);
    document.body.append(surface);

    const removeSurface = () => surface.remove();
    const handleSurfaceAnimationEnd = (event) => {
      if (event.target !== surface) return;
      surface.removeEventListener("animationend", handleSurfaceAnimationEnd);
      removeSurface();
    };
    surface.addEventListener("animationend", handleSurfaceAnimationEnd);
    globalThis.setTimeout(removeSurface, LAUNCH_ANIMATION_MS + 180);
    return surface;
  }

  function openHomeLauncher(launcher) {
    if (editing) return;
    const href = String(launcher?.dataset?.homeHref || "");
    if (!href.startsWith("#/")) return;
    if (root.classList.contains("is-home-launching")) return;

    const navigate = () => {
      launchTimer = null;
      const [targetScreen, rawQuery = ""] = href.slice(2).split("?");
      if (context.router?.navigateToScreen && targetScreen) {
        context.router.navigateToScreen(targetScreen, new URLSearchParams(rawQuery));
        return;
      }
      globalThis.location.replace(href);
    };
    const reduceMotion = globalThis.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
    if (reduceMotion) {
      navigate();
      return;
    }

    const item = launcher.closest("[data-home-item-id]") || launcher;
    rememberMobileHomeLaunch(item.dataset.homeItemId || "");
    const surface = createLaunchSurface(launcher);
    if (!surface) {
      navigate();
      return;
    }
    root.classList.add("is-home-launching");
    item.classList.add("is-home-launch-target");
    launcher.setAttribute("aria-busy", "true");
    launchTimer = setTimeout(navigate, LAUNCH_NAVIGATION_MS);
  }

  function handleClick(event) {
    const pageTarget = event.target.closest("[data-home-page-target]");
    if (pageTarget) {
      event.preventDefault();
      setActivePage(Number(pageTarget.dataset.homePageTarget), { smooth: true, persist: true });
      return;
    }
    if (event.target.closest("[data-home-page-add]")) {
      event.preventDefault();
      if (editing) addPage();
      return;
    }
    if (event.target.closest("[data-home-page-remove]")) {
      event.preventDefault();
      if (editing) removeCurrentPage();
      return;
    }
    if (event.target.closest("[data-home-edit-toggle]")) {
      event.preventDefault();
      setEditing(!editing);
      return;
    }
    if (event.target.closest("[data-home-widget-add]")) {
      event.preventDefault();
      if (editing) openWidgetPicker();
      return;
    }
    const size = event.target.closest("[data-home-widget-resize]");
    if (size) {
      event.preventDefault();
      if (editing) cycleWidgetSize(size.dataset.homeWidgetResize);
      return;
    }
    const remove = event.target.closest("[data-home-widget-remove]");
    if (remove) {
      event.preventDefault();
      if (editing) removeWidget(remove.dataset.homeWidgetRemove);
      return;
    }
    const appRemove = event.target.closest("[data-home-app-remove]");
    if (appRemove) {
      event.preventDefault();
      event.stopPropagation();
      if (editing) removeHomeApp(appRemove.closest("[data-home-item-id]")?.dataset.homeItemId || "");
      return;
    }
    const appAdd = event.target.closest("[data-home-app-add-id]");
    if (appAdd) {
      event.preventDefault();
      addHomeApp(appAdd.dataset.homeAppAddId);
      return;
    }
    const add = event.target.closest("[data-home-widget-add-id]");
    if (add) {
      event.preventDefault();
      addWidget(add.dataset.homeWidgetAddId);
      return;
    }
    if (event.target.closest("[data-home-widget-picker-close]")) {
      event.preventDefault();
      closeWidgetPicker();
      return;
    }
    const navigationSurface = event.target.closest("[data-home-launch], [data-home-widget-id]");
    if (navigationSurface && (editing || Date.now() < suppressClickUntil)) {
      event.preventDefault();
      event.stopPropagation();
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
  }

  function handleContextMenu(event) {
    event.preventDefault();
  }

  function handleDragStart(event) {
    if (event.target.closest("[data-home-item-id], [data-home-widget-id]")) event.preventDefault();
  }

  function isPageSwipeBlockedTarget(target) {
    return Boolean(target?.closest?.("button, input, textarea, select, [contenteditable=\"true\"], [data-home-widget-picker]"));
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
    if (!editing) return;
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
  }

  function claimPageSwipe() {
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
      try { viewport.setPointerCapture(event.pointerId); } catch {}
      root.classList.add("is-home-page-swiping");
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
    const crossed = Math.abs(dx) >= Math.min(56, width * 0.12) || velocity >= 0.28;
    let target = activePage;
    if (!cancelled && pageSwipeHorizontal && crossed) target += dx < 0 ? 1 : -1;
    else if (pageSwipeHorizontal) target = Math.round(viewport.scrollLeft / width);
    target = Math.max(0, Math.min(pageElements(root).length - 1, target));
    if (pageSwipeHorizontal) {
      event.preventDefault();
      suppressClickUntil = Date.now() + 700;
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

  function handlePageScroll() {
    if (scrollFrame) cancelAnimationFrame(scrollFrame);
    scrollFrame = requestAnimationFrame(() => {
      scrollFrame = null;
      if (!viewport.clientWidth || dragging || dragArmed || pageSwipePointerId != null || pageAnimationFrame) return;
      const expectedLeft = activePage * viewport.clientWidth;
      if (!editing && Math.abs(viewport.scrollLeft - expectedLeft) > 4) suppressClickUntil = Date.now() + 700;
      const index = Math.round(viewport.scrollLeft / viewport.clientWidth);
      const bounded = Math.max(0, Math.min(pageElements(root).length - 1, index));
      if (bounded !== activePage) {
        activePage = bounded;
        updatePageIndicator();
        updateViewportHeight();
        writeLayout(root, dockContainer, activePage);
      }
    });
  }

  function handleKeyDown(event) {
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

  viewport.addEventListener("pointerdown", handlePagePointerDown);
  viewport.addEventListener("pointermove", handlePagePointerMove, { passive: false });
  viewport.addEventListener("pointerup", handlePagePointerUp);
  viewport.addEventListener("pointercancel", handlePagePointerCancel);
  viewport.addEventListener("scroll", handlePageScroll, { passive: true });
  widgetPicker?.addEventListener("pointerup", handleWidgetPickerPointerUp);
  root.addEventListener("pointerdown", handlePointerDown);
  root.addEventListener("pointermove", handlePointerMove, { passive: false });
  root.addEventListener("pointerup", handlePointerUp);
  root.addEventListener("pointercancel", handlePointerCancel);
  root.addEventListener("click", handleClick, true);
  root.addEventListener("contextmenu", handleContextMenu);
  root.addEventListener("selectstart", handleSelectStart);
  root.addEventListener("dragstart", handleDragStart);
  document.addEventListener("keydown", handleKeyDown);
  setActivePage(activePage, { smooth: false });
  updatePageIndicator();

  return () => {
    cancelPendingPress();
    ghost?.remove();
    clearEdgePaging();
    if (scrollFrame) cancelAnimationFrame(scrollFrame);
    cancelPageAnimation();
    resetPageSwipe();
    if (launchTimer) clearTimeout(launchTimer);
    viewport.removeEventListener("pointerdown", handlePagePointerDown);
    viewport.removeEventListener("pointermove", handlePagePointerMove);
    viewport.removeEventListener("pointerup", handlePagePointerUp);
    viewport.removeEventListener("pointercancel", handlePagePointerCancel);
    viewport.removeEventListener("scroll", handlePageScroll);
    widgetPicker?.removeEventListener("pointerup", handleWidgetPickerPointerUp);
    root.removeEventListener("pointerdown", handlePointerDown);
    root.removeEventListener("pointermove", handlePointerMove);
    root.removeEventListener("pointerup", handlePointerUp);
    root.removeEventListener("pointercancel", handlePointerCancel);
    root.removeEventListener("click", handleClick, true);
    root.removeEventListener("contextmenu", handleContextMenu);
    root.removeEventListener("selectstart", handleSelectStart);
    root.removeEventListener("dragstart", handleDragStart);
    document.removeEventListener("keydown", handleKeyDown);
    if (typeof cleanupHub === "function") cleanupHub();
  };
}
