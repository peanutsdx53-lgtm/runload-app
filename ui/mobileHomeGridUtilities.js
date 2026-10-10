const MOBILE_HOME_QUERY = "(max-width: 54.99rem)";

export function matchesMobileHomeLayout() {
  return typeof globalThis.matchMedia === "function"
    ? globalThis.matchMedia(MOBILE_HOME_QUERY).matches
    : Number(globalThis.innerWidth || 0) <= 879;
}

export function readMobileHomeJson(key) {
  try { return JSON.parse(globalThis.localStorage?.getItem(key) || "null"); }
  catch { return null; }
}

// Display fallbacks are allowed, but *writes* must never replace damaged
// persistent preferences with a freshly generated default. The home UI has
// several independent drag/page helpers, so the same contract applies to all.
const HOME_KEY_SHAPES = Object.freeze({
  "running-record-mobile-home-layout-v1": (entry) => Array.isArray(entry.pages)
    && entry.pages.every(Array.isArray) && Array.isArray(entry.dock),
  "running-record-mobile-home-positions-v1": (entry) => Array.isArray(entry.pages)
    && entry.pages.every(Array.isArray),
  "running-record-mobile-home-widgets-v1": (entry) => ["order", "visible", "sizes", "pageById"].some((key) => key in entry)
    && (entry.order === undefined || Array.isArray(entry.order))
    && (entry.visible === undefined || Array.isArray(entry.visible))
    && (entry.sizes === undefined || (entry.sizes && typeof entry.sizes === "object" && !Array.isArray(entry.sizes)))
    && (entry.pageById === undefined || (entry.pageById && typeof entry.pageById === "object" && !Array.isArray(entry.pageById))),
});

/**
 * Synchronous best-effort transaction for mobile-home *preferences only*.
 * Read/validate every current key before writing any key, reject inaccessible
 * or invalid originals, and roll back earlier writes if a later one fails.
 * WebStorage cannot provide true cross-tab atomicity; only revert values that
 * still match our own write, to avoid replacing a concurrent editor's data.
 */
export function writeMobileHomeBatch(entries = []) {
  if (!Array.isArray(entries) || !entries.length) return false;
  let storage;
  const steps = [];
  const seen = new Set();
  try {
    storage = globalThis.localStorage;
    if (!storage || typeof storage.getItem !== "function" || typeof storage.setItem !== "function") return false;
    for (const item of entries) {
      if (!Array.isArray(item) || item.length !== 2) return false;
      const [key, value] = item;
      const accepts = HOME_KEY_SHAPES[key];
      if (!accepts || seen.has(key)) return false;
      seen.add(key);
      if (!value || typeof value !== "object" || Array.isArray(value) || !accepts(value)) return false;
      const previous = storage.getItem(key);
      if (previous !== null) {
        const parsed = JSON.parse(previous);
        if (!parsed || typeof parsed !== "object" || Array.isArray(parsed) || !accepts(parsed)) return false;
      }
      const next = JSON.stringify(value);
      if (typeof next !== "string") return false;
      steps.push({ key, previous, next });
    }
  } catch { return false; }
  const applied = [];
  try {
    for (const step of steps) {
      if (storage.getItem(step.key) !== step.previous) throw Error("HOME_PREFERENCE_CONCURRENT_WRITE");
      storage.setItem(step.key, step.next);
      applied.push(step);
    }
    return true;
  } catch {
    for (const step of applied.reverse()) {
      try {
        if (storage.getItem(step.key) !== step.next) continue;
        if (step.previous === null) storage.removeItem(step.key);
        else storage.setItem(step.key, step.previous);
      } catch { /* Keep the original user data where restoration remains possible. */ }
    }
    return false;
  }
}

export function writeMobileHomeJson(key, value) {
  return writeMobileHomeBatch([[key, value]]);
}

export function clearHomeGridPlacement(element) {
  if (!element) return;
  element.style.removeProperty("grid-row");
  element.style.removeProperty("grid-column");
  delete element.dataset.homeRow;
  delete element.dataset.homeCol;
}

export function homeGridPlacementOf(element) {
  return {
    row: Number(element?.dataset?.homeRow) || 1,
    col: Number(element?.dataset?.homeCol) || 1,
  };
}

export function applyHomeIconPlacement(element, placement) {
  if (!element || !placement) return;
  element.dataset.homeRow = String(placement.row);
  element.dataset.homeCol = String(placement.col);
  element.style.gridRow = `${placement.row} / span 1`;
  element.style.gridColumn = `${placement.col} / span 1`;
}

export function homeGridTokenForElement(element) {
  const appId = element?.dataset?.homeItemId || "";
  if (appId) return `app:${appId}`;
  const widgetId = element?.dataset?.homeWidgetId || "";
  return widgetId ? `widget:${widgetId}` : "";
}
