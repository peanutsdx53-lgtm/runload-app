import {
  HOME_COLUMNS,
  HOME_MAX_ROWS,
  HOME_MIN_ROWS,
  findNearestFreePlacement,
  footprintForToken,
  normalizePlacement,
  placementIsFree,
  usedRowCount,
} from "./mobileHomeGridModel.js";
import { buildSelfUnderstandingView } from "../../core/selfUnderstandingCore.js";

export const MAX_HOME_PAGES = 4;

const STORAGE_KEY = "running-record-mobile-home-layout-v1";
const POSITION_STORAGE_KEY = "running-record-mobile-home-positions-v1";
const WIDGET_STORAGE_KEY = "running-record-mobile-home-widgets-v1";
export const DEFAULT_LAYOUT = Object.freeze({
  pages: Object.freeze([Object.freeze(["simulation", "plan", "reading", "share", "settings"])]),
  dock: Object.freeze(["record", "measure", "history", "course"]),
  activePage: 0,
});

export const WIDGET_CATALOG = Object.freeze([
  Object.freeze({ id: "today", label: "今日", description: "今日の記録" }),
  Object.freeze({ id: "plan", label: "次の予定", description: "保存した予定" }),
  Object.freeze({ id: "changes", label: "最近の変化", description: "履歴と推移" }),
  Object.freeze({ id: "checkpoint", label: "次回見ること", description: "自分で続けて見ること" }),
]);
const DEFAULT_WIDGET_ORDER = Object.freeze(WIDGET_CATALOG.map((item) => item.id));
const DEFAULT_WIDGET_VISIBLE = Object.freeze(["today", "plan"]);
const WIDGET_ID_SET = new Set(DEFAULT_WIDGET_ORDER);
export const WIDGET_SIZE_ORDER = Object.freeze(["small", "medium", "large"]);
const WIDGET_SIZE_SET = new Set(WIDGET_SIZE_ORDER);
const DEFAULT_WIDGET_SIZES = Object.freeze({
  today: "medium",
  plan: "small",
  changes: "small",
  checkpoint: "small",
});
const WIDGET_SIZE_LABELS = Object.freeze({ small: "小", medium: "中", large: "大" });

export const HOME_APP_CATALOG = Object.freeze([
  Object.freeze({ id: "simulation", label: "条件比較", description: "条件を変えて比較" }),
  Object.freeze({ id: "plan", label: "予定", description: "次の予定を作成・確認" }),
  Object.freeze({ id: "reading", label: "読みもの", description: "走行に関する情報を確認" }),
  Object.freeze({ id: "share", label: "共有", description: "記録を共有用に整理" }),
  Object.freeze({ id: "settings", label: "設定", description: "表示や共有情報を設定" }),
  Object.freeze({ id: "record", label: "記録", description: "走行・休養を記録" }),
  Object.freeze({ id: "measure", label: "測定", description: "GPSで走行を測定" }),
  Object.freeze({ id: "history", label: "履歴", description: "保存した記録を確認" }),
  Object.freeze({ id: "course", label: "コース", description: "コースを保存・確認" }),
  Object.freeze({ id: "departure-check", label: "出発チェック", description: "出発前の準備を確認" }),
  Object.freeze({ id: "pace-tool", label: "ペース換算", description: "距離と時間からペースを換算" }),
]);

const ITEM_ID_BY_HREF = Object.freeze([
  ["#/simulation", "simulation"],
  ["#/plan", "plan"],
  ["#/reading", "reading"],
  ["#/consultation", "share"],
  ["#/settings", "settings"],
  ["#/departure-check", "departure-check"],
  ["#/pace-tool", "pace-tool"],
  ["#/record-input", "record"],
  ["#/run-measurement", "measure"],
  ["#/history", "history"],
  ["#/course-library", "course"],
]);

const ALL_ITEM_IDS = Object.freeze(HOME_APP_CATALOG.map((item) => item.id));
export const ALL_ITEM_ID_SET = new Set(ALL_ITEM_IDS);

const APP_TOKEN_PREFIX = "app:";
const WIDGET_TOKEN_PREFIX = "widget:";

export function appToken(id) {
  return `${APP_TOKEN_PREFIX}${id}`;
}

export function widgetToken(id) {
  return `${WIDGET_TOKEN_PREFIX}${id}`;
}

export function gridTokenForElement(element) {
  const appId = element?.dataset?.homeItemId || "";
  if (appId) return appToken(appId);
  const widgetId = element?.dataset?.homeWidgetId || "";
  if (widgetId) return widgetToken(widgetId);
  return "";
}

export function currentWidgetSizes(root) {
  return Object.fromEntries([...root.querySelectorAll("[data-home-widget-id]")].map((item) => [
    item.dataset.homeWidgetId,
    item.dataset.homeWidgetSize || DEFAULT_WIDGET_SIZES[item.dataset.homeWidgetId] || "small",
  ]));
}

export function visibleTokensForPage(page) {
  const tokens = [];
  page?.querySelectorAll("[data-home-item-id]").forEach((item) => tokens.push(appToken(item.dataset.homeItemId)));
  page?.querySelectorAll("[data-home-widget-id]:not([hidden])").forEach((item) => tokens.push(widgetToken(item.dataset.homeWidgetId)));
  return new Set(tokens);
}

export function placementsForPage(page) {
  const placements = [];
  page?.querySelectorAll("[data-home-item-id], [data-home-widget-id]").forEach((item) => {
    const token = gridTokenForElement(item);
    if (!token) return;
    placements.push({ token, row: Number(item.dataset.homeRow) || 1, col: Number(item.dataset.homeCol) || 1 });
  });
  return placements;
}

export function applyPlacementStyle(element, placement, widgetSizes) {
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
      const occupiedTokens = visibleTokensForPage(page);
      const placements = [];
      const pending = [];
      [...page.querySelectorAll("[data-home-item-id], [data-home-widget-id]")].forEach((element) => {
        const token = gridTokenForElement(element);
        if (!token) return;
        const explicitRow = Number(element.dataset.homeRow);
        const explicitCol = Number(element.dataset.homeCol);
        const hasExplicitPlacement = Number.isInteger(explicitRow) && explicitRow > 0 && Number.isInteger(explicitCol) && explicitCol > 0;
        if (!hasExplicitPlacement) {
          pending.push(token);
          return;
        }
        const footprint = footprintForToken(token, widgetSizes);
        const explicit = normalizePlacement({ row: explicitRow, col: explicitCol }, footprint);
        const exact = explicit.row === explicitRow && explicit.col === explicitCol;
        const free = exact && placementIsFree(placements, token, explicit, { widgetSizes, occupiedTokens });
        if (free) placements.push({ token, ...explicit });
        else pending.push(token);
      });
      pending.forEach((token) => {
        const free = findNearestFreePlacement(placements, token, { row: 1, col: 1 }, { widgetSizes, occupiedTokens });
        if (free) placements.push({ token, ...free });
      });
      return placements;
    }),
  };
}

export function readPositionLayout(root) {
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

export function writePositionLayout(root) {
  const layout = { version: 1, pages: pageElements(root).map(placementsForPage) };
  try {
    globalThis.localStorage?.setItem(POSITION_STORAGE_KEY, JSON.stringify(layout));
  } catch {
    // Position persistence is optional; ordered layout remains a fallback.
  }
}

export function applyPositionLayout(root, layout) {
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

export function refreshPageSlots(root, editing = false) {
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

function defaultGridLayout() {
  return {
    pages: [[
      ...DEFAULT_WIDGET_ORDER.map(widgetToken),
      ...DEFAULT_LAYOUT.pages[0].map(appToken),
    ]],
    dock: [...DEFAULT_LAYOUT.dock],
    activePage: 0,
  };
}

function itemIdFromHref(href = "") {
  return ITEM_ID_BY_HREF.find(([prefix]) => String(href).startsWith(prefix))?.[1] || "";
}

function widgetIdFromAnchor(anchor, index) {
  const href = String(anchor?.getAttribute("href") || "");
  if (href.startsWith("#/plan")) return "plan";
  if (href.startsWith("#/history")) return "changes";
  if (index === 0 || anchor?.classList.contains("mobile-home-widget--wide")) return "today";
  return "";
}

export function readLayout() {
  try {
    const parsed = JSON.parse(globalThis.localStorage?.getItem(STORAGE_KEY) || "null");
    if (!parsed || typeof parsed !== "object") return defaultGridLayout();

    const dock = Array.isArray(parsed.dock) ? parsed.dock.map(String) : [...DEFAULT_LAYOUT.dock];
    if (dock.length > DEFAULT_LAYOUT.dock.length || new Set(dock).size !== dock.length || !dock.every((id) => ALL_ITEM_ID_SET.has(id))) {
      return defaultGridLayout();
    }

    if (!Array.isArray(parsed.pages)) return defaultGridLayout();
    const pages = parsed.pages.slice(0, MAX_HOME_PAGES).map((page) => Array.isArray(page) ? page.map(String) : []);
    if (!pages.length) pages.push([]);

    const flattened = pages.flat();
    const appIds = [];
    const widgetIds = [];
    let validTokens = true;
    flattened.forEach((token) => {
      if (token.startsWith(APP_TOKEN_PREFIX)) {
        const id = token.slice(APP_TOKEN_PREFIX.length);
        if (!ALL_ITEM_ID_SET.has(id)) validTokens = false;
        else appIds.push(id);
      } else if (token.startsWith(WIDGET_TOKEN_PREFIX)) {
        const id = token.slice(WIDGET_TOKEN_PREFIX.length);
        if (!WIDGET_ID_SET.has(id)) validTokens = false;
        else widgetIds.push(id);
      } else {
        validTokens = false;
      }
    });
    const allApps = [...appIds, ...dock];
    if (!validTokens
      || new Set(allApps).size !== allApps.length
      || !allApps.every((id) => ALL_ITEM_ID_SET.has(id))
      || widgetIds.length !== DEFAULT_WIDGET_ORDER.length
      || new Set(widgetIds).size !== DEFAULT_WIDGET_ORDER.length
      || !widgetIds.every((id) => WIDGET_ID_SET.has(id))) {
      return defaultGridLayout();
    }

    const activeCandidate = Number(parsed.activePage);
    const activePage = Number.isInteger(activeCandidate)
      ? Math.max(0, Math.min(pages.length - 1, activeCandidate))
      : 0;
    return { pages, dock, activePage };
  } catch {
    return defaultGridLayout();
  }
}

export function readWidgetLayout() {
  try {
    const parsed = JSON.parse(globalThis.localStorage?.getItem(WIDGET_STORAGE_KEY) || "null");
    if (!parsed || typeof parsed !== "object") {
      return { order: [...DEFAULT_WIDGET_ORDER], visible: [...DEFAULT_WIDGET_VISIBLE], sizes: { ...DEFAULT_WIDGET_SIZES }, pageById: Object.fromEntries(DEFAULT_WIDGET_ORDER.map((id) => [id, 0])) };
    }
    const storedOrder = Array.isArray(parsed.order) ? parsed.order.map(String).filter((id) => WIDGET_ID_SET.has(id)) : [];
    const order = [...new Set(storedOrder)];
    DEFAULT_WIDGET_ORDER.forEach((id) => {
      if (!order.includes(id)) order.push(id);
    });
    const storedVisible = Array.isArray(parsed.visible) ? parsed.visible.map(String).filter((id) => WIDGET_ID_SET.has(id)) : [...DEFAULT_WIDGET_VISIBLE];
    const sizes = { ...DEFAULT_WIDGET_SIZES };
    if (parsed.sizes && typeof parsed.sizes === "object") {
      DEFAULT_WIDGET_ORDER.forEach((id) => {
        const size = String(parsed.sizes[id] || "");
        if (WIDGET_SIZE_SET.has(size)) sizes[id] = size;
      });
    }
    const pageById = Object.fromEntries(DEFAULT_WIDGET_ORDER.map((id) => [id, 0]));
    if (parsed.pageById && typeof parsed.pageById === "object") {
      DEFAULT_WIDGET_ORDER.forEach((id) => {
        const page = Number(parsed.pageById[id]);
        if (Number.isInteger(page) && page >= 0 && page < MAX_HOME_PAGES) pageById[id] = page;
      });
    }
    return { order, visible: [...new Set(storedVisible)], sizes, pageById };
  } catch {
    return { order: [...DEFAULT_WIDGET_ORDER], visible: [...DEFAULT_WIDGET_VISIBLE], sizes: { ...DEFAULT_WIDGET_SIZES }, pageById: Object.fromEntries(DEFAULT_WIDGET_ORDER.map((id) => [id, 0])) };
  }
}

export function writeLayout(root, dockContainer, activePage = 0) {
  const pages = pageElements(root).map((page) => {
    const grid = pageContainers(page).grid;
    return grid ? [...grid.children].map(gridTokenForElement).filter(Boolean) : [];
  });
  const layout = {
    version: 3,
    pages: pages.length ? pages : [[]],
    dock: [...dockContainer.querySelectorAll("[data-home-item-id]")].map((item) => item.dataset.homeItemId),
    activePage: Math.max(0, Math.min(Math.max(0, pages.length - 1), Number(activePage) || 0)),
  };
  try {
    globalThis.localStorage?.setItem(STORAGE_KEY, JSON.stringify(layout));
  } catch {
    // Layout persistence is optional; navigation remains usable without storage.
  }
}

export function writeWidgetLayout(root) {
  const widgets = [...root.querySelectorAll("[data-home-widget-id]")];
  const layout = {
    version: 2,
    order: widgets.map((item) => item.dataset.homeWidgetId),
    visible: widgets.filter((item) => !item.hidden).map((item) => item.dataset.homeWidgetId),
    sizes: Object.fromEntries(widgets.map((item) => [item.dataset.homeWidgetId, item.dataset.homeWidgetSize || DEFAULT_WIDGET_SIZES[item.dataset.homeWidgetId] || "small"])),
    pageById: Object.fromEntries(widgets.map((item) => [item.dataset.homeWidgetId, Number(item.closest(".mobile-home-page")?.dataset.homePageIndex || 0)])),
  };
  try {
    globalThis.localStorage?.setItem(WIDGET_STORAGE_KEY, JSON.stringify(layout));
  } catch {
    // Widget persistence is optional; the default home remains usable.
  }
}

export function setItemZone(item, zone) {
  const dock = zone === "dock";
  item.dataset.homeZone = zone;
  item.classList.toggle("mobile-home-app", !dock);
  item.classList.toggle("mobile-home-dock__item", dock);
  const icon = item.querySelector(".mobile-home-app__icon, .mobile-home-dock__icon");
  const label = item.querySelector(".mobile-home-app__label, .mobile-home-dock__label");
  icon?.classList.toggle("mobile-home-app__icon", !dock);
  icon?.classList.toggle("mobile-home-dock__icon", dock);
  label?.classList.toggle("mobile-home-app__label", !dock);
  label?.classList.toggle("mobile-home-dock__label", dock);
}

export function prepareItems(root) {
  root.querySelectorAll(".mobile-home-apps .mobile-home-app, .mobile-home-dock .mobile-home-dock__item, [data-home-app-catalog] .mobile-home-app").forEach((item) => {
    const href = item.querySelector("[data-home-launch]")?.dataset.homeHref || item.getAttribute("href") || item.querySelector("a[href]")?.getAttribute("href") || "";
    const id = itemIdFromHref(href);
    if (!id) return;
    item.dataset.homeItemId = id;
    item.dataset.homeZone = item.closest(".mobile-home-dock") ? "dock" : "apps";
    item.setAttribute("draggable", "false");
  });
}

function createHomePage(index) {
  const page = document.createElement("section");
  page.className = "mobile-home-page";
  page.dataset.homePageIndex = String(index);
  page.setAttribute("aria-label", `ホーム ${index + 1}ページ目`);
  const grid = document.createElement("div");
  grid.className = "mobile-home-grid";
  grid.setAttribute("aria-label", "ホーム配置");
  page.append(grid);
  return page;
}

export function syncPageIndices(root) {
  [...root.querySelectorAll(".mobile-home-page")].forEach((page, index) => {
    page.dataset.homePageIndex = String(index);
    page.setAttribute("aria-label", `ホーム ${index + 1}ページ目`);
  });
}

export function ensurePageScaffold(root) {
  let viewport = root.querySelector("[data-home-page-viewport]");
  if (viewport) return viewport;
  const widgets = root.querySelector(".mobile-home-widgets");
  const apps = root.querySelector(".mobile-home-apps");
  if (!widgets || !apps) return null;

  viewport = document.createElement("div");
  viewport.className = "mobile-home-page-viewport";
  viewport.dataset.homePageViewport = "";
  viewport.setAttribute("aria-label", "ホームページ");
  const track = document.createElement("div");
  track.className = "mobile-home-pages";
  track.dataset.homePages = "";
  const page = createHomePage(0);
  const grid = pageContainers(page).grid;

  widgets.before(viewport);
  [...widgets.children].forEach((child) => grid?.append(child));
  [...apps.children].forEach((child) => grid?.append(child));
  widgets.remove();
  apps.remove();

  track.append(page);
  viewport.append(track);
  const indicator = document.createElement("nav");
  indicator.className = "mobile-home-page-indicator";
  indicator.dataset.homePageIndicator = "";
  indicator.setAttribute("aria-label", "ホームページ切り替え");
  viewport.after(indicator);
  return viewport;
}

export function ensurePageCount(root, count) {
  const track = root.querySelector("[data-home-pages]");
  if (!track) return;
  const desired = Math.max(1, Math.min(MAX_HOME_PAGES, Number(count) || 1));
  while (track.querySelectorAll(".mobile-home-page").length < desired) {
    track.append(createHomePage(track.querySelectorAll(".mobile-home-page").length));
  }
  syncPageIndices(root);
}

export function pageElements(root) {
  return [...root.querySelectorAll(".mobile-home-page")];
}

export function pageContainers(page) {
  return {
    grid: page?.querySelector(".mobile-home-grid") || null,
  };
}

export function createCheckpointWidget(services) {
  const experiences = services?.workflows?.records?.loadAllExperiences?.() || [];
  const rofMap = new Map(experiences.filter((experience) => experience?.record?.activityType === "run").map((experience) => [experience.record.id, services?.fatigue?.summarizeRun?.(experience.record.id) || null]));
  const view = buildSelfUnderstandingView({ allExperiences: experiences, threads: services?.storage?.selfUnderstandingThreads?.loadAll?.() || [], rofSummariesByRecordId: rofMap });
  const themeWithNew = view.watching.find((item) => item.hasNewEligibleData) || null;
  const theme = themeWithNew || view.watching[0] || null;
  const checkpoint = theme?.title || "";
  const source = theme ? "theme" : "none";
  const anchor = document.createElement("a");
  anchor.className = `mobile-home-widget mobile-home-widget--checkpoint${checkpoint ? " has-checkpoint" : " is-empty"}`;
  anchor.dataset.checkpointSource = source;
  anchor.href = "#/history?view=checks";
  const small = document.createElement("small");
  small.textContent = "確認中";
  const strong = document.createElement("strong");
  strong.textContent = checkpoint || "未設定";
  const span = document.createElement("span");
  span.textContent = source === "theme" ? (theme.hasNewEligibleData ? `新しい記録 ${theme.newCount}件` : `比較できる記録 ${theme.eligibleCount}件`) : "結果を整理して、続けて見る点だけを残せます";
  anchor.append(small, strong, span);
  return anchor;
}

export function normalizeWidgetSize(size, id) {
  const candidate = String(size || "");
  if (WIDGET_SIZE_SET.has(candidate)) return candidate;
  return DEFAULT_WIDGET_SIZES[id] || "small";
}

export function applyWidgetSize(shell, size) {
  if (!shell) return;
  const id = shell.dataset.homeWidgetId || "";
  const normalized = normalizeWidgetSize(size, id);
  shell.dataset.homeWidgetSize = normalized;
  WIDGET_SIZE_ORDER.forEach((name) => shell.classList.toggle(`mobile-home-widget-shell--size-${name}`, name === normalized));
  const button = shell.querySelector("[data-home-widget-resize]");
  if (button) {
    const label = WIDGET_SIZE_LABELS[normalized] || normalized;
    button.textContent = label;
    button.setAttribute("aria-label", `${WIDGET_CATALOG.find((item) => item.id === id)?.label || "ウィジェット"}のサイズを変更（現在: ${label}）`);
  }
}

export function makeWidgetShell(anchor, id) {
  const shell = document.createElement("div");
  shell.className = "mobile-home-widget-shell";
  if (anchor.classList.contains("mobile-home-widget--wide")) shell.classList.add("mobile-home-widget-shell--wide");
  shell.dataset.homeWidgetId = id;
  anchor.setAttribute("draggable", "false");
  anchor.before(shell);
  shell.append(anchor);

  const remove = document.createElement("button");
  remove.type = "button";
  remove.className = "mobile-home-widget-remove";
  remove.dataset.homeWidgetRemove = id;
  remove.setAttribute("aria-label", `${WIDGET_CATALOG.find((item) => item.id === id)?.label || "ウィジェット"}をホームから外す`);
  remove.textContent = "−";
  shell.append(remove);

  const sizeButton = document.createElement("button");
  sizeButton.type = "button";
  sizeButton.className = "mobile-home-widget-size";
  sizeButton.dataset.homeWidgetResize = id;
  shell.append(sizeButton);
  applyWidgetSize(shell, DEFAULT_WIDGET_SIZES[id]);
  return shell;
}

export function prepareWidgets(widgetsContainer, services) {
  const existingAnchors = [...widgetsContainer.children].filter((node) => node.matches?.(".mobile-home-widget"));
  const dynamicSlots = ["plan", "changes"];
  let dynamicIndex = 0;
  existingAnchors.forEach((anchor, index) => {
    const isDynamic = Boolean(anchor.dataset.dynamicWidget);
    const id = isDynamic ? (dynamicSlots[dynamicIndex++] || "") : widgetIdFromAnchor(anchor, index);
    if (id) makeWidgetShell(anchor, id);
  });
  if (!widgetsContainer.querySelector('[data-home-widget-id="checkpoint"]')) {
    const checkpoint = makeWidgetShell(createCheckpointWidget(services), "checkpoint");
    checkpoint.hidden = true;
    widgetsContainer.append(checkpoint);
  }
}

export function applyLayout(root, dockContainer, layout = readLayout()) {
  ensurePageCount(root, layout.pages.length);
  const apps = new Map([...root.querySelectorAll("[data-home-item-id]")].map((item) => [item.dataset.homeItemId, item]));
  const widgets = new Map([...root.querySelectorAll("[data-home-widget-id]")].map((item) => [item.dataset.homeWidgetId, item]));

  layout.pages.forEach((tokens, pageIndex) => {
    const grid = pageContainers(pageElements(root)[pageIndex]).grid;
    if (!grid) return;
    tokens.forEach((token) => {
      if (token.startsWith(APP_TOKEN_PREFIX)) {
        const item = apps.get(token.slice(APP_TOKEN_PREFIX.length));
        if (!item) return;
        setItemZone(item, "apps");
        grid.append(item);
      } else if (token.startsWith(WIDGET_TOKEN_PREFIX)) {
        const widget = widgets.get(token.slice(WIDGET_TOKEN_PREFIX.length));
        if (widget) grid.append(widget);
      }
    });
  });

  layout.dock.forEach((id) => {
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
  return Math.max(0, Math.min(pageElements(root).length - 1, layout.activePage || 0));
}

export function applyWidgetLayout(root, layout = readWidgetLayout()) {
  const widgets = new Map([...root.querySelectorAll("[data-home-widget-id]")].map((item) => [item.dataset.homeWidgetId, item]));
  widgets.forEach((widget, id) => {
    widget.hidden = !layout.visible.includes(id);
    applyWidgetSize(widget, layout.sizes?.[id]);
  });
}

