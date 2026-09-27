const MOBILE_HOME_QUERY = "(max-width: 54.99rem)";
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

function mobileLayoutMatches() {
  return globalThis.matchMedia?.(MOBILE_HOME_QUERY)?.matches ?? true;
}

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
  if (moved) refreshExistingDragTarget(now);
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
  if (dispatchingSyntheticEvent || event.pointerId !== pointerId || !root?.isConnected) return;
  lastClientX = event.clientX;
  lastClientY = event.clientY;
  if (!root.classList.contains("is-home-drag-active")) {
    clearDragAutoScroll();
    return;
  }
  setDragAutoScrollSpeed(dragScrollSpeedForPoint(event.clientX, event.clientY));
}

function handlePointerEnd(event) {
  if (dispatchingSyntheticEvent || event.pointerId !== pointerId) return;
  resetGesture();
}

document.addEventListener("pointerdown", handlePointerDown, true);
document.addEventListener("pointermove", handlePointerMoveCapture, { capture: true, passive: false });
document.addEventListener("pointermove", handlePointerMoveBubble, { passive: true });
document.addEventListener("pointerup", handlePointerEnd, true);
document.addEventListener("pointercancel", handlePointerEnd, true);
