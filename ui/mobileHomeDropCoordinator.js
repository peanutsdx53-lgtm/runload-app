const MOBILE_HOME_QUERY = "(max-width: 54.99rem)";
const POSITION_STORAGE_KEY = "running-record-mobile-home-positions-v1";

let trackedPointerId = null;
let trackedRoot = null;
let trackedSource = null;
let trackedSourcePage = null;
let trackedSourcePlacement = null;
let dockNormalizeQueued = false;
let releasingCoreDrag = false;

function mobileLayoutMatches() {
  if (typeof globalThis.matchMedia === "function") return globalThis.matchMedia(MOBILE_HOME_QUERY).matches;
  return Number(globalThis.innerWidth || 0) <= 879;
}

function placementOf(element) {
  return {
    row: Number(element?.dataset?.homeRow) || 1,
    col: Number(element?.dataset?.homeCol) || 1,
  };
}

function applyIconPlacement(element, placement) {
  if (!element || !placement) return;
  element.dataset.homeRow = String(placement.row);
  element.dataset.homeCol = String(placement.col);
  element.style.gridRow = `${placement.row} / span 1`;
  element.style.gridColumn = `${placement.col} / span 1`;
}

function clearGridPlacement(element) {
  if (!element) return;
  element.style.removeProperty("grid-row");
  element.style.removeProperty("grid-column");
  delete element.dataset.homeRow;
  delete element.dataset.homeCol;
}

function normalizeDockPlacements(root = document) {
  root.querySelectorAll?.(".mobile-home-dock [data-home-item-id]").forEach(clearGridPlacement);
}

function queueDockNormalization(root = document) {
  if (dockNormalizeQueued || !mobileLayoutMatches()) return;
  dockNormalizeQueued = true;
  queueMicrotask(() => {
    dockNormalizeQueued = false;
    normalizeDockPlacements(root);
  });
}

function gridTokenForElement(element) {
  const appId = element?.dataset?.homeItemId || "";
  if (appId) return `app:${appId}`;
  const widgetId = element?.dataset?.homeWidgetId || "";
  return widgetId ? `widget:${widgetId}` : "";
}

function persistHomePositions(root) {
  const pages = [...root.querySelectorAll(".mobile-home-page")].map((page) => [
    ...page.querySelectorAll("[data-home-item-id], [data-home-widget-id]"),
  ].flatMap((element) => {
    const token = gridTokenForElement(element);
    if (!token) return [];
    return [{ token, ...placementOf(element) }];
  }));
  try {
    globalThis.localStorage?.setItem(POSITION_STORAGE_KEY, JSON.stringify({ version: 1, pages }));
  } catch {
    // Position persistence is optional; the current layout remains usable.
  }
}

function swapDomPositions(source, target) {
  if (!source || !target || source === target || source.parentNode !== target.parentNode) return;
  const marker = document.createComment("mobile-home-owned-swap");
  source.replaceWith(marker);
  target.replaceWith(source);
  marker.replaceWith(target);
}

function resetTracking() {
  trackedPointerId = null;
  trackedRoot = null;
  trackedSource = null;
  trackedSourcePage = null;
  trackedSourcePlacement = null;
}

function rememberSource(event) {
  if (!mobileLayoutMatches()) return;
  if (event.pointerType === "mouse" && event.button !== 0) return;
  const source = event.target.closest?.("[data-home-item-id]") || null;
  const root = event.target.closest?.(".mobile-home-os") || null;
  if (!source || !root || source.closest(".mobile-home-dock") || event.target.closest?.("button")) return;
  trackedPointerId = event.pointerId;
  trackedRoot = root;
  trackedSource = source;
  trackedSourcePage = source.closest(".mobile-home-page");
  trackedSourcePlacement = placementOf(source);
}

function adoptActiveSource(event) {
  if (!mobileLayoutMatches()) return;
  const root = event.target.closest?.(".mobile-home-os.is-home-drag-active") || document.querySelector(".mobile-home-os.is-home-drag-active");
  const source = root?.querySelector(".is-home-dragging[data-home-item-id]") || null;
  if (!root || !source || source.closest(".mobile-home-dock")) return;
  trackedPointerId = event.pointerId;
  trackedRoot = root;
  trackedSource = source;
  trackedSourcePage = source.closest(".mobile-home-page");
  trackedSourcePlacement = placementOf(source);
}

function swapCandidate(event) {
  if (!mobileLayoutMatches()) return null;
  if (trackedPointerId !== event.pointerId || !trackedRoot?.isConnected) adoptActiveSource(event);
  if (trackedPointerId !== event.pointerId || !trackedRoot?.isConnected) return null;
  const root = trackedRoot;
  if (!root.classList.contains("is-home-editing") || !root.classList.contains("is-home-drag-active")) return null;
  const source = root.querySelector(".is-home-dragging[data-home-item-id]") || trackedSource;
  if (!source || source.closest(".mobile-home-dock")) return null;
  const sourcePage = source.closest(".mobile-home-page");
  if (!sourcePage) return null;

  const pointTarget = document.elementFromPoint(event.clientX, event.clientY);
  const target = pointTarget?.closest?.("[data-home-item-id]")
    || root.querySelector(".is-home-drop-target[data-home-item-id]");
  if (!target || target === source || target.closest(".mobile-home-dock")) return null;
  const targetPage = target.closest(".mobile-home-page");
  if (!targetPage || targetPage !== sourcePage) return null;

  return {
    root,
    source,
    target,
    sourceId: source.dataset.homeItemId,
    sourcePage,
    sourcePlacement: trackedSource === source && trackedSourcePage === sourcePage && trackedSourcePlacement
      ? { ...trackedSourcePlacement }
      : placementOf(source),
    targetPlacement: placementOf(target),
  };
}

function releaseCoreDrag(candidate, event) {
  const { source } = candidate;
  if (typeof PointerEvent !== "function") return false;
  releasingCoreDrag = true;
  try {
    source.dispatchEvent(new PointerEvent("pointercancel", {
      bubbles: true,
      cancelable: true,
      pointerId: event.pointerId,
      pointerType: event.pointerType || "touch",
      clientX: event.clientX,
      clientY: event.clientY,
      isPrimary: true,
    }));
    return true;
  } finally {
    releasingCoreDrag = false;
  }
}

function finalizeSwap(candidate) {
  const { root, source, target, sourceId, sourcePage, sourcePlacement, targetPlacement } = candidate;
  if (!source.isConnected || !target.isConnected) return;
  source.dataset.homeItemId = sourceId;
  const stillSamePage = source.closest(".mobile-home-page") === sourcePage
    && target.closest(".mobile-home-page") === sourcePage
    && !source.closest(".mobile-home-dock")
    && !target.closest(".mobile-home-dock");
  if (!stillSamePage) return;
  swapDomPositions(source, target);
  applyIconPlacement(source, targetPlacement);
  applyIconPlacement(target, sourcePlacement);
  persistHomePositions(root);
  queueDockNormalization(root);
}

function handlePointerDown(event) {
  if (releasingCoreDrag) return;
  resetTracking();
  rememberSource(event);
}

function handlePointerMove(event) {
  if (releasingCoreDrag || !mobileLayoutMatches()) return;
  if (trackedPointerId == null && document.querySelector(".mobile-home-os.is-home-drag-active")) adoptActiveSource(event);
}

function handlePointerUp(event) {
  if (releasingCoreDrag) return;
  const candidate = swapCandidate(event);
  if (!candidate) {
    queueDockNormalization(trackedRoot || document);
    resetTracking();
    return;
  }

  // Direct home-icon swaps are owned here. The original pointerup is stopped so
  // neither the legacy free-slot path nor the older post-drop helper can also run.
  event.preventDefault();
  event.stopImmediatePropagation();

  // Temporarily remove the app token while a synthetic pointercancel lets the
  // existing drag core perform only its visual/pointer cleanup. With no source
  // token, its free-placement branch cannot move either icon.
  delete candidate.source.dataset.homeItemId;
  const released = releaseCoreDrag(candidate, event);
  if (!released) {
    candidate.source.dataset.homeItemId = candidate.sourceId;
    queueMicrotask(() => finalizeSwap(candidate));
  } else {
    finalizeSwap(candidate);
  }
  resetTracking();
}

function handlePointerCancel() {
  if (releasingCoreDrag) return;
  queueDockNormalization(trackedRoot || document);
  resetTracking();
}

document.addEventListener("pointerdown", handlePointerDown, true);
document.addEventListener("pointermove", handlePointerMove, true);
document.addEventListener("pointerup", handlePointerUp, true);
document.addEventListener("pointercancel", handlePointerCancel, true);

const appRoot = document.getElementById("app");
if (appRoot && typeof MutationObserver === "function") {
  new MutationObserver(() => queueDockNormalization(appRoot)).observe(appRoot, { childList: true, subtree: true });
  queueDockNormalization(appRoot);
}
