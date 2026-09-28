const MOBILE_HOME_QUERY = "(max-width: 54.99rem)";
const SCROLL_INTENT_PX = 8;
const SCROLL_INTENT_RATIO = 1.15;

let pointerId = null;
let root = null;
let target = null;
let startY = 0;
let startX = 0;
let startScrollTop = 0;
let scrolling = false;
let dispatchingCancel = false;

function mobileLayoutMatches() {
  return typeof globalThis.matchMedia === "function"
    ? globalThis.matchMedia(MOBILE_HOME_QUERY).matches
    : Number(globalThis.innerWidth || 0) <= 879;
}

function isIOSLike() {
  const ua = String(globalThis.navigator?.userAgent || "");
  const platform = String(globalThis.navigator?.platform || "");
  const touchPoints = Number(globalThis.navigator?.maxTouchPoints || 0);
  return /iPhone|iPad|iPod/i.test(ua) || (platform === "MacIntel" && touchPoints > 1);
}

function currentScrollTop() {
  return Number(globalThis.scrollY || document.scrollingElement?.scrollTop || document.documentElement?.scrollTop || 0);
}

function maxScrollTop() {
  const scroller = document.scrollingElement || document.documentElement;
  return Math.max(0, Number(scroller?.scrollHeight || 0) - Number(globalThis.innerHeight || scroller?.clientHeight || 0));
}

function scrollToAbsolute(top) {
  const next = Math.max(0, Math.min(maxScrollTop(), Number(top) || 0));
  globalThis.scrollTo(0, next);
}

function reset() {
  pointerId = null;
  root = null;
  target = null;
  scrolling = false;
}

function cancelLegacyPress(event) {
  if (!target || pointerId == null || typeof PointerEvent !== "function") return;
  dispatchingCancel = true;
  try {
    target.dispatchEvent(new PointerEvent("pointercancel", {
      bubbles: true,
      cancelable: true,
      pointerId,
      pointerType: event.pointerType || "touch",
      clientX: event.clientX,
      clientY: event.clientY,
      isPrimary: true,
    }));
  } finally {
    dispatchingCancel = false;
  }
}

function handlePointerDown(event) {
  if (dispatchingCancel || !isIOSLike() || !mobileLayoutMatches()) return;
  if (event.pointerType === "mouse") return;
  const homeRoot = event.target.closest?.(".mobile-home-os.is-home-editing") || null;
  const gestureTarget = event.target.closest?.("[data-home-item-id], [data-home-widget-id]") || null;
  if (!homeRoot || !gestureTarget || event.target.closest?.("button")) return;

  pointerId = event.pointerId;
  root = homeRoot;
  target = gestureTarget;
  startX = event.clientX;
  startY = event.clientY;
  startScrollTop = currentScrollTop();
  scrolling = false;
}

function handlePointerMove(event) {
  if (dispatchingCancel || event.pointerId !== pointerId || !root?.isConnected) return;
  if (root.classList.contains("is-home-drag-active") || target?.classList.contains("is-home-drag-armed")) return;

  const dx = event.clientX - startX;
  const dy = event.clientY - startY;
  const absX = Math.abs(dx);
  const absY = Math.abs(dy);
  if (!scrolling) {
    if (absY < SCROLL_INTENT_PX || absY <= absX * SCROLL_INTENT_RATIO) return;
    scrolling = true;
    cancelLegacyPress(event);
  }

  event.preventDefault();
  event.stopImmediatePropagation();
  scrollToAbsolute(startScrollTop + (startY - event.clientY));
}

function handlePointerEnd(event) {
  if (dispatchingCancel || event.pointerId !== pointerId) return;
  if (scrolling) {
    event.preventDefault();
    event.stopImmediatePropagation();
  }
  reset();
}

document.addEventListener("pointerdown", handlePointerDown, true);
document.addEventListener("pointermove", handlePointerMove, { capture: true, passive: false });
document.addEventListener("pointerup", handlePointerEnd, true);
document.addEventListener("pointercancel", handlePointerEnd, true);
