import { bindMobileHomeHub } from "../mobileHomeHub.js";
import {
  HOME_COLUMNS,
  HOME_MAX_ROWS,
  HOME_MIN_ROWS,
  findNearestFreePlacement,
  footprintForToken,
  normalizePlacement,
  placementIsFree,
  usedRowCount,
} from "./homeGridModel.js";
import { rememberMobileHomeLaunch } from "../mobileHomeReturnTransition.js";
import { loadMobileQuickTools } from "../mobileQuickToolsStore.js";
import { buildSelfUnderstandingView } from "../../core/selfUnderstandingCore.js";

const STORAGE_KEY = "running-record-mobile-home-layout-v1";
const POSITION_STORAGE_KEY = "running-record-mobile-home-positions-v1";
const WIDGET_STORAGE_KEY = "running-record-mobile-home-widgets-v1";
const LONG_PRESS_MS = 380;
const EDIT_DRAG_ARM_MS = 180;
const LAUNCH_ANIMATION_MS = 360;
const LAUNCH_NAVIGATION_MS = 260;
const TAP_SLOP_PX = 8;
const DRAG_START_PX = 10;
const MAX_HOME_PAGES = 4;
const PAGE_EDGE_PX = 16;
const PAGE_EDGE_DELAY_MS = 850;

const DEFAULT_LAYOUT = Object.freeze({
  pages: Object.freeze([Object.freeze(["simulation", "plan", "reading", "share", "settings"])]),
  dock: Object.freeze(["record", "measure", "history", "course"]),
  activePage: 0,
});

const WIDGET_CATALOG = Object.freeze([
  Object.freeze({ id: "today", label: "今日", description: "今日の記録" }),
  Object.freeze({ id: "plan", label: "次の予定", description: "保存した予定" }),
  Object.freeze({ id: "changes", label: "最近の変化", description: "履歴と推移" }),
  Object.freeze({ id: "checkpoint", label: "次回見ること", description: "自分で続けて見ること" }),
]);
const DEFAULT_WIDGET_ORDER = Object.freeze(WIDGET_CATALOG.map((item) => item.id));
const DEFAULT_WIDGET_VISIBLE = Object.freeze(["today", "plan"]);
const WIDGET_ID_SET = new Set(DEFAULT_WIDGET_ORDER);
const WIDGET_SIZE_ORDER = Object.freeze(["small", "medium", "large"]);
const WIDGET_SIZE_SET = new Set(WIDGET_SIZE_ORDER);
const DEFAULT_WIDGET_SIZES = Object.freeze({
  today: "medium",
  plan: "small",
  changes: "small",
  checkpoint: "small",
});
const WIDGET_SIZE_LABELS = Object.freeze({ small: "小", medium: "中", large: "大" });

const HOME_APP_CATALOG = Object.freeze([
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
]);

const ITEM_ID_BY_HREF = Object.freeze([
  ["#/simulation", "simulation"],
  ["#/plan", "plan"],
  ["#/reading", "reading"],
  ["#/consultation", "share"],
  ["#/settings", "settings"],
  ["#/location-note", "location-note"],
  ["#/quick-note", "quick-note"],
  ["#/gear-note", "gear-note"],
  ["#/departure-check", "departure-check"],
  ["#/fuel-note", "fuel-note"],
  ["#/photo-note", "photo-note"],
  ["#/pace-tool", "pace-tool"],
  ["#/record-input", "record"],
  ["#/run-measurement", "measure"],
  ["#/history", "history"],
  ["#/course-library", "course"],
]);

const ALL_ITEM_IDS = Object.freeze(HOME_APP_CATALOG.map((item) => item.id));
const ALL_ITEM_ID_SET = new Set(ALL_ITEM_IDS);

const APP_TOKEN_PREFIX = "app:";
const WIDGET_TOKEN_PREFIX = "widget:";

function appToken(id) {
  return `${APP_TOKEN_PREFIX}${id}`;
}

function widgetToken(id) {
  return `${WIDGET_TOKEN_PREFIX}${id}`;
}

function gridTokenForElement(element) {
  const appId = element?.dataset?.homeItemId || "";
  if (appId) return appToken(appId);
  const widgetId = element?.dataset?.homeWidgetId || "";
  if (widgetId) return widgetToken(widgetId);
  return "";
}

function currentWidgetSizes(root) {
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

function readLayout() {
  try {
    const parsed = JSON.parse(globalThis.localStorage?.getItem(STORAGE_KEY) || "null");
    if (!parsed || typeof parsed !== "object") return defaultGridLayout();

    const dock = Array.isArray(parsed.dock) ? parsed.dock.map(String) : [...DEFAULT_LAYOUT.dock];
    if (dock.length > DEFAULT_LAYOUT.dock.length || new Set(dock).size !== dock.length || !dock.every((id) => ALL_ITEM_ID_SET.has(id))) {
      return defaultGridLayout();
    }

    const sourcePages = Array.isArray(parsed.pages)
      ? parsed.pages.slice(0, MAX_HOME_PAGES).map((page) => Array.isArray(page) ? page.map(String) : [])
      : [Array.isArray(parsed.apps) ? parsed.apps.map(String) : []];
    if (!sourcePages.length) sourcePages.push([]);

    const flattened = sourcePages.flat();
    const hasGridTokens = flattened.some((token) => token.startsWith(APP_TOKEN_PREFIX) || token.startsWith(WIDGET_TOKEN_PREFIX));
    let pages = sourcePages;

    if (hasGridTokens) {
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
    } else {
      const legacyApps = flattened;
      const allApps = [...legacyApps, ...dock];
      if (new Set(allApps).size !== allApps.length
        || !allApps.every((id) => ALL_ITEM_ID_SET.has(id))) {
        return defaultGridLayout();
      }
      const widgetLayout = readWidgetLayout();
      const maxWidgetPage = Math.max(0, ...Object.values(widgetLayout.pageById || {}).map((value) => Number(value) || 0));
      const pageCount = Math.max(1, sourcePages.length, maxWidgetPage + 1);
      pages = Array.from({ length: Math.min(MAX_HOME_PAGES, pageCount) }, () => []);
      widgetLayout.order.forEach((id) => {
        const pageIndex = Math.max(0, Math.min(pages.length - 1, Number(widgetLayout.pageById?.[id]) || 0));
        pages[pageIndex].push(widgetToken(id));
      });
      sourcePages.forEach((ids, pageIndex) => {
        if (!pages[pageIndex]) return;
        ids.forEach((id) => pages[pageIndex].push(appToken(id)));
      });
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

function readWidgetLayout() {
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

function writeLayout(root, dockContainer, activePage = 0) {
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

function writeWidgetLayout(root) {
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

function setItemZone(item, zone) {
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

function prepareItems(root) {
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

function syncPageIndices(root) {
  [...root.querySelectorAll(".mobile-home-page")].forEach((page, index) => {
    page.dataset.homePageIndex = String(index);
    page.setAttribute("aria-label", `ホーム ${index + 1}ページ目`);
  });
}

function ensurePageScaffold(root) {
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

function ensurePageCount(root, count) {
  const track = root.querySelector("[data-home-pages]");
  if (!track) return;
  const desired = Math.max(1, Math.min(MAX_HOME_PAGES, Number(count) || 1));
  while (track.querySelectorAll(".mobile-home-page").length < desired) {
    track.append(createHomePage(track.querySelectorAll(".mobile-home-page").length));
  }
  syncPageIndices(root);
}

function pageElements(root) {
  return [...root.querySelectorAll(".mobile-home-page")];
}

function pageContainers(page) {
  return {
    grid: page?.querySelector(".mobile-home-grid") || null,
  };
}

function createCheckpointWidget(services) {
  const experiences = services?.workflows?.records?.loadAllExperiences?.() || [];
  const rofMap = new Map(experiences.filter((experience) => experience?.record?.activityType === "run").map((experience) => [experience.record.id, services?.fatigue?.summarizeRun?.(experience.record.id) || null]));
  const view = buildSelfUnderstandingView({ allExperiences: experiences, threads: services?.storage?.selfUnderstandingThreads?.loadAll?.() || [], rofSummariesByRecordId: rofMap });
  const themeWithNew = view.watching.find((item) => item.hasNewEligibleData) || null;
  const theme = themeWithNew || view.watching[0] || null;
  const quickCheckpoint = loadMobileQuickTools().quickNotes
    .map((item) => String(item?.next || "").trim())
    .find(Boolean) || "";
  const checkpoint = theme?.title || quickCheckpoint;
  const source = theme ? "theme" : quickCheckpoint ? "quick" : "none";
  const anchor = document.createElement("a");
  anchor.className = `mobile-home-widget mobile-home-widget--checkpoint${checkpoint ? " has-checkpoint" : " is-empty"}`;
  anchor.dataset.checkpointSource = source;
  anchor.href = source === "theme" ? "#/history?view=checks" : source === "quick" ? "#/quick-note" : "#/history?view=checks";
  const small = document.createElement("small");
  small.textContent = "確認中";
  const strong = document.createElement("strong");
  strong.textContent = checkpoint || "未設定";
  const span = document.createElement("span");
  span.textContent = source === "theme" ? (theme.hasNewEligibleData ? `新しい記録 ${theme.newCount}件` : `比較できる記録 ${theme.eligibleCount}件`) : source === "quick" ? "1分メモの内容" : "結果を整理して、続けて見る点だけを残せます";
  anchor.append(small, strong, span);
  return anchor;
}

function normalizeWidgetSize(size, id) {
  const candidate = String(size || "");
  if (WIDGET_SIZE_SET.has(candidate)) return candidate;
  return DEFAULT_WIDGET_SIZES[id] || "small";
}

function applyWidgetSize(shell, size) {
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

function makeWidgetShell(anchor, id) {
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

function prepareWidgets(widgetsContainer, services) {
  const existingAnchors = [...widgetsContainer.children].filter((node) => node.matches?.(".mobile-home-widget"));
  existingAnchors.forEach((anchor, index) => {
    const id = widgetIdFromAnchor(anchor, index);
    if (id) makeWidgetShell(anchor, id);
  });
  if (!widgetsContainer.querySelector('[data-home-widget-id="checkpoint"]')) {
    const checkpoint = makeWidgetShell(createCheckpointWidget(services), "checkpoint");
    checkpoint.hidden = true;
    widgetsContainer.append(checkpoint);
  }
}

function applyLayout(root, dockContainer, layout = readLayout()) {
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

function applyWidgetLayout(root, layout = readWidgetLayout()) {
  const widgets = new Map([...root.querySelectorAll("[data-home-widget-id]")].map((item) => [item.dataset.homeWidgetId, item]));
  widgets.forEach((widget, id) => {
    widget.hidden = !layout.visible.includes(id);
    applyWidgetSize(widget, layout.sizes?.[id]);
  });
}

function ensureEditControls(root) {
  const status = root.querySelector(".mobile-home-os__status");
  if (status && !status.matches("button")) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = status.className;
    button.dataset.homeEditToggle = "";
    button.setAttribute("aria-pressed", "false");
    button.textContent = "編集";
    status.replaceWith(button);
  }

  const editButton = root.querySelector("[data-home-edit-toggle]");
  if (!editButton) return;
  let actions = root.querySelector(".mobile-home-os__edit-actions");
  if (!actions) {
    actions = document.createElement("div");
    actions.className = "mobile-home-os__edit-actions";
    editButton.before(actions);
    actions.append(editButton);
  }
  if (!actions.querySelector("[data-home-widget-add]")) {
    const addButton = document.createElement("button");
    addButton.type = "button";
    addButton.className = "mobile-home-widget-add";
    addButton.dataset.homeWidgetAdd = "";
    addButton.setAttribute("aria-label", "ホームに追加");
    addButton.textContent = "+";
    actions.prepend(addButton);
  }
}

function ensureWidgetPicker(root) {
  let overlay = root.querySelector("[data-home-widget-picker]");
  if (overlay) return overlay;

  overlay = document.createElement("div");
  overlay.className = "mobile-home-widget-picker";
  overlay.dataset.homeWidgetPicker = "";
  overlay.hidden = true;
  overlay.innerHTML = `
    <button type="button" class="mobile-home-widget-picker__backdrop" data-home-widget-picker-close aria-label="ホームへの追加を閉じる"></button>
    <section class="mobile-home-widget-picker__sheet" role="dialog" aria-modal="true" aria-labelledby="home-widget-picker-title">
      <header class="mobile-home-widget-picker__header">
        <h2 id="home-widget-picker-title">ホームに追加</h2>
        <button type="button" data-home-widget-picker-close>閉じる</button>
      </header>
      <div class="mobile-home-widget-picker__list" data-home-widget-picker-list></div>
    </section>`;
  root.append(overlay);
  return overlay;
}

function appPickerIconMarkup(root, id) {
  const icon = root.querySelector(`[data-home-app-catalog] [data-home-item-id="${id}"] .mobile-home-app__icon`);
  if (!icon) return "";
  const toneClass = [...icon.classList].find((name) => name.startsWith("mobile-home-tone--")) || "mobile-home-tone--gray";
  return `<div class="mobile-home-widget-picker__app-icon ${toneClass}" aria-hidden="true">${icon.innerHTML}</div>`;
}

function refreshWidgetPicker(root) {
  const overlay = ensureWidgetPicker(root);
  const list = overlay.querySelector("[data-home-widget-picker-list]");
  if (!list) return;
  const visibleWidgets = new Set([...root.querySelectorAll("[data-home-widget-id]:not([hidden])")].map((item) => item.dataset.homeWidgetId));
  const availableWidgets = WIDGET_CATALOG.filter((item) => !visibleWidgets.has(item.id));
  const installedApps = new Set([...root.querySelectorAll(".mobile-home-page [data-home-item-id], .mobile-home-dock [data-home-item-id]")].map((item) => item.dataset.homeItemId));
  const availableApps = HOME_APP_CATALOG.filter((item) => !installedApps.has(item.id));
  const groups = [];
  if (availableApps.length) {
    groups.push(`<p class="mobile-home-widget-picker__group-title">アプリアイコン</p>${availableApps.map((item) => `<div class="mobile-home-widget-picker__option mobile-home-widget-picker__option--app">${appPickerIconMarkup(root, item.id)}<div class="mobile-home-widget-picker__copy"><strong>${item.label}</strong><span>${item.description}</span></div><button type="button" class="mobile-home-widget-picker__add" data-home-app-add-id="${item.id}" aria-label="${item.label}をホームに追加">＋</button></div>`).join("")}`);
  }
  if (availableWidgets.length) {
    groups.push(`<p class="mobile-home-widget-picker__group-title">ウィジェット</p>${availableWidgets.map((item) => `<div class="mobile-home-widget-picker__option mobile-home-widget-picker__option--widget"><strong>${item.label}</strong><span>${item.description}</span><button type="button" class="mobile-home-widget-picker__add" data-home-widget-add-id="${item.id}" aria-label="${item.label}をホームに追加">＋</button></div>`).join("")}`);
  }
  list.innerHTML = groups.join("") || '<p class="mobile-home-widget-picker__empty">追加できる項目はありません。</p>';
}

function swapItems(source, target) {
  const placeholder = document.createElement("span");
  placeholder.hidden = true;
  source.replaceWith(placeholder);
  target.replaceWith(source);
  placeholder.replaceWith(target);
}

function placeRelativeToTarget(source, target, clientX, clientY) {
  if (!source || !target || source === target) return;
  const rect = target.getBoundingClientRect();
  const middleX = rect.left + rect.width / 2;
  const middleY = rect.top + rect.height / 2;
  const nearMiddleRow = Math.abs(clientY - middleY) <= Math.max(18, rect.height * 0.24);
  const after = clientY > middleY || (nearMiddleRow && clientX > middleX);
  if (after) target.after(source);
  else target.before(source);
}

function createDragGhost(item, kind) {
  const ghost = item.cloneNode(true);
  ghost.querySelectorAll("button").forEach((button) => button.remove());
  ghost.querySelectorAll("a").forEach((anchor) => anchor.removeAttribute("href"));
  ghost.removeAttribute("href");
  ghost.removeAttribute("data-home-item-id");
  ghost.removeAttribute("data-home-widget-id");
  ghost.classList.add(kind === "widget" ? "mobile-home-widget-drag-ghost" : "mobile-home-drag-ghost");
  ghost.setAttribute("aria-hidden", "true");
  document.body.append(ghost);
  return ghost;
}

function moveGhost(ghost, clientX, clientY) {
  ghost.style.left = `${clientX}px`;
  ghost.style.top = `${clientY}px`;
}

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
