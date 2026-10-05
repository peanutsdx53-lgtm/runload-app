import {
  applyHomeIconPlacement as applyIconPlacement,
  clearHomeGridPlacement as clearGridPlacement,
  homeGridPlacementOf as placementOf,
  homeGridTokenForElement as homeGridToken,
  matchesMobileHomeLayout as mobileLayoutMatches,
} from "./mobileHomeGridUtilities.js";

const POSITION_STORAGE_KEY = "running-record-mobile-home-positions-v1";
const SCROLL_INTENT_PX = 8;
const SCROLL_INTENT_RATIO = 1.15;
const DRAG_TOP_EDGE_PX = 88;
const DRAG_BOTTOM_EDGE_PX = 156;
const DRAG_SCROLL_MAX_STEP = 12;
const DRAG_TARGET_REFRESH_MS = 48;

let pointerId = null;
let pointerType = "touch";
let root = null;
let gestureTarget = null;
let dragOrigin = null;
let startX = 0;
let startY = 0;
let lastY = 0;
let lastClientX = 0;
let lastClientY = 0;
let editScrolling = false;
let dragScrollFrame = null;
let dragScrollSpeed = 0;
let lastDragTargetRefresh = 0;
let dispatchingSyntheticEvent = false;

function scrollingElement() {
  return document.scrollingElement || document.documentElement;
}

function scrollDocumentBy(deltaY) {
  const scroller = scrollingElement();
  if (!scroller || !Number.isFinite(deltaY) || Math.abs(deltaY) < 0.01) return false;
  const before = scroller.scrollTop;
  const max = Math.max(0, scroller.scrollHeight - scroller.clientHeight);
  scroller.scrollTop = Math.max(0, Math.min(max, before + deltaY));
  return Math.abs(scroller.scrollTop - before) > 0.01;
}

function clearDragAutoScroll() {
  dragScrollSpeed = 0;
  lastDragTargetRefresh = 0;
  if (dragScrollFrame) cancelAnimationFrame(dragScrollFrame);
  dragScrollFrame = null;
}

function resetGesture() {
  clearDragAutoScroll();
  pointerId = null;
  pointerType = "touch";
  root = null;
  gestureTarget = null;
  dragOrigin = null;
  editScrolling = false;
}

function dispatchSyntheticPointerCancel() {
  if (!gestureTarget || pointerId == null || typeof PointerEvent !== "function") return;
  dispatchingSyntheticEvent = true;
  try {
    gestureTarget.dispatchEvent(new PointerEvent("pointercancel", {
      bubbles: true,
      cancelable: true,
      pointerId,
      pointerType,
      clientX: lastClientX,
      clientY: lastClientY,
      isPrimary: true,
    }));
  } finally {
    dispatchingSyntheticEvent = false;
  }
}

function refreshExistingDragTarget(now) {
  if (!root || pointerId == null || typeof PointerEvent !== "function") return;
  if (now - lastDragTargetRefresh < DRAG_TARGET_REFRESH_MS) return;
  const draggingTarget = root.querySelector(".is-home-dragging, .is-home-widget-dragging");
  if (!draggingTarget) return;
  lastDragTargetRefresh = now;
  dispatchingSyntheticEvent = true;
  try {
    draggingTarget.dispatchEvent(new PointerEvent("pointermove", {
      bubbles: true,
      cancelable: true,
      pointerId,
      pointerType,
      clientX: lastClientX,
      clientY: lastClientY,
      buttons: 1,
      isPrimary: true,
    }));
  } finally {
    dispatchingSyntheticEvent = false;
  }
}

function dragAutoScrollStep(now) {
  dragScrollFrame = null;
  if (!root?.isConnected || !root.classList.contains("is-home-drag-active") || !dragScrollSpeed) {
    dragScrollSpeed = 0;
    return;
  }
  const moved = scrollDocumentBy(dragScrollSpeed);
  if (!moved) {
    dragScrollSpeed = 0;
    return;
  }
  refreshExistingDragTarget(now);
  dragScrollFrame = requestAnimationFrame(dragAutoScrollStep);
}

function setDragAutoScrollSpeed(nextSpeed) {
  dragScrollSpeed = Number.isFinite(nextSpeed) ? nextSpeed : 0;
  if (!dragScrollSpeed) {
    if (dragScrollFrame) cancelAnimationFrame(dragScrollFrame);
    dragScrollFrame = null;
    return;
  }
  if (!dragScrollFrame) dragScrollFrame = requestAnimationFrame(dragAutoScrollStep);
}

function dragScrollSpeedForPoint(clientX, clientY) {
  const height = globalThis.visualViewport?.height || globalThis.innerHeight || document.documentElement.clientHeight || 0;
  if (!(height > 0)) return 0;
  const pointTarget = document.elementFromPoint(clientX, clientY);
  if (pointTarget?.closest?.(".mobile-home-dock, .mobile-home-page-indicator, [data-home-widget-picker]")) return 0;

  if (clientY < DRAG_TOP_EDGE_PX) {
    const ratio = Math.max(0, Math.min(1, (DRAG_TOP_EDGE_PX - clientY) / DRAG_TOP_EDGE_PX));
    return -(2 + Math.round(DRAG_SCROLL_MAX_STEP * ratio * ratio));
  }

  const bottomStart = Math.max(DRAG_TOP_EDGE_PX, height - DRAG_BOTTOM_EDGE_PX);
  if (clientY > bottomStart) {
    const ratio = Math.max(0, Math.min(1, (clientY - bottomStart) / Math.max(1, height - bottomStart)));
    return 2 + Math.round(DRAG_SCROLL_MAX_STEP * ratio * ratio);
  }
  return 0;
}

function samePlacement(left, right) {
  return Boolean(left && right && left.row === right.row && left.col === right.col);
}

function captureDragOrigin(homeRoot, target) {
  if (!homeRoot || !target?.dataset?.homeItemId || target.closest(".mobile-home-dock")) {
    dragOrigin = null;
    return;
  }
  const page = target.closest(".mobile-home-page");
  if (!page) {
    dragOrigin = null;
    return;
  }
  dragOrigin = {
    source: target,
    page,
    placement: placementOf(target),
  };
}

function adoptActiveDrag(event) {
  if (pointerId != null || dispatchingSyntheticEvent || !mobileLayoutMatches()) return;
  const activeRoot = event.target.closest?.(".mobile-home-os.is-home-drag-active") || document.querySelector(".mobile-home-os.is-home-drag-active");
  if (!activeRoot) return;
  const draggingTarget = event.target.closest?.(".is-home-dragging, .is-home-widget-dragging")
    || activeRoot.querySelector(".is-home-dragging, .is-home-widget-dragging");
  if (!draggingTarget) return;

  pointerId = event.pointerId;
  pointerType = event.pointerType || "touch";
  root = activeRoot;
  gestureTarget = draggingTarget;
  captureDragOrigin(activeRoot, draggingTarget);
  lastY = event.clientY;
  lastClientX = event.clientX;
  lastClientY = event.clientY;
}

function normalizeDockPlacements(homeRoot) {
  homeRoot?.querySelectorAll(".mobile-home-dock [data-home-item-id]").forEach(clearGridPlacement);
}

function swapDomPositions(source, target) {
  if (!source || !target || source === target || source.parentNode !== target.parentNode) return;
  const marker = document.createComment("mobile-home-icon-swap");
  source.replaceWith(marker);
  target.replaceWith(source);
  marker.replaceWith(target);
}

function persistHomePositions(homeRoot) {
  if (!homeRoot) return;
  const pages = [...homeRoot.querySelectorAll(".mobile-home-page")].map((page) => [
    ...page.querySelectorAll("[data-home-item-id], [data-home-widget-id]"),
  ].flatMap((element) => {
    const token = homeGridToken(element);
    if (!token) return [];
    return [{ token, ...placementOf(element) }];
  }));
  try {
    globalThis.localStorage?.setItem(POSITION_STORAGE_KEY, JSON.stringify({ version: 1, pages }));
  } catch {
    // Position persistence is optional; the current edited layout remains visible.
  }
}

function iconSwapCandidate(event) {
  if (!mobileLayoutMatches() || !root?.isConnected || !root.classList.contains("is-home-editing")) return null;
  if (!root.classList.contains("is-home-drag-active")) return null;
  const source = root.querySelector(".is-home-dragging[data-home-item-id]");
  if (!source || source.closest(".mobile-home-dock")) return null;

  const pointTarget = document.elementFromPoint(event.clientX, event.clientY);
  const target = pointTarget?.closest?.("[data-home-item-id]")
    || root.querySelector(".is-home-drop-target[data-home-item-id]");
  if (!target || target === source || target.closest(".mobile-home-dock")) return null;

  const sourcePage = source.closest(".mobile-home-page");
  const targetPage = target.closest(".mobile-home-page");
  if (!sourcePage || sourcePage !== targetPage) return null;

  const sourcePlacement = dragOrigin?.source === source && dragOrigin.page === sourcePage
    ? { ...dragOrigin.placement }
    : placementOf(source);
  const targetPlacement = placementOf(target);
  if (samePlacement(sourcePlacement, targetPlacement)) return null;

  return {
    homeRoot: root,
    source,
    target,
    page: sourcePage,
    sourcePlacement,
    targetPlacement,
  };
}

function finalizeDrop(homeRoot, swapCandidate) {
  if (!homeRoot?.isConnected) return;
  normalizeDockPlacements(homeRoot);

  if (swapCandidate) {
    const { source, target, page, sourcePlacement, targetPlacement } = swapCandidate;
    const stillValid = source.isConnected
      && target.isConnected
      && !source.closest(".mobile-home-dock")
      && !target.closest(".mobile-home-dock")
      && source.closest(".mobile-home-page") === page
      && target.closest(".mobile-home-page") === page;
    if (stillValid) {
      swapDomPositions(source, target);
      applyIconPlacement(source, targetPlacement);
      applyIconPlacement(target, sourcePlacement);
    }
  }

  persistHomePositions(homeRoot);
}

function scheduleDropFinalization(event) {
  const homeRoot = root;
  if (!homeRoot?.isConnected) return;
  const swapCandidate = iconSwapCandidate(event);
  Promise.resolve().then(() => finalizeDrop(homeRoot, swapCandidate));
}

function hideFreePlacementPreviewForIconTarget() {
  if (!root?.classList.contains("is-home-drag-active")) return;
  const source = root.querySelector(".is-home-dragging[data-home-item-id]");
  const target = root.querySelector(".is-home-drop-target[data-home-item-id]");
  if (!source || !target || target.closest(".mobile-home-dock")) return;
  root.querySelectorAll(".mobile-home-drop-preview").forEach((preview) => preview.remove());
}

function handlePointerDown(event) {
  if (dispatchingSyntheticEvent || !mobileLayoutMatches()) return;
  if (event.pointerType === "mouse" && event.button !== 0) return;
  const homeRoot = event.target.closest?.(".mobile-home-os.is-home-editing") || null;
  const target = event.target.closest?.("[data-home-item-id], [data-home-widget-id]") || null;
  if (!homeRoot || !target || event.target.closest?.("button")) return;

  resetGesture();
  pointerId = event.pointerId;
  pointerType = event.pointerType || "touch";
  root = homeRoot;
  gestureTarget = target;
  captureDragOrigin(homeRoot, target);
  startX = event.clientX;
  startY = event.clientY;
  lastY = event.clientY;
  lastClientX = event.clientX;
  lastClientY = event.clientY;
}

function handlePointerMoveCapture(event) {
  if (dispatchingSyntheticEvent || event.pointerId !== pointerId || !root?.isConnected) return;
  lastClientX = event.clientX;
  lastClientY = event.clientY;

  if (root.classList.contains("is-home-drag-active") || gestureTarget?.classList.contains("is-home-drag-armed")) {
    lastY = event.clientY;
    return;
  }

  const dx = event.clientX - startX;
  const dy = event.clientY - startY;
  const absX = Math.abs(dx);
  const absY = Math.abs(dy);
  if (!editScrolling) {
    if (absY < SCROLL_INTENT_PX || absY <= absX * SCROLL_INTENT_RATIO) {
      lastY = event.clientY;
      return;
    }
    editScrolling = true;
    dispatchSyntheticPointerCancel();
  }

  event.preventDefault();
  event.stopPropagation();
  scrollDocumentBy(lastY - event.clientY);
  lastY = event.clientY;
}

function handlePointerMoveBubble(event) {
  if (dispatchingSyntheticEvent) return;
  if (pointerId == null) adoptActiveDrag(event);
  if (event.pointerId !== pointerId || !root?.isConnected) return;
  lastClientX = event.clientX;
  lastClientY = event.clientY;
  if (!root.classList.contains("is-home-drag-active")) {
    clearDragAutoScroll();
    return;
  }
  setDragAutoScrollSpeed(dragScrollSpeedForPoint(event.clientX, event.clientY));
  hideFreePlacementPreviewForIconTarget();
}

function handlePointerUp(event) {
  if (dispatchingSyntheticEvent || event.pointerId !== pointerId) return;
  scheduleDropFinalization(event);
  resetGesture();
}

function handlePointerCancel(event) {
  if (dispatchingSyntheticEvent || event.pointerId !== pointerId) return;
  const homeRoot = root;
  resetGesture();
  if (homeRoot?.isConnected) Promise.resolve().then(() => normalizeDockPlacements(homeRoot));
}

document.addEventListener("pointerdown", handlePointerDown, true);
document.addEventListener("pointermove", handlePointerMoveCapture, { capture: true, passive: false });
document.addEventListener("pointermove", handlePointerMoveBubble, { passive: true });
document.addEventListener("pointerup", handlePointerUp, true);
document.addEventListener("pointercancel", handlePointerCancel, true);
