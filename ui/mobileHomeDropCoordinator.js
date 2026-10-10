import {
  applyHomeIconPlacement as applyIconPlacement,
  clearHomeGridPlacement as clearGridPlacement,
  homeGridPlacementOf as placementOf,
  homeGridTokenForElement as gridTokenForElement,
  matchesMobileHomeLayout as mobileLayoutMatches,
  writeMobileHomeBatch,
} from "./mobileHomeGridUtilities.js";

const POSITION_STORAGE_KEY = "running-record-mobile-home-positions-v1";
const LAYOUT_STORAGE_KEY = "running-record-mobile-home-layout-v1";

let trackedPointerId = null;
let trackedRoot = null;
let trackedSource = null;
let trackedSourcePage = null;
let trackedSourcePlacement = null;
let dockNormalizeQueued = false;
let releasingCoreDrag = false;

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

function activePageIndex(root, pageCount) {
  const currentDot = root.querySelector('.mobile-home-page-dot[aria-current="page"]');
  const explicit = Number(currentDot?.dataset?.homePageTarget);
  if (Number.isInteger(explicit) && explicit >= 0) return Math.min(Math.max(0, pageCount - 1), explicit);
  try {
    const stored = JSON.parse(globalThis.localStorage?.getItem(LAYOUT_STORAGE_KEY) || "null");
    const index = Number(stored?.activePage);
    if (Number.isInteger(index) && index >= 0) return Math.min(Math.max(0, pageCount - 1), index);
  } catch {
    // Fall back to the first page when stored state is unavailable.
  }
  return 0;
}

function persistHomePositions(root) {
  const pageElements = [...root.querySelectorAll(".mobile-home-page")];
  const positionPages = pageElements.map((page) => [
    ...page.querySelectorAll("[data-home-item-id], [data-home-widget-id]"),
  ].flatMap((element) => {
    const token = gridTokenForElement(element);
    if (!token) return [];
    return [{ token, ...placementOf(element) }];
  }));
  const layoutPages = pageElements.map((page) => [
    ...page.querySelectorAll("[data-home-item-id], [data-home-widget-id]"),
  ].map(gridTokenForElement).filter(Boolean));
  const dock = [...root.querySelectorAll(".mobile-home-dock [data-home-item-id]")]
    .map((item) => item.dataset.homeItemId)
    .filter(Boolean);
  writeMobileHomeBatch([
    [POSITION_STORAGE_KEY, { version: 1, pages: positionPages }],
    [LAYOUT_STORAGE_KEY, {
      version: 3,
      pages: layoutPages.length ? layoutPages : [[]],
      dock,
      activePage: activePageIndex(root, pageElements.length),
    }],
  ]);
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
  // the core free-slot path and post-drop helper cannot also run for the same swap.
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
