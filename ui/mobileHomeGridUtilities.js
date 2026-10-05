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

export function writeMobileHomeJson(key, value) {
  try { globalThis.localStorage?.setItem(key, JSON.stringify(value)); }
  catch { /* Home layout persistence is optional. */ }
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
