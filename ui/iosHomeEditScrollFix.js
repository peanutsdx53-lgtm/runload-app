const MOBILE_HOME_QUERY = "(max-width: 54.99rem)";
const IOS_NATIVE_SCROLL_CLASS = "is-runload-ios-home-native-scroll";
const PAGE_SWIPE_SLOP_PX = 8;
const PAGE_SWIPE_AXIS_RATIO = 1.05;

let pagePointerId = null;
let pageViewport = null;
let pageRoot = null;
let pageStartX = 0;
let pageStartY = 0;
let pageStartLeft = 0;
let pageStartTime = 0;
let pageHorizontal = false;
let pageVertical = false;

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

function decorateDragHandles(scope = document) {
  if (!isIOSLike()) return;
  scope.querySelectorAll?.(
    ".mobile-home-page [data-home-item-id], .mobile-home-page [data-home-widget-id]"
  ).forEach((item) => {
    if (item.querySelector("[data-home-drag-handle]")) return;
    const handle = document.createElement("span");
    handle.className = "mobile-home-ios-drag-handle";
    handle.dataset.homeDragHandle = "";
    handle.setAttribute("aria-hidden", "true");
    handle.textContent = "移動";
    item.append(handle);
  });
}

function nativeScrollItemFromEvent(event) {
  if (!isIOSLike() || !mobileLayoutMatches()) return null;
  const root = event.target.closest?.(".mobile-home-os.is-home-editing") || null;
  if (!root) return null;
  if (event.target.closest?.("button, [data-home-drag-handle]")) return null;
  return event.target.closest?.(
    ".mobile-home-page [data-home-item-id], .mobile-home-page [data-home-widget-id]"
  ) || null;
}

function resetPageGesture() {
  pagePointerId = null;
  pageViewport = null;
  pageRoot = null;
  pageHorizontal = false;
  pageVertical = false;
}

function beginPageGesture(event, item) {
  const viewport = item?.closest?.(".mobile-home-page-viewport") || null;
  const root = item?.closest?.(".mobile-home-os.is-home-editing") || null;
  if (!viewport || !root) return false;
  pagePointerId = event.pointerId;
  pageViewport = viewport;
  pageRoot = root;
  pageStartX = event.clientX;
  pageStartY = event.clientY;
  pageStartLeft = viewport.scrollLeft;
  pageStartTime = globalThis.performance?.now?.() ?? Date.now();
  pageHorizontal = false;
  pageVertical = false;
  return true;
}

function pageCount(root) {
  return root?.querySelectorAll?.(".mobile-home-page")?.length || 0;
}

function clampPageLeft(viewport, root, left) {
  const width = Math.max(1, viewport?.clientWidth || 0);
  const maxLeft = Math.max(0, (pageCount(root) - 1) * width);
  return Math.max(0, Math.min(maxLeft, left));
}

function handlePointerDown(event) {
  const item = nativeScrollItemFromEvent(event);
  if (!item || !beginPageGesture(event, item)) return;

  // Keep the icon/widget body out of app drag handling. Vertical movement is left
  // untouched for Safari's native document scroll. Horizontal movement is handled
  // below so edit-mode page switching still works from the same surface.
  event.stopImmediatePropagation();
}

function handlePointerMove(event) {
  if (event.pointerId !== pagePointerId || !pageViewport?.isConnected || !pageRoot?.isConnected) return;
  const dx = event.clientX - pageStartX;
  const dy = event.clientY - pageStartY;
  const absX = Math.abs(dx);
  const absY = Math.abs(dy);

  if (!pageHorizontal && !pageVertical) {
    if (absX < PAGE_SWIPE_SLOP_PX && absY < PAGE_SWIPE_SLOP_PX) return;
    if (absY > absX * PAGE_SWIPE_AXIS_RATIO) {
      pageVertical = true;
      return;
    }
    if (absX <= absY * PAGE_SWIPE_AXIS_RATIO || absX < PAGE_SWIPE_SLOP_PX) return;
    pageHorizontal = true;
  }

  if (!pageHorizontal) return;
  event.preventDefault();
  event.stopImmediatePropagation();
  pageViewport.scrollLeft = clampPageLeft(pageViewport, pageRoot, pageStartLeft - dx);
}

function finishPageGesture(event, cancelled = false) {
  if (event.pointerId !== pagePointerId) return;
  const viewport = pageViewport;
  const root = pageRoot;
  const wasHorizontal = pageHorizontal;
  const dx = event.clientX - pageStartX;
  const elapsed = Math.max(1, (globalThis.performance?.now?.() ?? Date.now()) - pageStartTime);
  const velocity = Math.abs(dx) / elapsed;
  resetPageGesture();

  if (!wasHorizontal || !viewport?.isConnected || !root?.isConnected) return;
  event.preventDefault();
  event.stopImmediatePropagation();

  const width = Math.max(1, viewport.clientWidth);
  const startPage = Math.round(pageStartLeft / width);
  const crossed = Math.abs(dx) >= Math.min(56, width * 0.12) || velocity >= 0.28;
  let targetPage = crossed && !cancelled ? startPage + (dx < 0 ? 1 : -1) : Math.round(viewport.scrollLeft / width);
  targetPage = Math.max(0, Math.min(pageCount(root) - 1, targetPage));
  const left = targetPage * width;
  try {
    viewport.scrollTo({ left, behavior: "smooth" });
  } catch {
    viewport.scrollLeft = left;
  }
}

function handlePointerUp(event) {
  finishPageGesture(event, false);
}

function handlePointerCancel(event) {
  if (event.pointerId !== pagePointerId) return;
  if (pageHorizontal) finishPageGesture(event, true);
  else resetPageGesture();
}

if (isIOSLike()) {
  document.documentElement.classList.add(IOS_NATIVE_SCROLL_CLASS);
  document.addEventListener("pointerdown", handlePointerDown, true);
  document.addEventListener("pointermove", handlePointerMove, { capture: true, passive: false });
  document.addEventListener("pointerup", handlePointerUp, true);
  document.addEventListener("pointercancel", handlePointerCancel, true);

  const appRoot = document.getElementById("app");
  if (appRoot && typeof MutationObserver === "function") {
    new MutationObserver(() => decorateDragHandles(appRoot)).observe(appRoot, {
      childList: true,
      subtree: true,
    });
    decorateDragHandles(appRoot);
  }
}
