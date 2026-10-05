import {
  homeGridTokenForElement as tokenForElement,
  matchesMobileHomeLayout as mobileLayoutMatches,
  readMobileHomeJson as readJson,
  writeMobileHomeJson as writeJson,
} from "./mobileHomeGridUtilities.js";

const POSITION_STORAGE_KEY = "running-record-mobile-home-positions-v1";
const LAYOUT_STORAGE_KEY = "running-record-mobile-home-layout-v1";
const WIDGET_STORAGE_KEY = "running-record-mobile-home-widgets-v1";
const MAX_ROWS = 3;
const COLUMNS = 4;
const MAX_PAGES = 4;
const DEFAULT_WIDGET_SIZES = Object.freeze({
  today: "medium",
  plan: "small",
  changes: "small",
  checkpoint: "small",
});

let repairQueued = false;
let repairing = false;

function widgetState() {
  const stored = readJson(WIDGET_STORAGE_KEY) || {};
  return {
    sizes: {
      ...DEFAULT_WIDGET_SIZES,
      ...(stored.sizes && typeof stored.sizes === "object" ? stored.sizes : {}),
    },
    visible: new Set(Array.isArray(stored.visible) ? stored.visible.map(String) : ["today", "plan", "changes"]),
  };
}

function widgetId(token) {
  return String(token).startsWith("widget:") ? String(token).slice(7) : "";
}

function footprint(token, sizes) {
  if (String(token).startsWith("app:")) return { columns: 1, rows: 1 };
  const size = String(sizes?.[widgetId(token)] || "small");
  if (size === "large") return { columns: 4, rows: 2 };
  if (size === "medium") return { columns: 4, rows: 1 };
  return { columns: 2, rows: 1 };
}

function tokenIsVisible(token, visibleWidgets) {
  const id = widgetId(token);
  return !id || visibleWidgets.has(id);
}

function normalizedPlacement(entry, token, sizes) {
  const size = footprint(token, sizes);
  return {
    row: Math.max(1, Math.min(MAX_ROWS - size.rows + 1, Number(entry?.row) || 1)),
    col: Math.max(1, Math.min(COLUMNS - size.columns + 1, Number(entry?.col) || 1)),
  };
}

function cellsFor(token, placement, sizes) {
  const size = footprint(token, sizes);
  const cells = [];
  for (let row = placement.row; row < placement.row + size.rows; row += 1) {
    for (let col = placement.col; col < placement.col + size.columns; col += 1) cells.push(`${row}:${col}`);
  }
  return cells;
}

function freeOnPage(page, token, desired, sizes, visibleWidgets) {
  const placement = normalizedPlacement(desired, token, sizes);
  const wanted = new Set(cellsFor(token, placement, sizes));
  for (const entry of page) {
    if (!tokenIsVisible(entry.token, visibleWidgets)) continue;
    if (cellsFor(entry.token, entry, sizes).some((cell) => wanted.has(cell))) return null;
  }
  return placement;
}

function firstFree(page, token, sizes, visibleWidgets) {
  const size = footprint(token, sizes);
  for (let row = 1; row <= MAX_ROWS - size.rows + 1; row += 1) {
    for (let col = 1; col <= COLUMNS - size.columns + 1; col += 1) {
      const found = freeOnPage(page, token, { row, col }, sizes, visibleWidgets);
      if (found) return found;
    }
  }
  return null;
}

function migrateStoredPositions() {
  const stored = readJson(POSITION_STORAGE_KEY);
  if (!stored || !Array.isArray(stored.pages)) return;
  const { sizes, visible } = widgetState();
  const output = Array.from({ length: Math.min(MAX_PAGES, Math.max(1, stored.pages.length)) }, () => []);
  const seen = new Set();

  stored.pages.slice(0, MAX_PAGES).forEach((entries, originalPage) => {
    const ordered = Array.isArray(entries) ? [...entries].sort((a, b) => (Number(a?.row) || 1) - (Number(b?.row) || 1) || (Number(a?.col) || 1) - (Number(b?.col) || 1)) : [];
    ordered.forEach((entry) => {
      const token = String(entry?.token || "");
      if (!token || seen.has(token)) return;
      seen.add(token);

      if (!tokenIsVisible(token, visible)) {
        output[Math.min(originalPage, output.length - 1)].push({ token, ...normalizedPlacement(entry, token, sizes) });
        return;
      }

      let placed = false;
      for (let pageIndex = originalPage; pageIndex < MAX_PAGES && !placed; pageIndex += 1) {
        while (output.length <= pageIndex) output.push([]);
        const desired = pageIndex === originalPage ? normalizedPlacement(entry, token, sizes) : { row: 1, col: 1 };
        const placement = freeOnPage(output[pageIndex], token, desired, sizes, visible)
          || firstFree(output[pageIndex], token, sizes, visible);
        if (!placement) continue;
        output[pageIndex].push({ token, ...placement });
        placed = true;
      }
    });
  });

  while (output.length > 1 && output.at(-1).length === 0) output.pop();
  writeJson(POSITION_STORAGE_KEY, { version: 1, pages: output });

  const layout = readJson(LAYOUT_STORAGE_KEY);
  if (!layout || !Array.isArray(layout.pages)) return;
  const pageByToken = new Map();
  output.forEach((entries, pageIndex) => entries.forEach((entry) => pageByToken.set(entry.token, pageIndex)));
  const pageCount = Math.max(1, output.length);
  const pages = Array.from({ length: pageCount }, () => []);
  layout.pages.flat().forEach((token) => {
    const text = String(token || "");
    const target = Math.min(pageCount - 1, pageByToken.get(text) ?? 0);
    if (text && !pages[target].includes(text)) pages[target].push(text);
  });
  writeJson(LAYOUT_STORAGE_KEY, { ...layout, pages, activePage: Math.min(Number(layout.activePage) || 0, pageCount - 1) });
}

function applyPlacement(element, placement, token, sizes) {
  const size = footprint(token, sizes);
  element.dataset.homeRow = String(placement.row);
  element.dataset.homeCol = String(placement.col);
  element.style.gridRow = `${placement.row} / span ${size.rows}`;
  element.style.gridColumn = `${placement.col} / span ${size.columns}`;
}

function syncPageIndices(root) {
  [...root.querySelectorAll(".mobile-home-page")].forEach((page, index) => {
    page.dataset.homePageIndex = String(index);
    page.setAttribute("aria-label", `ホーム ${index + 1}ページ目`);
  });
}

function createRepairPage(root) {
  const track = root.querySelector("[data-home-pages]");
  const pages = [...root.querySelectorAll(".mobile-home-page")];
  if (!track || pages.length >= MAX_PAGES) return null;

  const page = document.createElement("section");
  page.className = "mobile-home-page";
  page.dataset.homePageIndex = String(pages.length);
  page.setAttribute("aria-label", `ホーム ${pages.length + 1}ページ目`);

  const grid = document.createElement("div");
  grid.className = "mobile-home-grid";
  grid.setAttribute("aria-label", "ホーム配置");
  page.append(grid);
  track.append(page);
  syncPageIndices(root);
  return page;
}

function syncPassivePageIndicator(root) {
  if (root.classList.contains("is-home-editing")) return;
  const indicator = root.querySelector("[data-home-page-indicator]");
  if (!indicator) return;
  const pages = [...root.querySelectorAll(".mobile-home-page")];
  if (!pages.length) return;
  const layout = readJson(LAYOUT_STORAGE_KEY) || {};
  const activePage = Math.max(0, Math.min(pages.length - 1, Number(layout.activePage) || 0));

  indicator.hidden = false;
  indicator.replaceChildren();
  pages.forEach((page, index) => {
    const dot = document.createElement("button");
    dot.type = "button";
    dot.className = "mobile-home-page-dot";
    dot.dataset.homePageTarget = String(index);
    dot.setAttribute("aria-label", `${index + 1}ページ目へ移動`);
    dot.setAttribute("aria-current", index === activePage ? "page" : "false");
    indicator.append(dot);
  });
}

function persistDom(root) {
  const pages = [...root.querySelectorAll(".mobile-home-page")];
  writeJson(POSITION_STORAGE_KEY, {
    version: 1,
    pages: pages.map((page) => [...page.querySelectorAll("[data-home-item-id], [data-home-widget-id]")].flatMap((element) => {
      const token = tokenForElement(element);
      if (!token) return [];
      return [{ token, row: Number(element.dataset.homeRow) || 1, col: Number(element.dataset.homeCol) || 1 }];
    })),
  });

  const layout = readJson(LAYOUT_STORAGE_KEY) || {};
  writeJson(LAYOUT_STORAGE_KEY, {
    ...layout,
    version: 3,
    pages: pages.map((page) => [...page.querySelectorAll("[data-home-item-id], [data-home-widget-id]")].map(tokenForElement).filter(Boolean)),
    dock: [...root.querySelectorAll(".mobile-home-dock [data-home-item-id]")].map((item) => item.dataset.homeItemId),
    activePage: Math.min(Number(layout.activePage) || 0, Math.max(0, pages.length - 1)),
  });
}

function visiblePlacementsOnPage(page, ignoredElement, sizes, visible) {
  return [...page.querySelectorAll("[data-home-item-id], [data-home-widget-id]")].flatMap((item) => {
    if (item === ignoredElement || item.hidden) return [];
    const itemToken = tokenForElement(item);
    if (!itemToken || !tokenIsVisible(itemToken, visible)) return [];
    return [{ token: itemToken, row: Number(item.dataset.homeRow) || 1, col: Number(item.dataset.homeCol) || 1 }];
  });
}

function placeOverflowItem(root, element, token, startPage, sizes, visible) {
  let pages = [...root.querySelectorAll(".mobile-home-page")];

  for (let pageIndex = startPage; pageIndex < pages.length; pageIndex += 1) {
    const page = pages[pageIndex];
    const placement = firstFree(visiblePlacementsOnPage(page, element, sizes, visible), token, sizes, visible);
    if (!placement) continue;
    page.querySelector(".mobile-home-grid")?.append(element);
    applyPlacement(element, placement, token, sizes);
    return true;
  }

  while (pages.length < MAX_PAGES) {
    const page = createRepairPage(root);
    if (!page) break;
    pages = [...root.querySelectorAll(".mobile-home-page")];
    const placement = firstFree([], token, sizes, visible);
    if (!placement) continue;
    page.querySelector(".mobile-home-grid")?.append(element);
    applyPlacement(element, placement, token, sizes);
    return true;
  }

  return false;
}

function repairDomCapacity() {
  repairQueued = false;
  if (repairing || !mobileLayoutMatches()) return;
  const root = document.querySelector(".mobile-home-os");
  if (!root || root.classList.contains("is-home-drag-active")) return;
  const initialPages = [...root.querySelectorAll(".mobile-home-page")];
  if (!initialPages.length) return;

  repairing = true;
  try {
    const { sizes, visible } = widgetState();
    const invalid = [];
    initialPages.forEach((page, pageIndex) => {
      const accepted = [];
      [...page.querySelectorAll("[data-home-item-id], [data-home-widget-id]")].forEach((element) => {
        const token = tokenForElement(element);
        if (!token || !tokenIsVisible(token, visible) || element.hidden) return;
        const raw = { row: Number(element.dataset.homeRow), col: Number(element.dataset.homeCol) };
        const normalized = normalizedPlacement(raw, token, sizes);
        const exact = raw.row === normalized.row && raw.col === normalized.col;
        const free = exact ? freeOnPage(accepted, token, normalized, sizes, visible) : null;
        if (!free) invalid.push({ element, token, startPage: pageIndex });
        else accepted.push({ token, ...free });
      });
    });

    let changed = false;
    invalid.forEach(({ element, token, startPage }) => {
      if (placeOverflowItem(root, element, token, startPage, sizes, visible)) changed = true;
    });

    if (changed) {
      syncPageIndices(root);
      persistDom(root);
      syncPassivePageIndicator(root);
    }
  } finally {
    repairing = false;
  }
}

function queueRepair() {
  if (repairQueued) return;
  repairQueued = true;
  requestAnimationFrame(repairDomCapacity);
}

migrateStoredPositions();
const appRoot = document.getElementById("app");
if (appRoot && typeof MutationObserver === "function") {
  new MutationObserver(queueRepair).observe(appRoot, { childList: true, subtree: true, attributes: true, attributeFilter: ["data-home-row", "data-home-col", "data-home-widget-size", "hidden"] });
}
queueRepair();
