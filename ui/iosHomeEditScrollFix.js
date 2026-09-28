const MOBILE_HOME_QUERY = "(max-width: 54.99rem)";
const IOS_NATIVE_SCROLL_CLASS = "is-runload-ios-home-native-scroll";

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
    handle.textContent = "⋮⋮";
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

function handlePointerDown(event) {
  if (!nativeScrollItemFromEvent(event)) return;

  // On iPhone/iPad, an edit-mode swipe that starts on an icon/widget should use
  // Safari's native vertical scrolling just like a swipe that starts on blank space.
  // Stop app-level pointer handlers from arming or emulating a drag, but leave the
  // browser default action untouched so momentum scrolling stays native and stable.
  event.stopImmediatePropagation();
}

if (isIOSLike()) {
  document.documentElement.classList.add(IOS_NATIVE_SCROLL_CLASS);
  document.addEventListener("pointerdown", handlePointerDown, true);

  const appRoot = document.getElementById("app");
  if (appRoot && typeof MutationObserver === "function") {
    new MutationObserver(() => decorateDragHandles(appRoot)).observe(appRoot, {
      childList: true,
      subtree: true,
    });
    decorateDragHandles(appRoot);
  }
}
