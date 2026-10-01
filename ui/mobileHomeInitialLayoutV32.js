const MOBILE_QUERY = "(max-width: 54.99rem)";
const LAYOUT_KEY = "running-record-mobile-home-layout-v1";
const POSITION_KEY = "running-record-mobile-home-positions-v1";
const WIDGET_KEY = "running-record-mobile-home-widgets-v1";

const PRIMARY_WIDGET_SLOTS = Object.freeze(["plan", "changes"]);
const DEFAULT_HOME_APPS = Object.freeze(["simulation", "plan", "reading", "settings"]);
const LEGACY_HOME_APPS = Object.freeze(["simulation", "plan", "reading", "share", "settings"]);
const DEFAULT_DOCK = Object.freeze(["record", "measure", "history", "course"]);
const DEFAULT_WIDGET_ORDER = Object.freeze(["today", "plan", "changes", "checkpoint"]);
const DEFAULT_WIDGET_SIZES = Object.freeze({ today: "medium", plan: "small", changes: "small", checkpoint: "small" });
const LEGACY_VISIBLE_WIDGETS = Object.freeze(["today", "checkpoint", "plan"]);
const CURRENT_VISIBLE_WIDGETS = Object.freeze(["today", "plan", "changes"]);

let queued = false;
let reconciling = false;

function mobileMatches() {
  return typeof globalThis.matchMedia === "function"
    ? globalThis.matchMedia(MOBILE_QUERY).matches
    : Number(globalThis.innerWidth || 0) <= 879;
}

function readJson(key) {
  try { return JSON.parse(globalThis.localStorage?.getItem(key) || "null"); }
  catch { return null; }
}

function writeJson(key, value) {
  try { globalThis.localStorage?.setItem(key, JSON.stringify(value)); }
  catch { /* Home layout persistence is optional. */ }
}

function sorted(values) {
  return [...new Set((values || []).map(String))].sort();
}

function sameSet(left, right) {
  const a = sorted(left);
  const b = sorted(right);
  return a.length === b.length && a.every((value, index) => value === b[index]);
}

function layoutAppIds(layout) {
  if (!layout || !Array.isArray(layout.pages)) return [];
  return layout.pages.flatMap((page) => Array.isArray(page) ? page : []).flatMap((token) => {
    const text = String(token || "");
    if (text.startsWith("app:")) return [text.slice(4)];
    return LEGACY_HOME_APPS.includes(text) ? [text] : [];
  });
}

function layoutDockIds(layout) {
  return Array.isArray(layout?.dock) ? layout.dock.map(String) : [...DEFAULT_DOCK];
}

function widgetStateLooksDefault(widgetLayout) {
  if (!widgetLayout || typeof widgetLayout !== "object") return true;
  const visible = Array.isArray(widgetLayout.visible) ? widgetLayout.visible.map(String) : [...LEGACY_VISIBLE_WIDGETS];
  if (!sameSet(visible, LEGACY_VISIBLE_WIDGETS) && !sameSet(visible, CURRENT_VISIBLE_WIDGETS)) return false;
  const sizes = widgetLayout.sizes && typeof widgetLayout.sizes === "object" ? widgetLayout.sizes : {};
  return DEFAULT_WIDGET_ORDER.every((id) => !sizes[id] || String(sizes[id]) === DEFAULT_WIDGET_SIZES[id]);
}

function storedStateLooksLikeGeneratedDefault() {
  const layout = readJson(LAYOUT_KEY);
  const widgets = readJson(WIDGET_KEY);
  if (!layout && !widgets) return true;
  if (!widgetStateLooksDefault(widgets)) return false;
  if (!layout || typeof layout !== "object") return true;
  if (!sameSet(layoutDockIds(layout), DEFAULT_DOCK)) return false;
  const apps = layoutAppIds(layout);
  return sameSet(apps, LEGACY_HOME_APPS) || sameSet(apps, DEFAULT_HOME_APPS);
}

function clearPlacement(element) {
  if (!element) return;
  element.style.removeProperty("grid-row");
  element.style.removeProperty("grid-column");
  delete element.dataset.homeRow;
  delete element.dataset.homeCol;
}

function applyPlacement(element, row, col, columns = 1, rows = 1) {
  if (!element) return;
  element.dataset.homeRow = String(row);
  element.dataset.homeCol = String(col);
  element.style.gridRow = `${row} / span ${rows}`;
  element.style.gridColumn = `${col} / span ${columns}`;
}

function ensureWidgetControls(shell, id) {
  let remove = shell.querySelector(":scope > [data-home-widget-remove]");
  if (!remove) {
    remove = document.createElement("button");
    remove.type = "button";
    remove.className = "mobile-home-widget-remove";
    remove.textContent = "−";
    shell.append(remove);
  }
  remove.dataset.homeWidgetRemove = id;
  remove.setAttribute("aria-label", "おすすめカードをホームから外す");

  let resize = shell.querySelector(":scope > [data-home-widget-resize]");
  if (!resize) {
    resize = document.createElement("button");
    resize.type = "button";
    resize.className = "mobile-home-widget-size";
    shell.append(resize);
  }
  resize.dataset.homeWidgetResize = id;
  resize.textContent = "小";
  resize.setAttribute("aria-label", "おすすめカードのサイズを変更（現在: 小）");
}

function normalizeDynamicWidgets(root) {
  const anchors = [...root.querySelectorAll(".mobile-home-widget[data-dynamic-widget]")].slice(0, PRIMARY_WIDGET_SLOTS.length);
  if (anchors.length < PRIMARY_WIDGET_SLOTS.length) return false;

  anchors.forEach((anchor, index) => {
    const id = PRIMARY_WIDGET_SLOTS[index];
    let shell = anchor.closest(".mobile-home-widget-shell");
    if (!shell) {
      shell = document.createElement("div");
      shell.className = "mobile-home-widget-shell";
      anchor.before(shell);
      shell.append(anchor);
    }
    shell.dataset.homeWidgetId = id;
    shell.dataset.homeWidgetSize = "small";
    shell.classList.remove("mobile-home-widget-shell--wide", "mobile-home-widget-shell--size-medium", "mobile-home-widget-shell--size-large");
    shell.classList.add("mobile-home-widget-shell--size-small");
    anchor.setAttribute("draggable", "false");
    ensureWidgetControls(shell, id);
  });

  const designated = new Map(anchors.map((anchor, index) => [PRIMARY_WIDGET_SLOTS[index], anchor.closest(".mobile-home-widget-shell")]));
  PRIMARY_WIDGET_SLOTS.forEach((id) => {
    root.querySelectorAll(`[data-home-widget-id="${id}"]`).forEach((shell) => {
      if (shell !== designated.get(id)) shell.hidden = true;
    });
  });
  return true;
}

function moveAppToCatalog(root, id) {
  const item = root.querySelector(`[data-home-item-id="${id}"]`);
  const catalog = root.querySelector("[data-home-app-catalog]");
  if (!item || !catalog) return;
  catalog.append(item);
  item.dataset.homeZone = "apps";
  item.classList.add("mobile-home-app");
  item.classList.remove("mobile-home-dock__item");
  clearPlacement(item);
}

function removeExtraDefaultPages(root, firstPage) {
  const pages = [...root.querySelectorAll(".mobile-home-page")];
  pages.slice(1).forEach((page) => {
    page.querySelectorAll("[data-home-widget-id][hidden]").forEach((widget) => firstPage.querySelector(".mobile-home-grid")?.append(widget));
    page.remove();
  });
  firstPage.dataset.homePageIndex = "0";
  firstPage.setAttribute("aria-label", "ホーム 1ページ目");
}

function resetPageIndicator(root) {
  const indicator = root.querySelector("[data-home-page-indicator]");
  if (!indicator) return;
  indicator.hidden = false;
  indicator.replaceChildren();
  const dot = document.createElement("button");
  dot.type = "button";
  dot.className = "mobile-home-page-dot";
  dot.dataset.homePageTarget = "0";
  dot.setAttribute("aria-label", "1ページ目へ移動");
  dot.setAttribute("aria-current", "page");
  indicator.append(dot);
}

function persistCanonicalDefault(root) {
  writeJson(LAYOUT_KEY, {
    version: 4,
    pages: [[
      "widget:today",
      "widget:plan",
      "widget:changes",
      "widget:checkpoint",
      ...DEFAULT_HOME_APPS.map((id) => `app:${id}`),
    ]],
    dock: [...DEFAULT_DOCK],
    activePage: 0,
  });
  writeJson(WIDGET_KEY, {
    version: 3,
    order: [...DEFAULT_WIDGET_ORDER],
    visible: [...CURRENT_VISIBLE_WIDGETS],
    sizes: { ...DEFAULT_WIDGET_SIZES },
    pageById: Object.fromEntries(DEFAULT_WIDGET_ORDER.map((id) => [id, 0])),
  });
  writeJson(POSITION_KEY, {
    version: 1,
    pages: [[
      { token: "widget:today", row: 1, col: 1 },
      { token: "widget:plan", row: 2, col: 1 },
      { token: "widget:changes", row: 2, col: 3 },
      { token: "widget:checkpoint", row: 1, col: 1 },
      { token: "app:simulation", row: 3, col: 1 },
      { token: "app:plan", row: 3, col: 2 },
      { token: "app:reading", row: 3, col: 3 },
      { token: "app:settings", row: 3, col: 4 },
    ]],
  });
}

function applyCanonicalDefault(root) {
  const firstPage = root.querySelector('.mobile-home-page[data-home-page-index="0"], .mobile-home-page');
  const grid = firstPage?.querySelector(".mobile-home-grid");
  if (!firstPage || !grid) return false;

  root.querySelector('.mobile-home-page-dot[data-home-page-target="0"]')?.click();

  const today = root.querySelector('[data-home-widget-id="today"]');
  const primary = root.querySelector('[data-home-widget-id="plan"]');
  const secondary = root.querySelector('[data-home-widget-id="changes"]');
  const checkpoint = root.querySelector('[data-home-widget-id="checkpoint"]');
  if (!today || !primary || !secondary) return false;

  [today, primary, secondary, checkpoint].filter(Boolean).forEach((widget) => grid.append(widget));
  today.hidden = false;
  primary.hidden = false;
  secondary.hidden = false;
  if (checkpoint) checkpoint.hidden = true;

  today.dataset.homeWidgetSize = "medium";
  today.classList.remove("mobile-home-widget-shell--size-small", "mobile-home-widget-shell--size-large");
  today.classList.add("mobile-home-widget-shell--size-medium");
  primary.dataset.homeWidgetSize = "small";
  secondary.dataset.homeWidgetSize = "small";
  applyPlacement(today, 1, 1, 4, 1);
  applyPlacement(primary, 2, 1, 2, 1);
  applyPlacement(secondary, 2, 3, 2, 1);
  if (checkpoint) applyPlacement(checkpoint, 1, 1, 2, 1);

  const appPlacements = Object.freeze({ simulation: 1, plan: 2, reading: 3, settings: 4 });
  DEFAULT_HOME_APPS.forEach((id) => {
    const item = root.querySelector(`[data-home-item-id="${id}"]`);
    if (!item) return;
    grid.append(item);
    item.dataset.homeZone = "apps";
    item.classList.add("mobile-home-app");
    item.classList.remove("mobile-home-dock__item");
    applyPlacement(item, 3, appPlacements[id], 1, 1);
  });
  moveAppToCatalog(root, "share");

  grid.style.setProperty("--home-grid-rows", "3");
  removeExtraDefaultPages(root, firstPage);
  resetPageIndicator(root);
  const viewport = root.querySelector("[data-home-page-viewport]");
  if (viewport) viewport.scrollLeft = 0;
  persistCanonicalDefault(root);
  root.dataset.homeInitialLayoutVersion = "32";
  return true;
}

function repairRawDynamicCards(root) {
  const grid = root.querySelector('.mobile-home-page[data-home-page-index="0"] .mobile-home-grid, .mobile-home-page .mobile-home-grid');
  if (!grid) return;
  [...root.querySelectorAll(".mobile-home-widget[data-dynamic-widget]")].forEach((anchor) => {
    const shell = anchor.closest("[data-home-widget-id]");
    if (shell) return;
    anchor.remove();
  });
}

function reconcile() {
  queued = false;
  if (reconciling || !mobileMatches()) return;
  const root = document.querySelector(".mobile-home-os");
  if (!root || root.dataset.homeInitialLayoutVersion === "32") return;
  if (!root.querySelector(".mobile-home-grid") || !root.querySelector("[data-home-app-catalog]")) return;

  reconciling = true;
  try {
    const normalized = normalizeDynamicWidgets(root);
    if (!normalized) return;
    repairRawDynamicCards(root);
    if (storedStateLooksLikeGeneratedDefault()) {
      applyCanonicalDefault(root);
    } else {
      root.querySelectorAll(".mobile-home-grid").forEach((grid) => grid.style.setProperty("--home-grid-rows", "3"));
      root.dataset.homeInitialLayoutVersion = "32";
    }
  } finally {
    reconciling = false;
  }
}

function queueReconcile() {
  if (queued) return;
  queued = true;
  requestAnimationFrame(reconcile);
}

const appRoot = document.getElementById("app");
if (appRoot && typeof MutationObserver === "function") {
  new MutationObserver(queueReconcile).observe(appRoot, { childList: true, subtree: true });
}
queueReconcile();
