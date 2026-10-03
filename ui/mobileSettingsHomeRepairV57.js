const MOBILE_QUERY = "(max-width: 54.99rem)";
const LAYOUT_KEY = "running-record-mobile-home-layout-v1";
const POSITION_KEY = "running-record-mobile-home-positions-v1";
const WIDGET_KEY = "running-record-mobile-home-widgets-v1";
const MIGRATION_KEY = "running-record-mobile-home-feature-layout-v57";

const STANDARD_DOCK = Object.freeze(["record", "measure", "history", "course"]);
const STANDARD_WIDGETS = Object.freeze(["today", "plan", "changes", "checkpoint"]);
const OLD_DEFAULT_APP_SETS = Object.freeze([
  Object.freeze(["simulation", "plan", "reading", "settings"]),
  Object.freeze(["simulation", "plan", "reading", "share", "settings"]),
]);
const PAGE_ONE_APPS = Object.freeze(["simulation", "plan", "reading", "settings"]);
const PAGE_TWO_APPS = Object.freeze([
  "share",
  "location-note",
  "quick-note",
  "gear-note",
  "departure-check",
  "fuel-note",
  "photo-note",
  "pace-tool",
]);

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
  try {
    globalThis.localStorage?.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

function sorted(values) {
  return [...new Set((values || []).map(String))].sort();
}

function sameSet(left, right) {
  const a = sorted(left);
  const b = sorted(right);
  return a.length === b.length && a.every((value, index) => value === b[index]);
}

function sameOrder(left, right) {
  const a = Array.isArray(left) ? left.map(String) : [];
  const b = Array.isArray(right) ? right.map(String) : [];
  return a.length === b.length && a.every((value, index) => value === b[index]);
}

function appIdsFromLayout(layout) {
  if (!layout || !Array.isArray(layout.pages)) return [];
  return layout.pages.flatMap((page) => Array.isArray(page) ? page : []).flatMap((token) => {
    const text = String(token || "");
    if (text.startsWith("app:")) return [text.slice(4)];
    if (OLD_DEFAULT_APP_SETS.some((set) => set.includes(text))) return [text];
    return [];
  });
}

function widgetIdsFromLayout(layout) {
  if (!layout || !Array.isArray(layout.pages)) return [];
  return layout.pages.flatMap((page) => Array.isArray(page) ? page : []).flatMap((token) => {
    const text = String(token || "");
    return text.startsWith("widget:") ? [text.slice(7)] : [];
  });
}

function looksLikeGeneratedDefault(layout) {
  if (!layout || typeof layout !== "object") return true;
  const dock = Array.isArray(layout.dock) ? layout.dock : STANDARD_DOCK;
  if (!sameOrder(dock, STANDARD_DOCK)) return false;

  const apps = appIdsFromLayout(layout);
  const widgets = widgetIdsFromLayout(layout);
  const defaultApps = OLD_DEFAULT_APP_SETS.some((set) => sameSet(apps, set));
  const defaultWidgets = widgets.length === 0 || sameSet(widgets, STANDARD_WIDGETS);
  return defaultApps && defaultWidgets;
}

function migrateGeneratedHomeLayout() {
  if (!mobileMatches()) return;
  if (globalThis.localStorage?.getItem(MIGRATION_KEY)) return;

  const current = readJson(LAYOUT_KEY);
  if (!looksLikeGeneratedDefault(current)) {
    try { globalThis.localStorage?.setItem(MIGRATION_KEY, "custom-preserved"); } catch {}
    return;
  }

  const pages = [
    [
      ...STANDARD_WIDGETS.map((id) => `widget:${id}`),
      ...PAGE_ONE_APPS.map((id) => `app:${id}`),
    ],
    PAGE_TWO_APPS.map((id) => `app:${id}`),
  ];

  writeJson(LAYOUT_KEY, {
    version: 5,
    pages,
    dock: [...STANDARD_DOCK],
    activePage: 0,
  });

  const widgetLayout = readJson(WIDGET_KEY);
  const visible = Array.isArray(widgetLayout?.visible)
    ? widgetLayout.visible.filter((id) => STANDARD_WIDGETS.includes(String(id)))
    : ["today", "plan", "changes"];
  writeJson(WIDGET_KEY, {
    version: 3,
    order: [...STANDARD_WIDGETS],
    visible: visible.length ? visible : ["today", "plan", "changes"],
    sizes: {
      today: String(widgetLayout?.sizes?.today || "medium"),
      plan: String(widgetLayout?.sizes?.plan || "small"),
      changes: String(widgetLayout?.sizes?.changes || "small"),
      checkpoint: String(widgetLayout?.sizes?.checkpoint || "small"),
    },
    pageById: Object.fromEntries(STANDARD_WIDGETS.map((id) => [id, 0])),
  });

  writeJson(POSITION_KEY, {
    version: 1,
    pages: [
      [
        { token: "widget:today", row: 1, col: 1 },
        { token: "widget:plan", row: 2, col: 1 },
        { token: "widget:changes", row: 2, col: 3 },
        { token: "widget:checkpoint", row: 1, col: 1 },
        { token: "app:simulation", row: 3, col: 1 },
        { token: "app:plan", row: 3, col: 2 },
        { token: "app:reading", row: 3, col: 3 },
        { token: "app:settings", row: 3, col: 4 },
      ],
      PAGE_TWO_APPS.map((id, index) => ({
        token: `app:${id}`,
        row: Math.floor(index / 4) + 1,
        col: (index % 4) + 1,
      })),
    ],
  });

  try { globalThis.localStorage?.setItem(MIGRATION_KEY, "migrated"); } catch {}
}

function replaceMoreBackLinks() {
  if (!mobileMatches()) return;
  document.querySelectorAll('a[href="#/more"], a[href^="#/more?"]').forEach((link) => {
    link.setAttribute("href", "#/home");
    if (link.classList.contains("mobile-topbar__back")) link.textContent = "‹ ホーム";
    if (link.classList.contains("secondary-derived-back")) link.textContent = "← ホームへ戻る";
  });
}

function ensureSettingsAboutLink() {
  if (!mobileMatches()) return;
  const settings = document.querySelector(".screen--settings");
  const links = settings?.querySelector(".settings-guide-links");
  if (!links || links.querySelector("[data-settings-about-link]")) return;

  const anchor = document.createElement("a");
  anchor.className = "settings-guide-link";
  anchor.dataset.settingsAboutLink = "";
  anchor.href = "#/about?returnTo=%23%2Fsettings";
  anchor.innerHTML = '<span><small>ABOUT / CREDITS</small><strong>このアプリについて</strong></span><span aria-hidden="true">›</span>';
  links.prepend(anchor);
}

function repairAboutReturn() {
  if (!mobileMatches() || !document.querySelector(".screen--about")) return;
  document.querySelectorAll(".mobile-topbar__back, .screen--about .secondary-derived-back").forEach((link) => {
    link.setAttribute("href", "#/settings");
    link.textContent = link.classList.contains("mobile-topbar__back") ? "‹ 設定" : "← 設定へ戻る";
  });
}

function removeMobileMoreNavigation() {
  if (!mobileMatches()) return;
  document.querySelectorAll('.primary-navigation [data-navigation-screen="more"]').forEach((item) => item.remove());
}

function repairRenderedMobileNavigation() {
  if (!mobileMatches()) return;
  replaceMoreBackLinks();
  ensureSettingsAboutLink();
  repairAboutReturn();
  removeMobileMoreNavigation();
}

function redirectMoreHash() {
  if (!mobileMatches()) return false;
  if (!String(globalThis.location?.hash || "").startsWith("#/more")) return false;
  globalThis.history?.replaceState?.(globalThis.history.state, "", "#/home");
  return true;
}

migrateGeneratedHomeLayout();
redirectMoreHash();

if (typeof document !== "undefined") {
  document.addEventListener("click", (event) => {
    if (!mobileMatches()) return;
    const link = event.target?.closest?.('a[href="#/more"], a[href^="#/more?"]');
    if (!link) return;
    event.preventDefault();
    globalThis.location.hash = "#/home";
  }, true);

  globalThis.addEventListener?.("hashchange", () => {
    redirectMoreHash();
    queueMicrotask(repairRenderedMobileNavigation);
  });

  const appRoot = document.getElementById("app");
  if (appRoot && typeof MutationObserver === "function") {
    new MutationObserver(() => repairRenderedMobileNavigation()).observe(appRoot, { childList: true, subtree: true });
  }
  repairRenderedMobileNavigation();
}
