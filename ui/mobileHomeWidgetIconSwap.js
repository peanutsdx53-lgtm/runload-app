import {
  homeGridPlacementOf as placementOf,
  homeGridTokenForElement as gridToken,
  matchesMobileHomeLayout as mobileLayoutMatches,
  writeMobileHomeBatch,
} from "./mobileHomeGridUtilities.js";

const POSITION_STORAGE_KEY = "running-record-mobile-home-positions-v1";
const LAYOUT_STORAGE_KEY = "running-record-mobile-home-layout-v1";
const WIDGET_STORAGE_KEY = "running-record-mobile-home-widgets-v1";
const HOME_COLUMNS = 4;
const HOME_ROWS = 3;
const DEFAULT_WIDGET_SIZES = Object.freeze({ today: "medium", plan: "small", changes: "small", checkpoint: "small" });

let pointerId = null;
let root = null;
let source = null;
let sourcePage = null;
let sourcePlacement = null;

function footprintOf(element) {
  if (!element?.dataset?.homeWidgetId) return { columns: 1, rows: 1 };
  const size = String(element.dataset.homeWidgetSize || "small");
  if (size === "large") return { columns: 4, rows: 2 };
  if (size === "medium") return { columns: 4, rows: 1 };
  return { columns: 2, rows: 1 };
}

function normalizePlacement(placement, footprint) {
  return {
    row: Math.max(1, Math.min(HOME_ROWS - footprint.rows + 1, Number(placement?.row) || 1)),
    col: Math.max(1, Math.min(HOME_COLUMNS - footprint.columns + 1, Number(placement?.col) || 1)),
  };
}

function cellsFor(placement, footprint) {
  const cells = [];
  for (let row = placement.row; row < placement.row + footprint.rows; row += 1) {
    for (let col = placement.col; col < placement.col + footprint.columns; col += 1) {
      cells.push({ row, col });
    }
  }
  return cells;
}

function overlaps(leftPlacement, leftFootprint, rightPlacement, rightFootprint) {
  const leftBottom = leftPlacement.row + leftFootprint.rows - 1;
  const leftRight = leftPlacement.col + leftFootprint.columns - 1;
  const rightBottom = rightPlacement.row + rightFootprint.rows - 1;
  const rightRight = rightPlacement.col + rightFootprint.columns - 1;
  return leftPlacement.row <= rightBottom
    && leftBottom >= rightPlacement.row
    && leftPlacement.col <= rightRight
    && leftRight >= rightPlacement.col;
}

function applyPlacement(element, placement) {
  if (!element || !placement) return;
  const footprint = footprintOf(element);
  const normalized = normalizePlacement(placement, footprint);
  element.dataset.homeRow = String(normalized.row);
  element.dataset.homeCol = String(normalized.col);
  element.style.gridRow = `${normalized.row} / span ${footprint.rows}`;
  element.style.gridColumn = `${normalized.col} / span ${footprint.columns}`;
}

function pagesFor(homeRoot) {
  return [...homeRoot.querySelectorAll(".mobile-home-page")];
}

function pageIndex(homeRoot, page) {
  const explicit = Number(page?.dataset?.homePageIndex);
  if (Number.isInteger(explicit) && explicit >= 0) return explicit;
  return Math.max(0, pagesFor(homeRoot).indexOf(page));
}

function activePageIndex(homeRoot) {
  const currentDot = homeRoot.querySelector('.mobile-home-page-dot[aria-current="page"]');
  const explicit = Number(currentDot?.dataset?.homePageTarget);
  if (Number.isInteger(explicit) && explicit >= 0) return explicit;
  try {
    const stored = JSON.parse(globalThis.localStorage?.getItem(LAYOUT_STORAGE_KEY) || "null");
    const index = Number(stored?.activePage);
    if (Number.isInteger(index) && index >= 0) return index;
  } catch {
    // Use the first page when stored state cannot be read.
  }
  return 0;
}

function persist(homeRoot) {
  const pages = pagesFor(homeRoot);
  const allWidgets = [...homeRoot.querySelectorAll("[data-home-widget-id]")];
  const positionPages = pages.map((page) => [
    ...page.querySelectorAll("[data-home-item-id], [data-home-widget-id]"),
  ].flatMap((element) => {
    const token = gridToken(element);
    return token ? [{ token, ...placementOf(element) }] : [];
  }));
  const layoutPages = pages.map((page) => [
    ...page.querySelectorAll("[data-home-item-id], [data-home-widget-id]"),
  ].map(gridToken).filter(Boolean));
  const dock = [...homeRoot.querySelectorAll(".mobile-home-dock [data-home-item-id]")]
    .map((item) => item.dataset.homeItemId)
    .filter(Boolean);
  const widgetLayout = {
    version: 2,
    order: allWidgets.map((item) => item.dataset.homeWidgetId),
    visible: allWidgets.filter((item) => !item.hidden).map((item) => item.dataset.homeWidgetId),
    sizes: Object.fromEntries(allWidgets.map((item) => [item.dataset.homeWidgetId, item.dataset.homeWidgetSize || DEFAULT_WIDGET_SIZES[item.dataset.homeWidgetId] || "small"])),
    pageById: Object.fromEntries(allWidgets.map((item) => [
      item.dataset.homeWidgetId,
      pageIndex(homeRoot, item.closest(".mobile-home-page")),
    ])),
  };

  writeMobileHomeBatch([
    [POSITION_STORAGE_KEY, { version: 1, pages: positionPages }],
    [LAYOUT_STORAGE_KEY, {
      version: 3,
      pages: layoutPages.length ? layoutPages : [[]],
      dock,
      activePage: Math.max(0, Math.min(Math.max(0, pages.length - 1), activePageIndex(homeRoot))),
    }],
    [WIDGET_STORAGE_KEY, widgetLayout],
  ]);
}

function resetTracking() {
  pointerId = null;
  root = null;
  source = null;
  sourcePage = null;
  sourcePlacement = null;
}

function remember(event) {
  if (!mobileLayoutMatches()) return;
  if (event.pointerType === "mouse" && event.button !== 0) return;
  const homeRoot = event.target.closest?.(".mobile-home-os.is-home-editing") || null;
  const target = event.target.closest?.("[data-home-item-id], [data-home-widget-id]") || null;
  if (!homeRoot || !target || target.closest(".mobile-home-dock") || event.target.closest?.("button")) return;
  pointerId = event.pointerId;
  root = homeRoot;
  source = target;
  sourcePage = target.closest(".mobile-home-page");
  sourcePlacement = sourcePage ? placementOf(target) : null;
}

function adopt(event) {
  if (!mobileLayoutMatches()) return;
  const homeRoot = event.target.closest?.(".mobile-home-os.is-home-drag-active")
    || document.querySelector(".mobile-home-os.is-home-drag-active");
  const activeSource = homeRoot?.querySelector(
    ".is-home-dragging[data-home-item-id], .is-home-widget-dragging[data-home-widget-id]"
  ) || null;
  if (!homeRoot || !activeSource || activeSource.closest(".mobile-home-dock")) return;
  pointerId = event.pointerId;
  root = homeRoot;
  source = activeSource;
  sourcePage = activeSource.closest(".mobile-home-page");
  sourcePlacement = sourcePage ? placementOf(activeSource) : null;
}

function targetAt(event, homeRoot) {
  const pointTarget = document.elementFromPoint(event.clientX, event.clientY);
  return pointTarget?.closest?.("[data-home-item-id], [data-home-widget-id]")
    || homeRoot.querySelector(".is-home-drop-target[data-home-item-id], .is-home-widget-drop-target[data-home-widget-id]")
    || null;
}

function candidateFor(event) {
  if (!mobileLayoutMatches()) return null;
  if (pointerId !== event.pointerId || !root?.isConnected) adopt(event);
  if (pointerId !== event.pointerId || !root?.isConnected) return null;
  if (!root.classList.contains("is-home-drag-active")) return null;

  const liveSource = root.querySelector(
    ".is-home-dragging[data-home-item-id], .is-home-widget-dragging[data-home-widget-id]"
  ) || source;
  if (!liveSource || liveSource.closest(".mobile-home-dock")) return null;
  const target = targetAt(event, root);
  if (!target || target === liveSource || target.closest(".mobile-home-dock")) return null;

  const sourceIsWidget = Boolean(liveSource.dataset.homeWidgetId);
  const targetIsWidget = Boolean(target.dataset.homeWidgetId);
  const sourceIsApp = Boolean(liveSource.dataset.homeItemId);
  const targetIsApp = Boolean(target.dataset.homeItemId);
  if (!((sourceIsWidget && targetIsApp) || (sourceIsApp && targetIsWidget))) return null;

  const widget = sourceIsWidget ? liveSource : target;
  const app = sourceIsApp ? liveSource : target;
  const widgetPage = widget.closest(".mobile-home-page");
  const appPage = app.closest(".mobile-home-page");
  if (!widgetPage || !appPage) return null;

  const widgetOrigin = liveSource === widget && source === widget && sourcePage === widgetPage && sourcePlacement
    ? { ...sourcePlacement }
    : placementOf(widget);
  const appOrigin = liveSource === app && source === app && sourcePage === appPage && sourcePlacement
    ? { ...sourcePlacement }
    : placementOf(app);
  const widgetFootprint = footprintOf(widget);
  const widgetDestination = normalizePlacement(appOrigin, widgetFootprint);

  const conflicts = [...appPage.querySelectorAll("[data-home-item-id], [data-home-widget-id]:not([hidden])")]
    .filter((item) => item !== widget)
    .filter((item) => overlaps(widgetDestination, widgetFootprint, placementOf(item), footprintOf(item)));
  if (!conflicts.includes(app)) return null;
  if (conflicts.some((item) => !item.dataset.homeItemId || item.closest(".mobile-home-dock"))) return null;

  const fullOriginCells = cellsFor(normalizePlacement(widgetOrigin, widgetFootprint), widgetFootprint);
  const destinationCells = new Set(cellsFor(widgetDestination, widgetFootprint).map((cell) => `${cell.row}:${cell.col}`));
  const originCells = widgetPage === appPage
    ? fullOriginCells.filter((cell) => !destinationCells.has(`${cell.row}:${cell.col}`))
    : fullOriginCells;
  if (conflicts.length > originCells.length) return null;
  conflicts.sort((left, right) => {
    if (left === app) return -1;
    if (right === app) return 1;
    const a = placementOf(left);
    const b = placementOf(right);
    return a.row - b.row || a.col - b.col;
  });

  return {
    homeRoot: root,
    source: liveSource,
    widget,
    app,
    widgetPage,
    appPage,
    widgetDestination,
    originCells,
    conflicts,
  };
}

function sourceIdentity(element) {
  if (element?.dataset?.homeItemId) return { key: "homeItemId", value: element.dataset.homeItemId };
  if (element?.dataset?.homeWidgetId) return { key: "homeWidgetId", value: element.dataset.homeWidgetId };
  return null;
}

function finalize(candidate) {
  const { homeRoot, widget, app, widgetPage, appPage, widgetDestination, originCells, conflicts } = candidate;
  if (!homeRoot?.isConnected || !widget.isConnected || !app.isConnected) return;
  if (widget.closest(".mobile-home-dock") || app.closest(".mobile-home-dock")) return;
  const widgetGrid = widgetPage.querySelector(".mobile-home-grid");
  const appGrid = appPage.querySelector(".mobile-home-grid");
  if (!widgetGrid || !appGrid) return;

  appGrid.append(widget);
  applyPlacement(widget, widgetDestination);
  conflicts.forEach((item, index) => {
    widgetGrid.append(item);
    applyPlacement(item, originCells[index]);
  });
  persist(homeRoot);
}

function scheduleFinalization(candidate) {
  const identity = sourceIdentity(candidate.source);
  if (!identity) return false;

  // Hide the source token only for the remainder of the real pointerup event.
  // The existing drag core then performs its normal cleanup without also moving
  // the source into a free slot. The cross-type exchange is committed afterwards.
  delete candidate.source.dataset[identity.key];
  queueMicrotask(() => {
    candidate.source.dataset[identity.key] = identity.value;
    finalize(candidate);
  });
  return true;
}

function hideFreePlacementPreview(event) {
  if (pointerId !== event.pointerId || !root?.classList.contains("is-home-drag-active")) return;
  const activeSource = root.querySelector(
    ".is-home-dragging[data-home-item-id], .is-home-widget-dragging[data-home-widget-id]"
  );
  const target = targetAt(event, root);
  if (!activeSource || !target || target === activeSource) return;
  const crossType = Boolean(activeSource.dataset.homeWidgetId) !== Boolean(target.dataset.homeWidgetId);
  if (!crossType) return;
  root.querySelectorAll(".mobile-home-drop-preview").forEach((preview) => preview.remove());
}

function ensurePagingUnlocked(homeRoot) {
  if (!homeRoot?.isConnected) return;
  requestAnimationFrame(() => {
    const dragVisual = homeRoot.querySelector(".is-home-dragging, .is-home-widget-dragging");
    if (!dragVisual) homeRoot.classList.remove("is-home-drag-active");
  });
}

function handlePointerDown(event) {
  resetTracking();
  remember(event);
}

function handlePointerMove(event) {
  if (pointerId == null && document.querySelector(".mobile-home-os.is-home-drag-active")) adopt(event);
  hideFreePlacementPreview(event);
}

function handlePointerUp(event) {
  const homeRoot = root;
  const candidate = candidateFor(event);
  if (candidate) scheduleFinalization(candidate);
  resetTracking();
  ensurePagingUnlocked(homeRoot);
}

function handlePointerCancel() {
  const homeRoot = root;
  resetTracking();
  ensurePagingUnlocked(homeRoot);
}

document.addEventListener("pointerdown", handlePointerDown, true);
document.addEventListener("pointermove", handlePointerMove, false);
document.addEventListener("pointerup", handlePointerUp, true);
document.addEventListener("pointercancel", handlePointerCancel, true);
